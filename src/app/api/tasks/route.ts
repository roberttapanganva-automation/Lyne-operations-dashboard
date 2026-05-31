import { after, NextResponse } from "next/server";
import { revalidateTaskPages } from "@/lib/cache/revalidate-app";
import { ZodError } from "zod";
import {
  getAssignableMember,
  getAssignmentFields,
} from "@/lib/assignments/engine";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
  canAssignOperationalRecords,
  canCreateOperationalRecords,
} from "@/lib/permissions/workspace";
import { triggerAutomationForWorkspace } from "@/lib/n8n/client";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { createTaskSchema } from "@/lib/validation/tasks";
import type { ApiResponse } from "@/types/api";
import type { AssignableWorkspaceMember } from "@/types/domain";

type TaskResponse = {
  assigned_member_id: string | null;
  completed_at: string | null;
  created_at: string;
  description: string | null;
  due_at: string | null;
  id: string;
  priority: "low" | "normal" | "high" | "urgent";
  related_id: string | null;
  related_type: "lead" | "job" | "client" | "general";
  status: "todo" | "in_progress" | "done" | "cancelled";
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

async function verifyRelatedRecord({
  relatedId,
  relatedType,
  supabase,
  workspaceId,
}: {
  relatedId?: string;
  relatedType: "lead" | "job" | "client" | "general";
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
}) {
  if (!relatedId) {
    return true;
  }

  if (relatedType === "general") {
    return false;
  }

  const tableByType = {
    client: "clients",
    job: "jobs",
    lead: "leads",
  } as const;

  const { data, error } = await supabase
    .from(tableByType[relatedType])
    .select("id")
    .eq("id", relatedId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<{ id: string }>();

  return !error && Boolean(data);
}

export async function GET() {
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
          message: "Sign in to view tasks.",
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

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id,assigned_member_id,title,description,due_at,priority,status,related_type,related_id,completed_at,created_at",
    )
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .order("created_at", { ascending: false })
    .returns<TaskResponse[]>();

  if (error) {
    return jsonResponse(
      {
        error: {
          code: "TASKS_LOAD_FAILED",
          message: "We could not load tasks. Please try again.",
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
          message: "Sign in to create tasks.",
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

  const rolePermission = await getEffectiveRolePermission({
    role: activeWorkspace.context.role,
    supabase,
    workspaceId: activeWorkspace.context.workspace.id,
  });

  if (
    !canCreateOperationalRecords(activeWorkspace.context.role) ||
    rolePermission?.can_create_tasks === false
  ) {
    return jsonResponse(
      {
        error: {
          code: "TASK_CREATE_FORBIDDEN",
          message: "Your workspace role cannot create tasks.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = createTaskSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;
    const requestedAssignedMemberId = payload.assigned_member_id ?? null;
    let assignedMember: AssignableWorkspaceMember | null = null;
    const relatedRecordIsValid = await verifyRelatedRecord({
      relatedId: payload.related_id,
      relatedType: payload.related_type,
      supabase,
      workspaceId,
    });

    if (!relatedRecordIsValid) {
      return jsonResponse(
        {
          error: {
            code: "RELATED_RECORD_INVALID",
            message:
              "The selected related record is not available in this workspace.",
          },
          ok: false,
        },
        400,
      );
    }

    if (requestedAssignedMemberId) {
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

      assignedMember = await getAssignableMember({
        memberId: requestedAssignedMemberId,
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

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        ...getAssignmentFields({
          actorUserId: user.id,
          assignedMember,
          targetType: "task",
        }),
        completed_at: payload.status === "done" ? new Date().toISOString() : null,
        created_by: user.id,
        description: payload.description ?? null,
        due_at: payload.due_at ?? null,
        priority: payload.priority,
        related_id: payload.related_id ?? null,
        related_type: payload.related_type,
        status: payload.status,
        title: payload.title,
        updated_by: user.id,
        workspace_id: workspaceId,
      })
      .select(
        "id,assigned_member_id,title,description,due_at,priority,status,related_type,related_id,completed_at,created_at",
      )
      .single<TaskResponse>();

    if (taskError) {
      return jsonResponse(
        {
          error: {
            code: "TASK_CREATE_FAILED",
            message: "We could not create the task. Please try again.",
            details: taskError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "task.created",
      actor_user_id: user.id,
      entity_id: task.id,
      entity_type: "task",
      metadata: {
        title: task.title,
      },
      workspace_id: workspaceId,
    });

    revalidateTaskPages();

    if (assignedMember) {
      after(() =>
        triggerAutomationForWorkspace({
          automationType: "task.assigned",
          payload: {
            assigned_member_id: assignedMember.id,
          },
          relatedId: task.id,
          relatedType: "task",
          supabase,
          workspaceId,
        }),
      );
    }

    return jsonResponse(
      {
        data: {
          ...task,
          assigned_member: assignedMember,
        },
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
          message: "We could not read the task details. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}
