import { getAssignableRoles } from "@/lib/permissions/workspace";
import {
  buildRolePermissionWritePayload,
  listWorkspaceRolePermissionRecords,
} from "@/lib/permissions/rolePermissions";
import { getOwnerAccessContext } from "@/lib/owner/access";
import { isPipelineSchemaPendingMessage } from "@/lib/pipelines/queries";
import type {
  AssignableWorkspaceRole,
  OwnerAuditLog,
  OwnerConsoleOverview,
  PipelineGroup,
  PipelineStage,
  WorkspaceBrandingSettings,
  WorkspaceInvitation,
  WorkspaceMemberWithProfile,
  WorkspaceModuleSettings,
  WorkspaceRolePermission,
  WorkspaceSettingsData,
} from "@/types/domain";

type MemberRow = {
  accepted_at: string | null;
  created_at: string;
  id: string;
  invited_email: string | null;
  role: WorkspaceMemberWithProfile["role"];
  status: WorkspaceMemberWithProfile["status"];
  user_id: string;
  workspace_id: string;
};

type ProfileRow = {
  avatar_url: string | null;
  full_name: string | null;
  id: string;
  last_seen_at: string | null;
};

export const defaultRolePermissions: Record<
  AssignableWorkspaceRole,
  Omit<
    WorkspaceRolePermission,
    "created_at" | "id" | "updated_at" | "workspace_id"
  >
> = {
  admin: {
    can_create_appointments: true,
    can_create_jobs: true,
    can_create_leads: true,
    can_create_tasks: true,
    can_view_automations: true,
    can_edit_basic_settings: true,
    can_edit_branding: false,
    can_manage_modules: false,
    can_manage_pipeline: true,
    can_view_audit_logs: false,
    can_view_settings: true,
    role: "admin",
  },
  manager: {
    can_create_appointments: true,
    can_create_jobs: true,
    can_create_leads: true,
    can_create_tasks: true,
    can_view_automations: true,
    can_edit_basic_settings: false,
    can_edit_branding: false,
    can_manage_modules: false,
    can_manage_pipeline: false,
    can_view_audit_logs: false,
    can_view_settings: true,
    role: "manager",
  },
  staff: {
    can_create_appointments: true,
    can_create_jobs: true,
    can_create_leads: true,
    can_create_tasks: true,
    can_view_automations: false,
    can_edit_basic_settings: false,
    can_edit_branding: false,
    can_manage_modules: false,
    can_manage_pipeline: false,
    can_view_audit_logs: false,
    can_view_settings: true,
    role: "staff",
  },
  viewer: {
    can_create_appointments: false,
    can_create_jobs: false,
    can_create_leads: false,
    can_create_tasks: false,
    can_view_automations: false,
    can_edit_basic_settings: false,
    can_edit_branding: false,
    can_manage_modules: false,
    can_manage_pipeline: false,
    can_view_audit_logs: false,
    can_view_settings: false,
    role: "viewer",
  },
};

