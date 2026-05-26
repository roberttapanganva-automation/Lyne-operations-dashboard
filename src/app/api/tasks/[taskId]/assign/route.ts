import { after, NextResponse } from "next/server";
import { revalidateTaskPages } from "@/lib/cache/revalidate-app";
import { z, ZodError } from "zod";
import { assignRecordManually } from "@/lib/assignments/engine";
import { triggerAutomationForWorkspace } from "@/lib/n8n/client";
import { canAssignOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { assignRecordSchema } from "@/lib/validation/assignments";
import type { ApiResponse } from "@/types/api";
import type { AssignmentResult } from "@/types/domain";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
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
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to assign tasks.",
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
      activeWorkspace.status === "no-user" ? 401 : 403,
    );
  }

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

  try {
    const payload = assignRecordSchema.parse(await request.json());
    const result = await assignRecordManually({
      assignedMemberId: payload.assigned_member_id,
      recordId: taskIdResult.data,
      targetType: "task",
    });

    if (!result.ok) {
      return jsonResponse(
        {
          error: {
            code: "TASK_ASSIGN_FAILED",
            message: result.error ?? "We could not assign this task.",
          },
          ok: false,
        },
        400,
      );
    }

    revalidateTaskPages();

    after(() =>
      triggerAutomationForWorkspace({
        automationType: "task.assigned",
        payload: {
          assigned_member_id: result.assigned_member_id,
        },
        relatedId: taskIdResult.data,
        relatedType: "task",
        supabase,
        workspaceId: activeWorkspace.context.workspace.id,
      }),
    );

    return jsonResponse<AssignmentResult>({
      data: result,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Choose a valid assignment target.",
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
          message: "We could not read the assignment request.",
        },
        ok: false,
      },
      400,
    );
  }
}
