import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { canDeleteOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { bulkJobActionSchema } from "@/lib/validation/jobs";
import type { ApiResponse } from "@/types/api";

type BulkDeletedJob = {
  id: string;
  title: string;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getStatusForWorkspaceResult(
  status: "no-user" | "no-workspace" | "error",
) {
  if (status === "no-user") {
    return 401;
  }

  if (status === "no-workspace") {
    return 403;
  }

  return 500;
}

export async function POST(request: Request) {
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
          message: "Sign in to delete jobs.",
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
      getStatusForWorkspaceResult(activeWorkspace.status),
    );
  }

  if (!canDeleteOperationalRecords(activeWorkspace.context.role)) {
    return jsonResponse(
      {
        error: {
          code: "JOB_BULK_DELETE_FORBIDDEN",
          message: "Your workspace role cannot delete jobs.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = bulkJobActionSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;
    const ids = [...new Set(payload.ids)];

    const { data: availableJobs, error: availableError } = await supabase
      .from("jobs")
      .select("id,title")
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .returns<BulkDeletedJob[]>();

    if (availableError) {
      return jsonResponse(
        {
          error: {
            code: "JOB_BULK_LOOKUP_FAILED",
            message: "We could not verify the selected jobs.",
            details: availableError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if ((availableJobs ?? []).length !== ids.length) {
      return jsonResponse(
        {
          error: {
            code: "JOB_BULK_SCOPE_MISMATCH",
            message: "Some selected jobs are not available in this workspace.",
          },
          ok: false,
        },
        400,
      );
    }

    const { data: deletedJobs, error: deleteError } = await supabase
      .from("jobs")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .select("id,title")
      .returns<BulkDeletedJob[]>();

    if (deleteError) {
      return jsonResponse(
        {
          error: {
            code: "JOB_BULK_DELETE_FAILED",
            message: "We could not delete the selected jobs. Please try again.",
            details: deleteError.message,
          },
          ok: false,
        },
        500,
      );
    }

    const deleted = deletedJobs ?? [];

    if (deleted.length > 0) {
      await supabase.from("audit_logs").insert(
        deleted.map((job) => ({
          action: "job.deleted",
          actor_user_id: user.id,
          entity_id: job.id,
          entity_type: "job",
          metadata: {
            title: job.title,
          },
          workspace_id: workspaceId,
        })),
      );
    }

    return jsonResponse({
      data: {
        deleted,
        deletedCount: deleted.length,
      },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Choose at least one valid job.",
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
          message: "We could not read the bulk job request. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}