async function ensureRolePermissions(
  access: Awaited<ReturnType<typeof getOwnerAccessContext>> & {
    status: "ready";
  },
) {
  const workspaceId = access.activeWorkspace.workspace.id;
  const { data, error, supportsAutomationsPermission } =
    await listWorkspaceRolePermissionRecords(access.supabase, workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  const existingRoles = new Set((data ?? []).map((row) => row.role));
  const missingRows = getAssignableRoles()
    .filter((role) => !existingRoles.has(role))
    .map((role) => ({
      ...buildRolePermissionWritePayload(
        {
          ...defaultRolePermissions[role],
          workspace_id: workspaceId,
        },
        supportsAutomationsPermission,
      ),
    }));

  if (missingRows.length > 0) {
    const { error: insertError } = await access.supabase
      .from("workspace_role_permissions")
      .insert(missingRows);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const {
    data: refreshed,
    error: refreshedError,
  } = await listWorkspaceRolePermissionRecords(access.supabase, workspaceId);

  if (refreshedError) {
    throw new Error(refreshedError.message);
  }

  return refreshed ?? [];
}

async function getMembers(access: Awaited<ReturnType<typeof getOwnerAccessContext>> & { status: "ready" }) {
  const workspaceId = access.activeWorkspace.workspace.id;
  const { data: members, error: membersError } = await access.supabase
    .from("workspace_members")
    .select("id,workspace_id,user_id,role,status,invited_email,accepted_at,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .returns<MemberRow[]>();

  if (membersError) {
    throw new Error(membersError.message);
  }

  const userIds = (members ?? []).map((member) => member.user_id);
  const { data: profiles, error: profilesError } =
    userIds.length > 0
      ? await access.supabase
          .from("profiles")
          .select("id,full_name,avatar_url,last_seen_at")
          .in("id", userIds)
          .returns<ProfileRow[]>()
      : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return (members ?? []).map((member): WorkspaceMemberWithProfile => {
    const profile = profilesById.get(member.user_id);

    return {
      ...member,
      last_seen_at: profile?.last_seen_at ?? null,
      user: {
        avatar_url: profile?.avatar_url ?? null,
        email: member.invited_email,
        full_name: profile?.full_name ?? null,
        id: member.user_id,
      },
    };
  });
}

export async function getWorkspaceMembersGroupedByRole() {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return null;
  }

  return getMembers(access);
}

export async function getWorkspaceInvitations() {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return null;
  }

  const { data, error } = await access.supabase
    .from("workspace_invitations")
    .select(
      "id,workspace_id,invited_email,role,status,invited_by,accepted_by,accepted_at,expires_at,created_at,updated_at",
    )
    .eq("workspace_id", access.activeWorkspace.workspace.id)
    .order("created_at", { ascending: false })
    .returns<WorkspaceInvitation[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getWorkspaceRolePermissions() {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return null;
  }

  return ensureRolePermissions(access);
}

export async function getWorkspaceAuditLogs() {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return null;
  }

  const { data, error } = await access.supabase
    .from("audit_logs")
    .select("id,workspace_id,actor_user_id,action,entity_type,entity_id,metadata,created_at")
    .eq("workspace_id", access.activeWorkspace.workspace.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<OwnerAuditLog[]>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getOwnerWorkspaceSettings(): Promise<WorkspaceSettingsData | null> {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return null;
  }

  const [
    { data: pipelineGroups, error: pipelineGroupsError },
    { data: pipelineStages, error: pipelineStagesError },
  ] = await Promise.all([
    access.supabase
      .from("pipeline_groups")
      .select(
        "id,workspace_id,name,description,entity_type,order_index,is_default,created_by,updated_by,created_at,updated_at",
      )
      .eq("workspace_id", access.activeWorkspace.workspace.id)
      .order("entity_type", { ascending: true })
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<PipelineGroup[]>(),
    access.supabase
      .from("pipeline_stages")
      .select(
        "id,workspace_id,pipeline_group_id,entity_type,name,color,order_index,is_closed,is_won,is_lost,created_at,updated_at",
      )
      .eq("workspace_id", access.activeWorkspace.workspace.id)
      .order("entity_type", { ascending: true })
      .order("order_index", { ascending: true })
      .returns<PipelineStage[]>(),
  ]);

  const isPipelineSchemaPending =
    isPipelineSchemaPendingMessage(pipelineGroupsError?.message) ||
    isPipelineSchemaPendingMessage(pipelineStagesError?.message);

  if ((pipelineGroupsError || pipelineStagesError) && !isPipelineSchemaPending) {
    throw new Error(
      pipelineGroupsError?.message ?? pipelineStagesError?.message,
    );
  }

  if (isPipelineSchemaPending) {
    console.warn("Owner workspace settings loaded without pipeline metadata", {
      pipelineGroupsError: pipelineGroupsError?.message ?? null,
      pipelineStagesError: pipelineStagesError?.message ?? null,
    });
  }

  return {
    branding: access.activeWorkspace.branding as WorkspaceBrandingSettings | null,
    canManageBranding: true,
    canManageModules: true,
    canManagePipeline: true,
    canManageSettings: true,
    canViewMemberVisibility: true,
    canViewSettings: true,
    currentUserRole: access.activeWorkspace.role,
    modules: access.activeWorkspace.modules as WorkspaceModuleSettings | null,
    pipelineGroups: isPipelineSchemaPending ? [] : (pipelineGroups ?? []),
    pipelineStages: isPipelineSchemaPending ? [] : (pipelineStages ?? []),
    rolePermissions: null,
    teamMembers: [],
    workspace: access.activeWorkspace.workspace,
  };
}

export async function getOwnerConsoleOverview(): Promise<OwnerConsoleOverview | null> {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return null;
  }

  const [members, invitations, permissions, auditLogs, pipelineGroups, pipelineStages] = await Promise.all([
    getMembers(access),
    getWorkspaceInvitations(),
    ensureRolePermissions(access),
    getWorkspaceAuditLogs(),
    access.supabase
      .from("pipeline_groups")
      .select("id")
      .eq("workspace_id", access.activeWorkspace.workspace.id),
    access.supabase
      .from("pipeline_stages")
      .select("id")
      .eq("workspace_id", access.activeWorkspace.workspace.id),
  ]);
  const isPipelineSchemaPending =
    isPipelineSchemaPendingMessage(pipelineGroups.error?.message) ||
    isPipelineSchemaPendingMessage(pipelineStages.error?.message);

  if ((pipelineGroups.error || pipelineStages.error) && !isPipelineSchemaPending) {
    throw new Error(
      pipelineGroups.error?.message ?? pipelineStages.error?.message,
    );
  }

  if (isPipelineSchemaPending) {
    console.warn("Owner console overview loaded without pipeline metadata", {
      pipelineGroupsError: pipelineGroups.error?.message ?? null,
      pipelineStagesError: pipelineStages.error?.message ?? null,
    });
  }
  const modules = access.activeWorkspace.modules;
  const branding = access.activeWorkspace.branding;
  const enabledModuleCount = modules
    ? [
        modules.leads_enabled,
        modules.jobs_enabled,
        modules.tasks_enabled,
        modules.calendar_enabled,
        modules.reports_enabled,
        modules.automations_enabled,
        modules.ai_enabled,
        modules.invoices_enabled,
      ].filter(Boolean).length
    : 0;
  const activeMemberCount = members.filter((member) => member.status === "active").length;
  const brandingFullyConfigured = Boolean(
    branding &&
      branding.app_name.trim().length > 0 &&
      branding.logo_url &&
      branding.icon_url &&
      branding.primary_color &&
      branding.accent_color,
  );

  return {
    accessRulesConfigured: permissions.length > 0,
    auditLogCount: auditLogs?.length ?? 0,
    brandingFullyConfigured,
    brandingConfigured: Boolean(access.activeWorkspace.branding),
    enabledModuleCount,
    latestAuditLogs: (auditLogs ?? []).slice(0, 5),
    memberCount: members.length,
    pendingInvitationCount: (invitations ?? []).filter(
      (invitation) => invitation.status === "pending",
    ).length,
    pipelineGroupCount: isPipelineSchemaPending ? 0 : (pipelineGroups.data?.length ?? 0),
    pipelineStageCount: isPipelineSchemaPending ? 0 : (pipelineStages.data?.length ?? 0),
    rolePermissionCount: permissions.length,
    teamReady: activeMemberCount > 1,
    workspace: access.activeWorkspace.workspace,
  };
}
