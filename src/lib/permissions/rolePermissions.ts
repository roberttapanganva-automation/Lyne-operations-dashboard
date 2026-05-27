import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getDefaultRolePermission } from "@/lib/permissions/workspace";
import type {
  AssignableWorkspaceRole,
  WorkspaceRolePermission,
} from "@/types/domain";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type RolePermissionRow = Omit<WorkspaceRolePermission, "can_view_automations"> & {
  can_view_automations?: boolean;
};

type PermissionWritePayload = Omit<
  WorkspaceRolePermission,
  "created_at" | "id" | "updated_at"
>;

export const workspaceRolePermissionSelectLegacy =
  "id,workspace_id,role,can_view_settings,can_edit_basic_settings,can_edit_branding,can_manage_modules,can_manage_pipeline,can_create_leads,can_create_jobs,can_create_tasks,can_create_appointments,can_view_audit_logs,created_at,updated_at";

export const workspaceRolePermissionSelect =
  "id,workspace_id,role,can_view_settings,can_edit_basic_settings,can_edit_branding,can_manage_modules,can_manage_pipeline,can_create_leads,can_create_jobs,can_create_tasks,can_create_appointments,can_view_automations,can_view_audit_logs,created_at,updated_at";

function normalizeRolePermissionRow(
  row: RolePermissionRow,
): WorkspaceRolePermission {
  return {
    ...row,
    can_view_automations:
      row.can_view_automations ??
      getDefaultRolePermission(row.role)?.can_view_automations ??
      false,
  };
}

export function isMissingAutomationsPermissionColumn(
  message: string | null | undefined,
) {
  return Boolean(
    message?.includes("workspace_role_permissions.can_view_automations") &&
      message.includes("does not exist"),
  );
}

export function buildRolePermissionWritePayload(
  permission: PermissionWritePayload,
  supportsAutomationsPermission: boolean,
) {
  if (supportsAutomationsPermission) {
    return permission;
  }

  const { can_view_automations, ...legacyPayload } = permission;
  void can_view_automations;

  return legacyPayload;
}

export async function getWorkspaceRolePermissionRecord(
  supabase: ServerSupabaseClient,
  workspaceId: string,
  role: AssignableWorkspaceRole,
) {
  const execute = async (selectClause: string) =>
    supabase
      .from("workspace_role_permissions")
      .select(selectClause)
      .eq("workspace_id", workspaceId)
      .eq("role", role)
      .maybeSingle<RolePermissionRow>();

  const { data, error } = await execute(workspaceRolePermissionSelect);

  if (error && isMissingAutomationsPermissionColumn(error.message)) {
    const legacyResult = await execute(workspaceRolePermissionSelectLegacy);

    return {
      data: legacyResult.data ? normalizeRolePermissionRow(legacyResult.data) : null,
      error: legacyResult.error,
      supportsAutomationsPermission: false,
    };
  }

  return {
    data: data ? normalizeRolePermissionRow(data) : null,
    error,
    supportsAutomationsPermission: true,
  };
}

export async function listWorkspaceRolePermissionRecords(
  supabase: ServerSupabaseClient,
  workspaceId: string,
) {
  const execute = async (selectClause: string) =>
    supabase
      .from("workspace_role_permissions")
      .select(selectClause)
      .eq("workspace_id", workspaceId)
      .order("role", { ascending: true })
      .returns<RolePermissionRow[]>();

  const { data, error } = await execute(workspaceRolePermissionSelect);

  if (error && isMissingAutomationsPermissionColumn(error.message)) {
    const legacyResult = await execute(workspaceRolePermissionSelectLegacy);

    return {
      data: (legacyResult.data ?? []).map(normalizeRolePermissionRow),
      error: legacyResult.error,
      supportsAutomationsPermission: false,
    };
  }

  return {
    data: (data ?? []).map(normalizeRolePermissionRow),
    error,
    supportsAutomationsPermission: true,
  };
}
