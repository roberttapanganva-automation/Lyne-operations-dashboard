import { NextResponse } from "next/server";
import { revalidateTaskPages } from "@/lib/cache/revalidate-app";
import { ZodError } from "zod";
import { canDeleteOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { bulkTaskActionSchema } from "@/lib/validation/tasks";
import type { ApiResponse } from "@/types/api";

type BulkDeletedTask = {
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
          message: "Sign in to delete tasks.",
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
          code: "TASK_BULK_DELETE_FORBIDDEN",
          message: "Your workspace role cannot delete tasks.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = bulkTaskActionSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;
    const ids = [...new Set(payload.ids)];

    const { data: availableTasks, error: availableError } = await supabase
      .from("tasks")
      .select("id,title")
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .returns<BulkDeletedTask[]>();

    if (availableError) {
      return jsonResponse(
        {
          error: {
            code: "TASK_BULK_LOOKUP_FAILED",
            message: "We could not verify the selected tasks.",
            details: availableError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if ((availableTasks ?? []).length !== ids.length) {
      return jsonResponse(
        {
          error: {
            code: "TASK_BULK_SCOPE_MISMATCH",
            message: "Some selected tasks are not available in this workspace.",
          },
          ok: false,
        },
        400,
      );
    }

    const { data: deletedTasks, error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .select("id,title")
      .returns<BulkDeletedTask[]>();

    if (deleteError) {
      return jsonResponse(
        {
          error: {
            code: "TASK_BULK_DELETE_FAILED",
            message: "We could not delete the selected tasks. Please try again.",
            details: deleteError.message,
          },
          ok: false,
        },
        500,
      );
    }

    const deleted = deletedTasks ?? [];

    if (deleted.length > 0) {
      await supabase.from("audit_logs").insert(
        deleted.map((task) => ({
          action: "task.deleted",
          actor_user_id: user.id,
          entity_id: task.id,
          entity_type: "task",
          metadata: {
            title: task.title,
          },
          workspace_id: workspaceId,
        })),
      );

      revalidateTaskPages();
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
            message: "Choose at least one valid task.",
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
          message: "We could not read the bulk task request. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}
