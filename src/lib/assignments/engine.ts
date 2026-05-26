import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type {
  AssignableWorkspaceMember,
  AssignmentResult,
  AssignmentRule,
  AssignmentRuleMember,
  AssignmentTargetType,
  WorkspaceRole,
} from "@/types/domain";
import {
  normalizeAssignableMember,
} from "./queries";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type RecordRow = {
  id: string;
  title?: string | null;
  workspace_id: string;
};

type MemberRow = {
  id: string;
  invited_email: string | null;
  role: AssignableWorkspaceMember["role"] | "owner" | "viewer";
  status: "active" | "invited" | "disabled";
  user_id: string;
  workspace_id: string;
};

type ProfileRow = {
  full_name: string | null;
  id: string;
};

const tableByTarget = {
  job: "jobs",
  lead: "leads",
  task: "tasks",
} as const;

export function canAssignWork(role: WorkspaceRole | null) {
  return role === "owner" || role === "admin" || role === "manager";
}

function getFailureResult({
  error,
  recordId,
  targetType,
}: {
  error: string;
  recordId: string;
  targetType: AssignmentTargetType;
}): AssignmentResult {
  return {
    assigned_member: null,
    assigned_member_id: null,
    error,
    ok: false,
    record_id: recordId,
    target_type: targetType,
  };
}

