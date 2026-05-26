import type {
  AssignableWorkspaceRole,
  WorkspaceRolePermission,
  WorkspaceRole,
} from "@/types/domain";

export function canManageWorkspaceSettings(role: WorkspaceRole | null) {
  return role === "owner" || role === "admin";
}

export function canManageOperations(role: WorkspaceRole | null) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "staff"
  );
}

export function canViewWorkspace(role: WorkspaceRole | null) {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "manager" ||
    role === "staff" ||
    role === "viewer"
  );
}

export function canViewReports(role: WorkspaceRole | null) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canCreateOperationalRecords(role: WorkspaceRole | null) {
  return canManageOperations(role);
}

export function canEditOperationalRecords(role: WorkspaceRole | null) {
  return canManageOperations(role);
}

export function canDeleteOperationalRecords(role: WorkspaceRole | null) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canAssignOperationalRecords(role: WorkspaceRole | null) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function canAccessOwnerConsole(role: WorkspaceRole | null) {
  return role === "owner";
}

export function canManageTeam(role: WorkspaceRole | null) {
  return role === "owner";
}

export function canInviteMembers(role: WorkspaceRole | null) {
  return role === "owner";
}

export function canManageMemberRoles(role: WorkspaceRole | null) {
  return role === "owner";
}

export function canManageOwnerControls(role: WorkspaceRole | null) {
  return role === "owner";
}

export function getAssignableRoles(): AssignableWorkspaceRole[] {
  return ["admin", "manager", "staff", "viewer"];
}

export function getDefaultRolePermission(
  role: WorkspaceRole | null,
): WorkspaceRolePermission | null {
  if (role === "admin") {
    return {
      can_create_appointments: true,
      can_create_jobs: true,
      can_create_leads: true,
      can_create_tasks: true,
      can_edit_basic_settings: true,
      can_edit_branding: false,
      can_manage_modules: false,
      can_manage_pipeline: true,
      can_view_audit_logs: false,
      can_view_settings: true,
      created_at: "",
      id: "",
      role,
      updated_at: "",
      workspace_id: "",
    };
  }

  if (role === "manager" || role === "staff") {
    return {
      can_create_appointments: true,
      can_create_jobs: true,
      can_create_leads: true,
      can_create_tasks: true,
      can_edit_basic_settings: false,
      can_edit_branding: false,
      can_manage_modules: false,
      can_manage_pipeline: false,
      can_view_audit_logs: false,
      can_view_settings: true,
      created_at: "",
      id: "",
      role,
      updated_at: "",
      workspace_id: "",
    };
  }

  if (role === "viewer") {
    return {
      can_create_appointments: false,
      can_create_jobs: false,
      can_create_leads: false,
      can_create_tasks: false,
      can_edit_basic_settings: false,
      can_edit_branding: false,
      can_manage_modules: false,
      can_manage_pipeline: false,
      can_view_audit_logs: false,
      can_view_settings: false,
      created_at: "",
      id: "",
      role,
      updated_at: "",
      workspace_id: "",
    };
  }

  return null;
}
