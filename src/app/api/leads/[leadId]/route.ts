import { after, NextResponse } from "next/server";
import { revalidateLeadPages } from "@/lib/cache/revalidate-app";
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
import { updateLeadSchema } from "@/lib/validation/leads";
import type { ApiResponse } from "@/types/api";
import type { AssignableWorkspaceMember } from "@/types/domain";

type DeletedLead = {
  id: string;
  title: string;
};

type UpdatedLead = DeletedLead & {
  assigned_member?: AssignableWorkspaceMember | null;
  assigned_member_id: string | null;
  estimated_value: number | string;
  next_follow_up_at: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  source: string | null;
  status: "open" | "won" | "lost";
};

type RouteContext = {
  params: Promise<{
    leadId: string;
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
  const { leadId } = await context.params;
  const leadIdResult = z.uuid().safeParse(leadId);

  if (!leadIdResult.success) {
    return jsonResponse(
      {
        error: {
          code: "INVALID_LEAD_ID",
          message: "The selected lead is not valid.",
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
          message: "Sign in to update leads.",
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
          code: "LEAD_UPDATE_FORBIDDEN",
          message: "Your workspace role cannot update leads.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const rawPayload = (await request.json()) as Record<string, unknown>;
    const payload = updateLeadSchema.parse(rawPayload);
    const workspaceId = activeWorkspace.context.workspace.id;
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
              code: "LEAD_ASSIGN_FORBIDDEN",
              message: "Your workspace role cannot assign leads.",
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
                code: "LEAD_ASSIGNEE_INVALID",
                message:
                  "Choose an active admin, manager, or staff member from this workspace.",
              },
              ok: false,
            },
            400,
          );
        }
      }

      const { data: currentLead, error: currentLeadError } = await supabase
        .from("leads")
        .select("id,assigned_member_id")
        .eq("id", leadIdResult.data)
        .eq("workspace_id", workspaceId)
        .maybeSingle<{ assigned_member_id: string | null; id: string }>();

      if (currentLeadError) {
        return jsonResponse(
          {
            error: {
              code: "LEAD_LOOKUP_FAILED",
              message: "We could not verify the selected lead.",
              details: currentLeadError.message,
            },
            ok: false,
          },
          500,
        );
      }

      if (!currentLead) {
        return jsonResponse(
          {
            error: {
              code: "LEAD_NOT_FOUND",
              message: "The selected lead is not available in this workspace.",
            },
            ok: false,
          },
          404,
        );
      }

      assignmentChanged = currentLead.assigned_member_id !== nextAssignedMemberId;

      if (assignmentChanged) {
        assignmentFields = getAssignmentFields({
          actorUserId: user.id,
          assignedMember,
          includeNulls: true,
          targetType: "lead",
        });
      }
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .update({
        ...assignmentFields,
        estimated_value: payload.estimated_value,
        next_follow_up_at: payload.next_follow_up_at ?? null,
        priority: payload.priority,
        source: payload.source,
        status: payload.status,
        title: payload.title,
        updated_by: user.id,
      })
      .eq("id", leadIdResult.data)
      .eq("workspace_id", workspaceId)
      .select("id,assigned_member_id,title,source,estimated_value,priority,status,next_follow_up_at")
      .single<UpdatedLead>();

    if (leadError) {
      return jsonResponse(
        {
          error: {
            code: "LEAD_UPDATE_FAILED",
            message: "We could not update the lead. Please try again.",
            details: leadError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "lead.updated",
      actor_user_id: user.id,
      entity_id: lead.id,
      entity_type: "lead",
      metadata: {
        assigned_member_id: assignmentIncluded
          ? lead.assigned_member_id
          : undefined,
        status: lead.status,
        title: lead.title,
      },
      workspace_id: workspaceId,
    });

    revalidateLeadPages();

    if (assignmentChanged) {
      after(() =>
        triggerAutomationForWorkspace({
          automationType: "lead.assigned",
          payload: {
            assigned_member_id: lead.assigned_member_id,
          },
          relatedId: lead.id,
          relatedType: "lead",
          supabase,
          workspaceId,
        }),
      );
    }

    return jsonResponse({
      data: {
        ...lead,
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
            message: "Check the lead details and try again.",
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
          message: "We could not read the lead update. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { leadId } = await context.params;
  const leadIdResult = z.uuid().safeParse(leadId);

  if (!leadIdResult.success) {
    return jsonResponse(
      {
        error: {
          code: "INVALID_LEAD_ID",
          message: "The selected lead is not valid.",
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
          message: "Sign in to delete leads.",
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
          code: "LEAD_DELETE_FORBIDDEN",
          message: "Your workspace role cannot delete leads.",
        },
        ok: false,
      },
      403,
    );
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadIdResult.data)
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .select("id,title")
    .single<DeletedLead>();

  if (leadError) {
    return jsonResponse(
      {
        error: {
          code: "LEAD_DELETE_FAILED",
          message: "We could not delete the lead. Please try again.",
          details: leadError.message,
        },
        ok: false,
      },
      500,
    );
  }

  await supabase.from("audit_logs").insert({
    action: "lead.deleted",
    actor_user_id: user.id,
    entity_id: lead.id,
    entity_type: "lead",
    metadata: {
      title: lead.title,
    },
    workspace_id: activeWorkspace.context.workspace.id,
  });

  revalidateLeadPages();

  return jsonResponse({
    data: lead,
    ok: true,
  });
}
