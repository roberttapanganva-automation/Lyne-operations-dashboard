import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { triggerAutomationForWorkspace } from "@/lib/n8n/client";
import { canViewAutomations } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { triggerAutomationSchema } from "@/lib/validation/automations";
import type { ApiResponse } from "@/types/api";
import type { AutomationTriggerResult } from "@/lib/n8n/client";

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getStatusForWorkspaceResult(status: "no-user" | "no-workspace" | "error") {
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
    return jsonResponse<AutomationTriggerResult>(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to trigger automations.",
        },
        ok: false,
      },
      401,
    );
  }

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return jsonResponse<AutomationTriggerResult>(
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

  if (
    !canViewAutomations(
      activeWorkspace.context.role,
      activeWorkspace.context.rolePermissions,
    )
  ) {
    return jsonResponse<AutomationTriggerResult>(
      {
        error: {
          code: "FORBIDDEN",
          message:
            "Automations are limited to owner, admin, and manager roles unless the owner enables access for your role.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = triggerAutomationSchema.parse(await request.json());
    const result = await triggerAutomationForWorkspace({
      automationType: payload.automation_type,
      payload: payload.payload,
      relatedId: payload.related_id ?? null,
      relatedType: payload.related_type,
      supabase,
      workspaceId: activeWorkspace.context.workspace.id,
    });

    return jsonResponse({
      data: result,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse<AutomationTriggerResult>(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Check the automation event and try again.",
          },
          ok: false,
        },
        400,
      );
    }

    if (error instanceof SyntaxError) {
      return jsonResponse<AutomationTriggerResult>(
        {
          error: {
            code: "BAD_REQUEST",
            message: "We could not read the automation event. Please try again.",
          },
          ok: false,
        },
        400,
      );
    }

    console.error("Automation trigger failed", error);

    return jsonResponse<AutomationTriggerResult>(
      {
        error: {
          code: "AUTOMATION_TRIGGER_FAILED",
          message: "The automation event was sent, but the run could not be finalized.",
        },
        ok: false,
      },
      500,
    );
  }
}