async function getActorUserId(supabase: SupabaseServerClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function writeAuditLog({
  action,
  actorUserId,
  entityId,
  entityType,
  metadata,
  supabase,
  workspaceId,
}: {
  action: string;
  actorUserId: string | null;
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
  supabase: SupabaseServerClient;
  workspaceId: string;
}) {
  await supabase.from("audit_logs").insert({
    action,
    actor_user_id: actorUserId,
    entity_id: entityId,
    entity_type: entityType,
    metadata: metadata ?? {},
    workspace_id: workspaceId,
  });
}

async function logAutomationFailure({
  errorMessage,
  relatedId,
  relatedType,
  supabase,
  workspaceId,
}: {
  errorMessage: string;
  relatedId: string;
  relatedType: string;
  supabase: SupabaseServerClient;
  workspaceId: string;
}) {
  await supabase.from("automation_logs").insert({
    automation_type: "assignment_engine",
    error_message: errorMessage,
    message: "Assignment automation failed; manual assignment is available.",
    payload: {
      related_id: relatedId,
      related_type: relatedType,
    },
    related_id: relatedId,
    related_type: relatedType,
    status: "failed",
    workspace_id: workspaceId,
  });
}

async function getRecordForTarget({
  recordId,
  supabase,
  targetType,
  workspaceId,
}: {
  recordId: string;
  supabase: SupabaseServerClient;
  targetType: AssignmentTargetType;
  workspaceId: string;
}) {
  const tableName = tableByTarget[targetType];
  const { data, error } = await supabase
    .from(tableName)
    .select("id,workspace_id,title")
    .eq("id", recordId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<RecordRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getAssignableMember({
  memberId,
  supabase,
  workspaceId,
}: {
  memberId: string;
  supabase: SupabaseServerClient;
  workspaceId: string;
}) {
  const { data: member, error } = await supabase
    .from("workspace_members")
    .select("id,workspace_id,user_id,role,status,invited_email")
    .eq("id", memberId)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .in("role", ["admin", "manager", "staff"])
    .maybeSingle<MemberRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!member) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name")
    .eq("id", member.user_id)
    .maybeSingle<ProfileRow>();

  return normalizeAssignableMember(
    member,
    new Map(profile ? [[profile.id, profile]] : []),
  );
}

export function getAssignmentFields({
  actorUserId,
  assignedMember,
  includeNulls = false,
  targetType: _targetType,
}: {
  actorUserId: string | null;
  assignedMember: AssignableWorkspaceMember | null;
  includeNulls?: boolean;
  targetType: AssignmentTargetType;
}) {
  if (!assignedMember && !includeNulls) {
    return {};
  }

  const fields: Record<string, unknown> = {
    assigned_at: assignedMember ? new Date().toISOString() : null,
    assigned_by: assignedMember ? actorUserId : null,
    assigned_member_id: assignedMember?.id ?? null,
  };

  return fields;
}

async function updateRecordAssignment({
  actorUserId,
  assignedMember,
  recordId,
  supabase,
  targetType,
  workspaceId,
}: {
  actorUserId: string | null;
  assignedMember: AssignableWorkspaceMember | null;
  recordId: string;
  supabase: SupabaseServerClient;
  targetType: AssignmentTargetType;
  workspaceId: string;
}) {
  const updates: Record<string, unknown> = {
    ...getAssignmentFields({
      actorUserId,
      assignedMember,
      includeNulls: true,
      targetType,
    }),
    updated_by: actorUserId,
  };

  const { error } = await supabase
    .from(tableByTarget[targetType])
    .update(updates)
    .eq("id", recordId)
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function assignRecordManually({
  assignedMemberId,
  recordId,
  targetType,
}: {
  assignedMemberId: string | null;
  recordId: string;
  targetType: AssignmentTargetType;
}): Promise<AssignmentResult> {
  const supabase = await createClient();
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return getFailureResult({
      error: activeWorkspace.error ?? "No active workspace is available.",
      recordId,
      targetType,
    });
  }

  const actorUserId = await getActorUserId(supabase);
  const workspaceId = activeWorkspace.context.workspace.id;

  if (!canAssignWork(activeWorkspace.context.role)) {
    return getFailureResult({
      error: "Your workspace role cannot assign work.",
      recordId,
      targetType,
    });
  }

  try {
    const record = await getRecordForTarget({
      recordId,
      supabase,
      targetType,
      workspaceId,
    });

    if (!record) {
      return getFailureResult({
        error: "The selected record is not available in this workspace.",
        recordId,
        targetType,
      });
    }

    const assignedMember = assignedMemberId
      ? await getAssignableMember({
          memberId: assignedMemberId,
          supabase,
          workspaceId,
        })
      : null;

    if (assignedMemberId && !assignedMember) {
      return getFailureResult({
        error:
          "Choose an active admin, manager, or staff member from this workspace.",
        recordId,
        targetType,
      });
    }

    await updateRecordAssignment({
      actorUserId,
      assignedMember,
      recordId,
      supabase,
      targetType,
      workspaceId,
    });

    await writeAuditLog({
      action: `${targetType}.assigned`,
      actorUserId,
      entityId: recordId,
      entityType: targetType,
      metadata: {
        assigned_member_id: assignedMember?.id ?? null,
      },
      supabase,
      workspaceId,
    });

    return {
      assigned_member: assignedMember,
      assigned_member_id: assignedMember?.id ?? null,
      ok: true,
      record_id: recordId,
      target_type: targetType,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Assignment failed.";
    await logAutomationFailure({
      errorMessage,
      relatedId: recordId,
      relatedType: targetType,
      supabase,
      workspaceId,
    });

    return getFailureResult({
      error: errorMessage,
      recordId,
      targetType,
    });
  }
}

function chooseNextMember({
  lastAssignedMemberId,
  members,
}: {
  lastAssignedMemberId: string | null;
  members: AssignableWorkspaceMember[];
}) {
  if (members.length === 0) {
    return null;
  }

  const lastIndex = lastAssignedMemberId
    ? members.findIndex((member) => member.id === lastAssignedMemberId)
    : -1;
  const nextIndex = lastIndex >= 0 ? (lastIndex + 1) % members.length : 0;

  return members[nextIndex] ?? members[0];
}

export async function createFollowUpTaskForLead({
  assignedMember,
  leadId,
  leadTitle,
  rule,
  supabase,
  userId,
  workspaceId,
}: {
  assignedMember: AssignableWorkspaceMember;
  leadId: string;
  leadTitle: string;
  rule: AssignmentRule;
  supabase: SupabaseServerClient;
  userId: string | null;
  workspaceId: string;
}) {
  const dueAt = new Date(
    Date.now() + rule.task_due_offset_minutes * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      assigned_at: new Date().toISOString(),
      assigned_by: userId,
      assigned_member_id: assignedMember.id,
      created_by: userId,
      description: "Automatically created after lead assignment.",
      due_at: dueAt,
      priority: "normal",
      related_id: leadId,
      related_type: "lead",
      status: "todo",
      title: `Follow up with lead: ${leadTitle}`,
      updated_by: userId,
      workspace_id: workspaceId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: "task.auto_created",
    actorUserId: userId,
    entityId: data.id,
    entityType: "task",
    metadata: {
      assigned_member_id: assignedMember.id,
      lead_id: leadId,
    },
    supabase,
    workspaceId,
  });

  return data.id;
}

export async function autoAssignRecordRoundRobin({
  recordId,
  targetType,
}: {
  recordId: string;
  targetType: AssignmentTargetType;
}): Promise<AssignmentResult> {
  const supabase = await createClient();
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return getFailureResult({
      error: activeWorkspace.error ?? "No active workspace is available.",
      recordId,
      targetType,
    });
  }

  const actorUserId = await getActorUserId(supabase);
  const workspaceId = activeWorkspace.context.workspace.id;

  try {
    const record = await getRecordForTarget({
      recordId,
      supabase,
      targetType,
      workspaceId,
    });

    if (!record) {
      return getFailureResult({
        error: "The selected record is not available in this workspace.",
        recordId,
        targetType,
      });
    }

    const { data: rule, error: ruleError } = await supabase
      .from("assignment_rules")
      .select(
        "id,workspace_id,entity_type,strategy,enabled,auto_create_task,task_due_offset_minutes,notify_assignee,last_assigned_member_id,created_by,updated_by,created_at,updated_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("entity_type", targetType)
      .eq("enabled", true)
      .maybeSingle<AssignmentRule>();

    if (ruleError) {
      throw new Error(ruleError.message);
    }

    if (!rule) {
      return {
        assigned_member: null,
        assigned_member_id: null,
        ok: true,
        record_id: recordId,
        target_type: targetType,
        warning: "No enabled assignment rule is configured.",
      };
    }

    const { data: ruleMembers, error: ruleMembersError } = await supabase
      .from("assignment_rule_members")
      .select(
        "id,workspace_id,assignment_rule_id,workspace_member_id,active,order_index,created_at,updated_at",
      )
      .eq("workspace_id", workspaceId)
      .eq("assignment_rule_id", rule.id)
      .eq("active", true)
      .order("order_index", { ascending: true })
      .returns<AssignmentRuleMember[]>();

    if (ruleMembersError) {
      throw new Error(ruleMembersError.message);
    }

    const memberIds = (ruleMembers ?? []).map(
      (member) => member.workspace_member_id,
    );

    if (memberIds.length === 0) {
      return {
        assigned_member: null,
        assigned_member_id: null,
        ok: true,
        record_id: recordId,
        target_type: targetType,
        warning: "Assignment rule has no active pool members.",
      };
    }

    const { data: memberRows, error: membersError } = await supabase
      .from("workspace_members")
      .select("id,workspace_id,user_id,role,status,invited_email")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .in("role", ["admin", "manager", "staff"])
      .in("id", memberIds)
      .returns<MemberRow[]>();

    if (membersError) {
      throw new Error(membersError.message);
    }

    const { data: profiles } =
      (memberRows ?? []).length > 0
        ? await supabase
            .from("profiles")
            .select("id,full_name")
            .in(
              "id",
              (memberRows ?? []).map((member) => member.user_id),
            )
            .returns<ProfileRow[]>()
        : { data: [] };
    const profilesByUserId = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );
    const memberRowsById = new Map(
      (memberRows ?? []).map((member) => [member.id, member]),
    );
    const orderedMembers = memberIds
      .map((memberId) => memberRowsById.get(memberId))
      .filter((member): member is MemberRow => Boolean(member))
      .map((member) => normalizeAssignableMember(member, profilesByUserId));
    const assignedMember = chooseNextMember({
      lastAssignedMemberId: rule.last_assigned_member_id,
      members: orderedMembers,
    });

    if (!assignedMember) {
      return {
        assigned_member: null,
        assigned_member_id: null,
        ok: true,
        record_id: recordId,
        target_type: targetType,
        warning: "Assignment rule has no eligible active members.",
      };
    }

    await updateRecordAssignment({
      actorUserId,
      assignedMember,
      recordId,
      supabase,
      targetType,
      workspaceId,
    });

    await supabase
      .from("assignment_rules")
      .update({
        last_assigned_member_id: assignedMember.id,
        updated_by: actorUserId,
      })
      .eq("id", rule.id)
      .eq("workspace_id", workspaceId);

    let autoCreatedTaskId: string | null = null;

    if (targetType === "lead" && rule.auto_create_task) {
      autoCreatedTaskId = await createFollowUpTaskForLead({
        assignedMember,
        leadId: recordId,
        leadTitle: record.title ?? "Untitled lead",
        rule,
        supabase,
        userId: actorUserId,
        workspaceId,
      });
    }

    await writeAuditLog({
      action: `${targetType}.auto_assigned`,
      actorUserId,
      entityId: recordId,
      entityType: targetType,
      metadata: {
        assigned_member_id: assignedMember.id,
        auto_created_task_id: autoCreatedTaskId,
      },
      supabase,
      workspaceId,
    });

    return {
      assigned_member: assignedMember,
      assigned_member_id: assignedMember.id,
      auto_created_task_id: autoCreatedTaskId,
      notify_assignee: rule.notify_assignee,
      ok: true,
      record_id: recordId,
      target_type: targetType,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Auto-assignment failed.";
    await logAutomationFailure({
      errorMessage,
      relatedId: recordId,
      relatedType: targetType,
      supabase,
      workspaceId,
    });

    return getFailureResult({
      error: errorMessage,
      recordId,
      targetType,
    });
  }
}
