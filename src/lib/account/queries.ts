import { getAccountInitials, resolveAccountAvatarUrl } from "@/lib/account/avatar";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { ThemeMode, WorkspaceRole } from "@/types/domain";

type ProfileRow = {
  avatar_url: string | null;
  full_name: string | null;
  theme_mode: ThemeMode | null;
  timezone: string | null;
};

type WorkspaceMembershipRow = {
  role: WorkspaceRole;
  status: "active" | "invited" | "disabled";
  workspace_id: string;
};

type ActivityCountResult = {
  count: number | null;
};

type RecentAssignedTaskRow = {
  created_at: string;
  due_at: string | null;
  id: string;
  status: "todo" | "in_progress";
  title: string;
};

type RecentAssignedLeadRow = {
  created_at: string;
  id: string;
  next_follow_up_at: string | null;
  status: "open";
  title: string;
};

export type AccountActivitySummary = {
  activeJobCount: number;
  assignedLeadCount: number;
  openTaskCount: number;
  recentItems: Array<{
    id: string;
    kind: "lead" | "task";
    scheduledAt: string | null;
    title: string;
  }>;
};

export type CurrentAccountSummary = {
  activity: AccountActivitySummary;
  avatarPath: string | null;
  avatarUrl: string | null;
  displayName: string;
  email: string | null;
  fullName: string | null;
  initials: string;
  themeMode: ThemeMode;
  timezone: string;
  userId: string;
  workspaceAccess: {
    name: string;
    role: WorkspaceRole;
    status: "active" | "invited" | "disabled";
  } | null;
};

function getNameFromEmail(email: string | null | undefined) {
  return email?.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? null;
}

function emptyActivitySummary(): AccountActivitySummary {
  return {
    activeJobCount: 0,
    assignedLeadCount: 0,
    openTaskCount: 0,
    recentItems: [],
  };
}

export async function getCurrentAccountSummary(): Promise<CurrentAccountSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const activeWorkspace = await getActiveWorkspace();
  const activeWorkspaceId =
    activeWorkspace.status === "ready" ? activeWorkspace.context.workspace.id : null;

  const [
    profileResult,
    membershipResult,
    leadCountResult,
    jobCountResult,
    taskCountResult,
    recentTasksResult,
    recentLeadsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name,avatar_url,timezone,theme_mode")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>(),
    activeWorkspaceId
      ? supabase
          .from("workspace_members")
          .select("workspace_id,role,status")
          .eq("workspace_id", activeWorkspaceId)
          .eq("user_id", user.id)
          .maybeSingle<WorkspaceMembershipRow>()
      : Promise.resolve({ data: null, error: null }),
    activeWorkspaceId
      ? supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", activeWorkspaceId)
          .eq("assigned_to", user.id)
          .eq("status", "open")
          .returns<ActivityCountResult[]>()
      : Promise.resolve({ count: null, data: null, error: null }),
    activeWorkspaceId
      ? supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", activeWorkspaceId)
          .eq("assigned_to", user.id)
          .in("status", ["scheduled", "in_progress"])
          .returns<ActivityCountResult[]>()
      : Promise.resolve({ count: null, data: null, error: null }),
    activeWorkspaceId
      ? supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", activeWorkspaceId)
          .eq("assigned_to", user.id)
          .in("status", ["todo", "in_progress"])
          .returns<ActivityCountResult[]>()
      : Promise.resolve({ count: null, data: null, error: null }),
    activeWorkspaceId
      ? supabase
          .from("tasks")
          .select("id,title,status,due_at,created_at")
          .eq("workspace_id", activeWorkspaceId)
          .eq("assigned_to", user.id)
          .in("status", ["todo", "in_progress"])
          .order("created_at", { ascending: false })
          .limit(3)
          .returns<RecentAssignedTaskRow[]>()
      : Promise.resolve({ data: null, error: null }),
    activeWorkspaceId
      ? supabase
          .from("leads")
          .select("id,title,status,next_follow_up_at,created_at")
          .eq("workspace_id", activeWorkspaceId)
          .eq("assigned_to", user.id)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(3)
          .returns<RecentAssignedLeadRow[]>()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const profile = profileResult.data;
  const fullName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : null) ||
    null;
  const displayName = fullName || getNameFromEmail(user.email) || "Account";
  const avatarPath = profile?.avatar_url ?? null;
  const avatarUrl = await resolveAccountAvatarUrl({
    avatarPath,
    supabase,
  });
  const recentItems =
    activeWorkspace.status === "ready"
      ? [
          ...(recentTasksResult.data ?? []).map((task) => ({
            id: task.id,
            kind: "task" as const,
            scheduledAt: task.due_at,
            title: task.title,
            updatedAt: task.created_at,
          })),
          ...(recentLeadsResult.data ?? []).map((lead) => ({
            id: lead.id,
            kind: "lead" as const,
            scheduledAt: lead.next_follow_up_at,
            title: lead.title,
            updatedAt: lead.created_at,
          })),
        ]
          .sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() -
              new Date(left.updatedAt).getTime(),
          )
          .slice(0, 3)
          .map(({ updatedAt: _updatedAt, ...item }) => item)
      : [];
  const activity =
    activeWorkspace.status === "ready"
      ? {
          activeJobCount: jobCountResult.count ?? 0,
          assignedLeadCount: leadCountResult.count ?? 0,
          openTaskCount: taskCountResult.count ?? 0,
          recentItems,
        }
      : emptyActivitySummary();

  return {
    activity,
    avatarPath,
    avatarUrl,
    displayName,
    email: user.email ?? null,
    fullName,
    initials: getAccountInitials({
      email: user.email ?? null,
      fullName,
    }),
    themeMode: profile?.theme_mode ?? "system",
    timezone:
      profile?.timezone ??
      (activeWorkspace.status === "ready"
        ? activeWorkspace.context.workspace.timezone
        : "UTC"),
    userId: user.id,
    workspaceAccess:
      activeWorkspace.status === "ready" && membershipResult.data
        ? {
            name: activeWorkspace.context.workspace.name,
            role: membershipResult.data.role,
            status: membershipResult.data.status,
          }
        : null,
  };
}
