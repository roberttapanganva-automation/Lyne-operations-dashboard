import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type {
  AssignableWorkspaceMember,
  AssignmentRule,
  AssignmentRuleMember,
  AssignmentTargetType,
} from "@/types/domain";

type MemberRow = {
  id: string;
  invited_email: string | null;
  role: AssignableWorkspaceMember["role"] | "viewer";
  status: "active" | "invited" | "disabled";
  user_id: string;
  workspace_id: string;
};

type ProfileRow = {
  full_name: string | null;
  id: string;
};

export type AssignmentRuleWithMembers = AssignmentRule & {
  members: AssignmentRuleMember[];
};

export type MyAssignedWorkSummary = {
  jobs: number;
  leads: number;
  tasks: number;
};

function getDisplayName(member: MemberRow, profile: ProfileRow | undefined) {
  return (
    profile?.full_name?.trim() ||
    member.invited_email?.split("@")[0]?.replace(/[._-]+/g, " ").trim() ||
    "Workspace member"
  );
}

async function loadProfilesByUserId({
  supabase,
  userIds,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userIds: string[];
}) {
  if (userIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name")
    .in("id", userIds)
    .returns<ProfileRow[]>();

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

export function normalizeAssignableMember(
  member: MemberRow,
  profilesByUserId: Map<string, ProfileRow>,
): AssignableWorkspaceMember {
  const profile = profilesByUserId.get(member.user_id);

  return {
    display_name: getDisplayName(member, profile),
    email: member.invited_email,
    full_name: profile?.full_name ?? null,
    id: member.id,
    role: member.role as AssignableWorkspaceMember["role"],
    status: "active",
    user_id: member.user_id,
    workspace_id: member.workspace_id,
  };
}

export async function getAssignableMembersForActiveWorkspace(): Promise<
  AssignableWorkspaceMember[]
> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return [];
  }

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("id,workspace_id,user_id,role,status,invited_email")
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .eq("status", "active")
    .in("role", ["admin", "manager", "staff"])
    .order("role", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<MemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const profilesByUserId = await loadProfilesByUserId({
    supabase,
    userIds: [...new Set((members ?? []).map((member) => member.user_id))],
  });

  return (members ?? []).map((member) =>
    normalizeAssignableMember(member, profilesByUserId),
  );
}

export async function getAssignmentRulesForActiveWorkspace(): Promise<
  AssignmentRuleWithMembers[]
> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return [];
  }

  const supabase = await createClient();
  const workspaceId = activeWorkspace.context.workspace.id;
  const [{ data: rules, error: rulesError }, { data: members, error: membersError }] =
    await Promise.all([
      supabase
        .from("assignment_rules")
        .select(
          "id,workspace_id,entity_type,strategy,enabled,auto_create_task,task_due_offset_minutes,notify_assignee,last_assigned_member_id,created_by,updated_by,created_at,updated_at",
        )
        .eq("workspace_id", workspaceId)
        .order("entity_type", { ascending: true })
        .returns<AssignmentRule[]>(),
      supabase
        .from("assignment_rule_members")
        .select(
          "id,workspace_id,assignment_rule_id,workspace_member_id,active,order_index,created_at,updated_at",
        )
        .eq("workspace_id", workspaceId)
        .order("order_index", { ascending: true })
        .returns<AssignmentRuleMember[]>(),
    ]);

  if (rulesError || membersError) {
    throw new Error(rulesError?.message ?? membersError?.message);
  }

  const membersByRuleId = new Map<string, AssignmentRuleMember[]>();

  for (const member of members ?? []) {
    const list = membersByRuleId.get(member.assignment_rule_id) ?? [];
    list.push(member);
    membersByRuleId.set(member.assignment_rule_id, list);
  }

  const existingRules = new Map(
    (rules ?? []).map((rule) => [
      rule.entity_type,
      {
        ...rule,
        members: membersByRuleId.get(rule.id) ?? [],
      },
    ]),
  );

  return (["lead", "job", "task"] as AssignmentTargetType[]).map(
    (entityType) =>
      existingRules.get(entityType) ?? {
        auto_create_task: false,
        created_at: "",
        created_by: null,
        enabled: false,
        entity_type: entityType,
        id: "",
        last_assigned_member_id: null,
        members: [],
        notify_assignee: true,
        strategy: "round_robin",
        task_due_offset_minutes: 1440,
        updated_at: "",
        updated_by: null,
        workspace_id: workspaceId,
      },
  );
}

export async function getMyAssignedWorkSummary(): Promise<MyAssignedWorkSummary> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return { jobs: 0, leads: 0, tasks: 0 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { jobs: 0, leads: 0, tasks: 0 };
  }

  const { data: member } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  if (!member) {
    return { jobs: 0, leads: 0, tasks: 0 };
  }

  const workspaceId = activeWorkspace.context.workspace.id;
  const [leads, jobs, tasks] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("assigned_member_id", member.id),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("assigned_member_id", member.id),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("assigned_member_id", member.id)
      .neq("status", "done")
      .neq("status", "cancelled"),
  ]);

  return {
    jobs: jobs.count ?? 0,
    leads: leads.count ?? 0,
    tasks: tasks.count ?? 0,
  };
}

export async function getMemberAssignmentDisplay({
  memberId,
}: {
  memberId: string | null;
}) {
  if (!memberId) {
    return null;
  }

  const members = await getAssignableMembersForActiveWorkspace();

  return members.find((member) => member.id === memberId) ?? null;
}

export async function getAssignmentDisplayMapForWorkspace({
  memberIds,
  supabase,
  workspaceId,
}: {
  memberIds: string[];
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
}) {
  const uniqueMemberIds = [...new Set(memberIds.filter(Boolean))];

  if (uniqueMemberIds.length === 0) {
    return new Map<string, AssignableWorkspaceMember>();
  }

  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("id,workspace_id,user_id,role,status,invited_email")
    .eq("workspace_id", workspaceId)
    .in("id", uniqueMemberIds)
    .returns<MemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const profilesByUserId = await loadProfilesByUserId({
    supabase,
    userIds: [...new Set((members ?? []).map((member) => member.user_id))],
  });

  return new Map(
    (members ?? []).map((member) => [
      member.id,
      normalizeAssignableMember(member, profilesByUserId),
    ]),
  );
}

export async function getCurrentWorkspaceMemberId(): Promise<string | null> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}
