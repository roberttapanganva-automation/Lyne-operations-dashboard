import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getOwnerAccessContext, writeOwnerAuditLog } from "@/lib/owner/access";
import { updatePipelineGroupSchema } from "@/lib/validation/pipelines";
import type { ApiResponse } from "@/types/api";
import type { PipelineGroup } from "@/types/domain";

const pipelineGroupSelect =
  "id,workspace_id,name,description,entity_type,order_index,is_default,created_by,updated_by,created_at,updated_at";

type RouteContext = {
  params: Promise<{
    groupId: string;
  }>;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

async function writePipelineAuditLogSafely(
  payload: Parameters<typeof writeOwnerAuditLog>[0],
) {
  try {
    await writeOwnerAuditLog(payload);
  } catch (error) {
    console.error("Pipeline group audit log failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function getGroupId(context: RouteContext) {
  const { groupId } = await context.params;

  return z.uuid().parse(groupId);
}

export async function PATCH(request: Request, context: RouteContext) {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: access.error.code,
          message: access.error.message,
        },
        ok: false,
      },
      access.error.status,
    );
  }

  try {
    const groupId = await getGroupId(context);
    const payload = updatePipelineGroupSchema.parse(await request.json());
    const workspaceId = access.activeWorkspace.workspace.id;
    const { data: existingGroup, error: existingError } = await access.supabase
      .from("pipeline_groups")
      .select(pipelineGroupSelect)
      .eq("id", groupId)
      .eq("workspace_id", workspaceId)
      .maybeSingle<PipelineGroup>();

    if (existingError) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_LOOKUP_FAILED",
            message: "We could not verify the pipeline group.",
            details: existingError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if (!existingGroup) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_NOT_FOUND",
            message: "This pipeline group is not available in the active workspace.",
          },
          ok: false,
        },
        404,
      );
    }

    if (existingGroup.entity_type !== payload.entity_type) {
      const { count, error: stageCountError } = await access.supabase
        .from("pipeline_stages")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("pipeline_group_id", groupId);

      if (stageCountError) {
        return jsonResponse(
          {
            error: {
              code: "PIPELINE_STAGE_COUNT_FAILED",
              message: "We could not verify stages for this pipeline group.",
              details: stageCountError.message,
            },
            ok: false,
          },
          500,
        );
      }

      if ((count ?? 0) > 0) {
        return jsonResponse(
          {
            error: {
              code: "PIPELINE_GROUP_ENTITY_LOCKED",
              message:
                "Change the entity type only after removing stages from this pipeline group.",
            },
            ok: false,
          },
          409,
        );
      }
    }

    if (payload.is_default) {
      const { error: resetError } = await access.supabase
        .from("pipeline_groups")
        .update({ is_default: false, updated_by: access.user.id })
        .eq("workspace_id", workspaceId)
        .eq("entity_type", payload.entity_type)
        .neq("id", groupId)
        .eq("is_default", true);

      if (resetError) {
        return jsonResponse(
          {
            error: {
              code: "PIPELINE_GROUP_DEFAULT_RESET_FAILED",
              message: "We could not update the default pipeline group.",
              details: resetError.message,
            },
            ok: false,
          },
          500,
        );
      }
    }

    const { data: group, error } = await access.supabase
      .from("pipeline_groups")
      .update({
        description: payload.description ?? null,
        entity_type: payload.entity_type,
        is_default: payload.is_default,
        name: payload.name,
        order_index: payload.order_index,
        updated_by: access.user.id,
      })
      .eq("id", groupId)
      .eq("workspace_id", workspaceId)
      .select(pipelineGroupSelect)
      .single<PipelineGroup>();

    if (error) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_UPDATE_FAILED",
            message: "We could not update the pipeline group.",
            details: error.message,
          },
          ok: false,
        },
        500,
      );
    }

    await writePipelineAuditLogSafely({
      access,
      action: "pipeline_group.updated",
      entityId: group.id,
      entityType: "pipeline_group",
      metadata: {
        entity_type: group.entity_type,
        is_default: group.is_default,
        name: group.name,
      },
    });

    return jsonResponse({
      data: group,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the pipeline group details and try again.",
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
          message: "We could not update the pipeline group.",
          details: error instanceof Error ? error.message : undefined,
        },
        ok: false,
      },
      400,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: access.error.code,
          message: access.error.message,
        },
        ok: false,
      },
      access.error.status,
    );
  }

  try {
    const groupId = await getGroupId(context);
    const workspaceId = access.activeWorkspace.workspace.id;
    const { count: stageCount, error: stageCountError } = await access.supabase
      .from("pipeline_stages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("pipeline_group_id", groupId);

    if (stageCountError) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_STAGE_CHECK_FAILED",
            message: "We could not verify whether the pipeline group still has stages.",
            details: stageCountError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if ((stageCount ?? 0) > 0) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_NOT_EMPTY",
            message:
              "Delete the stages in this pipeline group before deleting the group itself.",
          },
          ok: false,
        },
        409,
      );
    }

    const { error } = await access.supabase
      .from("pipeline_groups")
      .delete()
      .eq("id", groupId)
      .eq("workspace_id", workspaceId);

    if (error) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_DELETE_FAILED",
            message: "We could not delete the pipeline group.",
            details: error.message,
          },
          ok: false,
        },
        500,
      );
    }

    await writePipelineAuditLogSafely({
      access,
      action: "pipeline_group.deleted",
      entityId: groupId,
      entityType: "pipeline_group",
    });

    return jsonResponse({
      data: {
        id: groupId,
      },
      ok: true,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: {
          code: "BAD_REQUEST",
          message: "We could not delete the pipeline group.",
          details: error instanceof Error ? error.message : undefined,
        },
        ok: false,
      },
      400,
    );
  }
}
