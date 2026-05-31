import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import {
  getDefaultRolePermission,
} from "@/lib/permissions/workspace";
import type { User } from "@supabase/supabase-js";
import type {
  ActiveWorkspaceContext,
  WorkspaceRolePermission,
  WorkspaceRole,
} from "@/types/domain";

type WorkspaceMemberRoleRow = {
  role: WorkspaceRole;
};

export type SettingsAccessReady = {
  activeWorkspace: ActiveWorkspaceContext;
  canManageBranding: boolean;
  canManageModules: boolean;
  canManagePipeline: boolean;
  canManageSettings: boolean;
  canViewSettings: boolean;
  role: WorkspaceRole;
  rolePermissions: WorkspaceRolePermission | null;
  status: "ready";
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: User;
};

type SettingsAccessResult =
  | SettingsAccessReady
  | {
      error: {
        code: string;
        message: string;
        status: number;
      };
      status: "error";
    };

export async function getSettingsAccessContext(): Promise<SettingsAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: {
        code: "UNAUTHORIZED",
        message: "Sign in to manage settings.",
        status: 401,
      },
      status: "error",
    };
  }

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return {
      error: {
        code: "NO_ACTIVE_WORKSPACE",
        message:
          activeWorkspace.error ??
          "No active workspace is available for this account.",
        status: activeWorkspace.status === "error" ? 500 : 403,
      },
      status: "error",
    };
  }

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle<WorkspaceMemberRoleRow>();

  if (memberError || !member) {
    return {
      error: {
        code: "SETTINGS_ROLE_LOAD_FAILED",
        message:
          memberError?.message ??
          "Your workspace role could not be verified for settings.",
        status: memberError ? 500 : 403,
      },
      status: "error",
    };
  }

  let rolePermissions: WorkspaceRolePermission | null = null;
  let explicitRolePermissions: WorkspaceRolePermission | null = null;

  if (member.role !== "owner") {
    const { data: permissions } = await supabase
      .from("workspace_role_permissions")
      .select(
        "id,workspace_id,role,can_view_settings,can_edit_basic_settings,can_edit_branding,can_manage_modules,can_manage_pipeline,can_create_leads,can_create_jobs,can_create_tasks,can_create_appointments,can_view_audit_logs,created_at,updated_at",
      )
      .eq("workspace_id", activeWorkspace.context.workspace.id)
      .eq("role", member.role)
      .maybeSingle<WorkspaceRolePermission>();

    explicitRolePermissions = permissions ?? null;
    rolePermissions = permissions ?? getDefaultRolePermission(member.role);
  }

  const canViewSettings =
    member.role === "owner" ||
    rolePermissions?.can_view_settings === true;
  const canManageSettings =
    member.role === "owner" ||
    explicitRolePermissions?.can_edit_basic_settings === true;

  return {
    activeWorkspace: activeWorkspace.context,
    canManageBranding:
      member.role === "owner" ||
      explicitRolePermissions?.can_edit_branding === true,
    canManageModules:
      member.role === "owner" ||
      explicitRolePermissions?.can_manage_modules === true,
    canManagePipeline:
      member.role === "owner" ||
      explicitRolePermissions?.can_manage_pipeline === true,
    canManageSettings,
    canViewSettings,
    role: member.role,
    rolePermissions,
    status: "ready",
    supabase,
    user,
  };
}
