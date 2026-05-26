import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getAssignableMembersForActiveWorkspace,
  getAssignmentRulesForActiveWorkspace,
} from "@/lib/assignments/queries";
import { getOwnerAccessContext } from "@/lib/owner/access";
import { updateAssignmentRuleSchema } from "@/lib/validation/assignments";
import type { ApiResponse } from "@/types/api";

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET() {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return jsonResponse(
      {
        error: access.error,
        ok: false,
      },
      access.error.status,
    );
  }

  const [members, rules] = await Promise.all([
    getAssignableMembersForActiveWorkspace(),
    getAssignmentRulesForActiveWorkspace(),
  ]);

  return jsonResponse({
    data: { members, rules },
    ok: true,
  });
}

export async function PATCH(request: Request) {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return jsonResponse(
      {
        error: access.error,
        ok: false,
      },
      access.error.status,
    );
  }

  try {
    const payload = updateAssignmentRuleSchema.parse(await request.json());
    const workspaceId = access.activeWorkspace.workspace.id;
    const assignableMembers = await getAssignableMembersForActiveWorkspace();
    const assignableMemberIds = new Set(assignableMembers.map((member) => member.id));

    if (payload.member_ids.some((memberId) => !assignableMemberIds.has(memberId))) {
      return jsonResponse(
        {
          error: {
            code: "ASSIGNMENT_POOL_INVALID",
            message:
              "Choose active admin, manager, or staff members from this workspace.",
          },
          ok: false,
        },
        400,
      );
    }

    const { data: rule, error: ruleError } = await access.supabase
      .from("assignment_rules")
      .upsert(
        {
          auto_create_task: payload.auto_create_task,
          enabled: payload.enabled,
          entity_type: payload.entity_type,
          notify_assignee: payload.notify_assignee,
          strategy: "round_robin",
          task_due_offset_minutes: payload.task_due_offset_minutes,
          updated_by: access.user.id,
          workspace_id: workspaceId,
        },
        { onConflict: "workspace_id,entity_type" },
      )
      .select("id")
      .single<{ id: string }>();

    if (ruleError) {
      return jsonResponse(
        {
          error: {
            code: "ASSIGNMENT_RULE_SAVE_FAILED",
            details: ruleError.message,
            message: "We could not save the assignment rule.",
          },
          ok: false,
        },
        500,
      );
    }

    const { error: deleteError } = await access.supabase
      .from("assignment_rule_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("assignment_rule_id", rule.id);

    if (deleteError) {
      return jsonResponse(
        {
          error: {
            code: "ASSIGNMENT_POOL_SAVE_FAILED",
            details: deleteError.message,
            message: "We could not refresh the assignment pool.",
          },
          ok: false,
        },
        500,
      );
    }

    if (payload.member_ids.length > 0) {
      const { error: insertError } = await access.supabase
        .from("assignment_rule_members")
        .insert(
          payload.member_ids.map((memberId, index) => ({
            active: true,
            assignment_rule_id: rule.id,
            order_index: index,
            workspace_id: workspaceId,
            workspace_member_id: memberId,
          })),
        );

      if (insertError) {
        return jsonResponse(
          {
            error: {
              code: "ASSIGNMENT_POOL_SAVE_FAILED",
              details: insertError.message,
              message: "We could not save the assignment pool.",
            },
            ok: false,
          },
          500,
        );
      }
    }

    await access.supabase.from("audit_logs").insert({
      action: "assignment_rule.updated",
      actor_user_id: access.user.id,
      entity_id: rule.id,
      entity_type: "assignment_rule",
      metadata: {
        enabled: payload.enabled,
        entity_type: payload.entity_type,
        member_count: payload.member_ids.length,
      },
      workspace_id: workspaceId,
    });

    const rules = await getAssignmentRulesForActiveWorkspace();

    return jsonResponse({
      data: { rules },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Check the assignment rule and try again.",
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
          message: "We could not read the assignment rule update.",
        },
        ok: false,
      },
      400,
    );
  }
}
