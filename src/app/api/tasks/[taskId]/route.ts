import { after, NextResponse } from "next/server";
import { revalidateTaskPages } from "@/lib/cache/revalidate-app";
import { z, ZodError } from "zod";
import {
  getAssignableMember,
  getAssignmentFields,
} from "@/lib/assignments/engine";
import { triggerAutomationForWorkspace } from "@/lib/n8n/client";
import {
  canAssignOperationalRecords,
  canDeleteOperationalRecords,
  canEditOperationalRecords,
} from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { updateTaskSchema } from "@/lib/validation/tasks";
import type { ApiResponse } from "@/types/api";
import type { AssignableWorkspaceMember } from "@/types/domain";

type TaskResponse = {
  assigned_member?: AssignableWorkspaceMember | null;
  assigned_member_id?: string | null;
  completed_at: string | null;
  description?: string | null;
  due_at?: string | null;
  id: string;
  priority?: "low" | "normal" | "high" | "urgent";
  related_type?: "lead" | "job" | "client" | "general";
  status: "todo" | "in_progress" | "done" | "cancelled";
  title: string;
};

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
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

export async function PATCH(request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  const taskIdResult = z.uuid().safeParse(taskId);

  if (!taskIdResult.success) {
    return jsonResponse(
      {
        error: {
          code: "INVALID_TASK_ID",
          message: "The selected task is not valid.",
        },
        ok: false,
      },
      400,
    );
  }

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
          message: "Sign in to update tasks.",
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

  if (!canEditOperationalRecords(activeWorkspace.context.role)) {
    return jsonResponse(
      {
        error: {
          code: "TASK_UPDATE_FORBIDDEN",
          message: "Your workspace role cannot update tasks.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const rawPayload = (await request.json()) as Record<string, unknown>;
    const payload = updateTaskSchema.parse(rawPayload);
    const workspaceId = activeWorkspace.context.workspace.id;
    const isStatusOnlyUpdate =
      Object.keys(rawPayload).length === 1 && "status" in rawPayload;
    const assignmentIncluded = Object.prototype.hasOwnProperty.call(
      rawPayload,
      "assigned_member_id",
    );
    let assignedMember: AssignableWorkspaceMember | null = null;
    let assignmentChanged = false;
    let assignmentFields: Record<string, unknown> = {};

    if (assignmentIncluded) {
      if (!canAssignOperationalRecords(activeWorkspace.context.role)) {
        return jsonResponse(
          {
            error: {
              code: "TASK_ASSIGN_FORBIDDEN",
              message: "Your workspace role cannot assign tasks.",
            },
            ok: false,
          },
          403,
        );
      }

      const nextAssignedMemberId = payload.assigned_member_id ?? null;

      if (nextAssignedMemberId) {
        assignedMember = await getAssignableMember({
          memberId: nextAssignedMemberId,
          supabase,
          workspaceId,
        });

        if (!assignedMember) {
          return jsonResponse(
            {
              error: {
                code: "TASK_ASSIGNEE_INVALID",
                message:
                  "Choose an active admin, manager, or staff member from this workspace.",
              },
              ok: false,
            },
            400,
          );
        }
      }

      const { data: currentTask, error: currentTaskError } = await supabase
        .from("tasks")
        .select("id,assigned_member_id")
        .eq("id", taskIdResult.data)
        .eq("workspace_id", workspaceId)
        .maybeSingle<{ assigned_member_id: string | null; id: string }>();

      if (currentTaskError) {
        return jsonResponse(
          {
            error: {
              code: "TASK_LOOKUP_FAILED",
              message: "We could not verify the selected task.",
              details: currentTaskError.message,
            },
            ok: false,
          },
          500,
        );
      }

      if (!currentTask) {
        return jsonResponse(
          {
            error: {
              code: "TASK_NOT_FOUND",
              message: "The selected task is not available in this workspace.",
            },
            ok: false,
          },
          404,
        );
      }

      assignmentChanged = currentTask.assigned_member_id !== nextAssignedMemberId;

      if (assignmentChanged) {
        assignmentFields = getAssignmentFields({
          actorUserId: user.id,
          assignedMember,
          includeNulls: true,
          targetType: "task",
        });
      }
    }

    if (
      !isStatusOnlyUpdate &&
      !canDeleteOperationalRecords(activeWorkspace.context.role)
    ) {
      return jsonResponse(
        {
          error: {
            code: "TASK_EDIT_FORBIDDEN",
            message: "Your workspace role cannot edit task details.",
          },
          ok: false,
        },
        403,
      );
    }

    const updates: Record<string, unknown> = {
      ...assignmentFields,
      updated_by: user.id,
    };

    if ("status" in rawPayload && payload.status) {
      updates.status = payload.status;
      updates.completed_at =
        payload.status === "done" ? new Date().toISOString() : null;
    }

    if ("title" in rawPayload && payload.title) {
      updates.title = payload.title;
    }

    if ("description" in rawPayload) {
      updates.description = payload.description ?? null;
    }

    if ("due_at" in rawPayload) {
      updates.due_at = payload.due_at ?? null;
    }

    if ("priority" in rawPayload && payload.priority) {
      updates.priority = payload.priority;
    }

    if ("related_type" in rawPayload && payload.related_type) {
      updates.related_type = payload.related_type;
    }

    const { data: task, error: taskError } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskIdResult.data)
    .eq("workspace_id", workspaceId)
    .select("id,assigned_member_id,title,description,due_at,priority,status,related_type,completed_at")
    .single<TaskResponse>();

    if (taskError) {
      return jsonResponse(
        {
          error: {
            code: "TASK_UPDATE_FAILED",
            message: "We could not update the task. Please try again.",
            details: taskError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "task.updated",
      actor_user_id: user.id,
      entity_id: task.id,
      entity_type: "task",
      metadata: {
        assigned_member_id: assignmentIncluded
          ? task.assigned_member_id
          : undefined,
        status: task.status,
        title: task.title,
      },
      workspace_id: workspaceId,
    });

    revalidateTaskPages();

    if (assignmentChanged) {
      after(() =>
        triggerAutomationForWorkspace({
          automationType: "task.assigned",
          payload: {
            assigned_member_id: task.assigned_member_id,
          },
          relatedId: task.id,
          relatedType: "task",
          supabase,
          workspaceId,
        }),
      );
    }

    return jsonResponse({
      data: {
        ...task,
        assigned_member: assignmentIncluded ? assignedMember : undefined,
      },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the task details and try again.",
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
          message: "We could not read the task update. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  const taskIdResult = z.uuid().safeParse(taskId);

  if (!taskIdResult.success) {
    return jsonResponse(
      {
        error: {
          code: "INVALID_TASK_ID",
          message: "The selected task is not valid.",
        },
        ok: false,
      },
      400,
    );
  }

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
          code: "TASK_DELETE_FORBIDDEN",
          message: "Your workspace role cannot delete tasks.",
        },
        ok: false,
      },
      403,
    );
  }

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskIdResult.data)
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .select("id,title,status,completed_at")
    .single<TaskResponse>();

  if (taskError) {
    return jsonResponse(
      {
        error: {
          code: "TASK_DELETE_FAILED",
          message: "We could not delete the task. Please try again.",
          details: taskError.message,
        },
        ok: false,
      },
      500,
    );
  }

  await supabase.from("audit_logs").insert({
    action: "task.deleted",
    actor_user_id: user.id,
    entity_id: task.id,
    entity_type: "task",
    metadata: {
      title: task.title,
    },
    workspace_id: activeWorkspace.context.workspace.id,
  });

  revalidateTaskPages();

  return jsonResponse({
    data: task,
    ok: true,
  });
}
