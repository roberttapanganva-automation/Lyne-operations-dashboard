import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getOwnerAccessContext, writeOwnerAuditLog } from "@/lib/owner/access";
import { createPipelineGroupSchema } from "@/lib/validation/pipelines";
import type { ApiResponse } from "@/types/api";
import type { PipelineGroup } from "@/types/domain";

const pipelineGroupSelect =
  "id,workspace_id,name,description,entity_type,order_index,is_default,created_by,updated_by,created_at,updated_at";

type ExistingGroupLookup = {
  id: string;
  name: string;
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

export async function GET() {
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

  const { data, error } = await access.supabase
    .from("pipeline_groups")
    .select(pipelineGroupSelect)
    .eq("workspace_id", access.activeWorkspace.workspace.id)
    .order("entity_type", { ascending: true })
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<PipelineGroup[]>();

  if (error) {
    return jsonResponse(
      {
        error: {
          code: "PIPELINE_GROUPS_LOAD_FAILED",
          message: "We could not load pipeline groups.",
          details: error.message,
        },
        ok: false,
      },
      500,
    );
  }

  return jsonResponse({
    data: data ?? [],
    ok: true,
  });
}

export async function POST(request: Request) {
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
    const payload = createPipelineGroupSchema.parse(await request.json());
    const workspaceId = access.activeWorkspace.workspace.id;
    const { data: existingForEntity, error: existingError } = await access.supabase
      .from("pipeline_groups")
      .select("id,name")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", payload.entity_type)
      .returns<ExistingGroupLookup[]>();

    if (existingError) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_LOOKUP_FAILED",
            message: "We could not verify existing pipeline groups.",
            details: existingError.message,
          },
          ok: false,
        },
        500,
      );
    }

    const duplicateGroup = (existingForEntity ?? []).find(
      (group) => group.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
    );

    if (duplicateGroup) {
      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_DUPLICATE",
            message:
              "A pipeline group with this name already exists for that entity type.",
          },
          ok: false,
        },
        409,
      );
    }

    const nextIsDefault =
      payload.is_default || (existingForEntity ?? []).length === 0;

    if (nextIsDefault) {
      const { error: resetError } = await access.supabase
        .from("pipeline_groups")
        .update({ is_default: false, updated_by: access.user.id })
        .eq("workspace_id", workspaceId)
        .eq("entity_type", payload.entity_type)
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
      .insert({
        created_by: access.user.id,
        description: payload.description ?? null,
        entity_type: payload.entity_type,
        is_default: nextIsDefault,
        name: payload.name,
        order_index: payload.order_index,
        updated_by: access.user.id,
        workspace_id: workspaceId,
      })
      .select(pipelineGroupSelect)
      .single<PipelineGroup>();

    if (error) {
      if (error.code === "23505") {
        return jsonResponse(
          {
            error: {
              code: "PIPELINE_GROUP_DUPLICATE",
              message:
                "A pipeline group with this name already exists for that entity type.",
              details: error.message,
            },
            ok: false,
          },
          409,
        );
      }

      return jsonResponse(
        {
          error: {
            code: "PIPELINE_GROUP_CREATE_FAILED",
            message: "We could not create the pipeline group.",
            details: error.message,
          },
          ok: false,
        },
        500,
      );
    }

    await writePipelineAuditLogSafely({
      access,
      action: "pipeline_group.created",
      entityId: group.id,
      entityType: "pipeline_group",
      metadata: {
        entity_type: group.entity_type,
        is_default: group.is_default,
        name: group.name,
      },
    });

    return jsonResponse(
      {
        data: group,
        ok: true,
      },
      201,
    );
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
          message: "We could not read the pipeline group details.",
          details: error instanceof Error ? error.message : undefined,
        },
        ok: false,
      },
      400,
    );
  }
}
