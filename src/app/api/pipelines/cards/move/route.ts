import { after, NextResponse } from "next/server";
import { ZodError } from "zod";
import { triggerAutomationForWorkspace } from "@/lib/n8n/client";
import { canManageOperations } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { movePipelineCardSchema } from "@/lib/validation/pipelines";
import type { ApiResponse } from "@/types/api";

type StageRow = {
  entity_type: "lead" | "job";
  id: string;
  name: string;
  pipeline_group_id: string;
  workspace_id: string;
};

type RecordRow = {
  id: string;
  stage_id: string | null;
  updated_by?: string | null;
  workspace_id: string;
};

type MoveResponse = {
  id: string;
  stage_id: string;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getWorkspaceStatusCode(status: "no-user" | "no-workspace" | "error") {
  if (status === "no-user") {
    return 401;
  }

  if (status === "no-workspace") {
    return 403;
  }

  return 500;
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to move pipeline cards.",
        },
        ok: false,
      },
      401,
    );
  }

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: "NO_ACTIVE_WORKSPACE",
          message:
            activeWorkspace.error ??
            "No active workspace is available for this account.",
        },
        ok: false,
      },
      getWorkspaceStatusCode(activeWorkspace.status),
    );
  }

  if (!canManageOperations(activeWorkspace.context.role)) {
    return jsonResponse(
      {
        error: {
          code: "PIPELINE_MOVE_FORBIDDEN",
          message: "Your workspace role cannot move pipeline cards.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = movePipelineCardSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;
    const { data: targetStage, error: stageError } = await supabase
      .from("pipeline_stages")
      .select("id,name,workspace_id,pipeline_group_id,entity_type")
      .eq("id", payload.target_stage_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle<StageRow>();

    if (stageError) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_STAGE_LOOKUP_FAILED",
            message: "We could not verify the target stage.",
            details: stageError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if (!targetStage || targetStage.entity_type !== payload.entity_type) {
      return jsonResponse(
        {
          error: {
            code: "INVALID_TARGET_STAGE",
            message:
              "The selected stage does not belong to the active workspace pipeline.",
          },
          ok: false,
        },
        400,
      );
    }

    const tableName = payload.entity_type === "lead" ? "leads" : "jobs";
    const { data: record, error: recordError } = await supabase
      .from(tableName)
      .select("id,workspace_id,stage_id")
      .eq("id", payload.record_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle<RecordRow>();

    if (recordError) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_RECORD_LOOKUP_FAILED",
            message: "We could not verify the selected record.",
            details: recordError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if (!record) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_RECORD_NOT_FOUND",
            message: "This record is not available in the active workspace.",
          },
          ok: false,
        },
        404,
      );
    }

    const previousStageName =
      record.stage_id !== null
        ? (
            await supabase
              .from("pipeline_stages")
              .select("name")
              .eq("id", record.stage_id)
              .eq("workspace_id", workspaceId)
              .maybeSingle<{ name: string }>()
          ).data?.name ?? null
        : null;

    const { data: updatedRecord, error: updateError } = await supabase
      .from(tableName)
      .update({
        stage_id: payload.target_stage_id,
        updated_by: user.id,
      })
      .eq("id", payload.record_id)
      .eq("workspace_id", workspaceId)
      .select("id,stage_id")
      .single<MoveResponse>();

    if (updateError) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_MOVE_FAILED",
            message: "We could not move the pipeline card.",
            details: updateError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "pipeline.card.moved",
      actor_user_id: user.id,
      entity_id: payload.record_id,
      entity_type: payload.entity_type,
      metadata: {
        from_stage_name: previousStageName,
        from_stage_id: record.stage_id,
        pipeline_group_id: targetStage.pipeline_group_id,
        target_stage_name: targetStage.name,
        target_stage_id: payload.target_stage_id,
      },
      workspace_id: workspaceId,
    });

    after(() =>
      triggerAutomationForWorkspace({
        automationType: "pipeline.card.moved",
        payload: {
          actor_user_id: user.id,
          entity_id: payload.record_id,
          entity_type: payload.entity_type,
          from_stage_id: record.stage_id,
          from_stage_name: previousStageName,
          timestamp: new Date().toISOString(),
          to_stage_id: payload.target_stage_id,
          to_stage_name: targetStage.name,
        },
        relatedId: payload.record_id,
        relatedType: payload.entity_type,
        supabase,
        workspaceId,
      }),
    );

    return jsonResponse({
      data: updatedRecord,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the move details and try again.",
            details: error.flatten().fieldErrors,
          },
          ok: false,
        },
        400,
      );
    }

    return jsonResponse(
      {
        error: {
          code: "BAD_REQUEST",
          message: "We could not read the pipeline move request.",
          details: error instanceof Error ? error.message : undefined,
        },
        ok: false,
      },
      400,
    );
  }
}
