export type WorkspaceStatus = "active" | "trial" | "suspended";

export type ThemeMode = "system" | "light" | "dark";

export type WorkspaceRole = "owner" | "admin" | "manager" | "staff" | "viewer";

export type AssignableWorkspaceRole = Exclude<WorkspaceRole, "owner">;

export type MemberActivityStatus = "online" | "recently_active" | "offline";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  owner_id: string;
  status: WorkspaceStatus;
  currency_code: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceBranding = {
  workspace_id: string;
  app_name: string;
  logo_url: string | null;
  icon_url: string | null;
  primary_color: string;
  accent_color: string;
  login_heading: string | null;
  login_subtext: string | null;
  theme_mode: ThemeMode;
  created_at: string;
  updated_at: string;
};

export type WorkspaceModules = {
  workspace_id: string;
  leads_enabled: boolean;
  jobs_enabled: boolean;
  tasks_enabled: boolean;
  calendar_enabled: boolean;
  reports_enabled: boolean;
  automations_enabled: boolean;
  ai_enabled: boolean;
  invoices_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkspaceBrandingSettings = WorkspaceBranding;

export type BrandingColorPreset = {
  accent_color: string;
  label: string;
  primary_color: string;
};

export type UserThemePreference = {
  effectiveThemeMode: ThemeMode;
  userThemeMode: ThemeMode;
  workspaceDefaultThemeMode: ThemeMode;
};

export type UserPreferences = {
  date_format: "MMM d, yyyy" | "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd";
  default_landing_page:
    | "/dashboard"
    | "/leads"
    | "/jobs"
    | "/tasks"
    | "/calendar"
    | "/pipelines"
    | "/automations";
  in_app_notifications_enabled: boolean;
  reduce_motion: boolean;
  table_density: "compact" | "comfortable" | "spacious";
  time_format: "12h" | "24h";
  timezone: string;
  week_starts_on: "sunday" | "monday";
};

export type WorkspaceModuleSettings = WorkspaceModules;

export type PipelineEntityType = "lead" | "job";

export type Client = {
  address: string | null;
  company_name: string | null;
  created_at: string;
  created_by: string | null;
  email: string | null;
  id: string;
  name: string;
  notes: string | null;
  phone: string | null;
  source: string | null;
  updated_at: string;
  updated_by: string | null;
  workspace_id: string;
};

export type ClientSummary = Pick<
  Client,
  "company_name" | "email" | "id" | "name" | "phone" | "source"
>;

export type ClientListItem = Client & {
  completed_job_count: number;
  last_activity_at: string | null;
  latest_lead_activity_at: string | null;
  latest_completed_job_at: string | null;
  linked_lead_count: number;
  relationship_label: "Customer" | "Repeat customer" | "Saved contact";
};

export type LeadWithClient = {
  client: ClientSummary | null;
  client_id: string | null;
};

export type PipelineGroup = {
  created_at: string;
  created_by: string | null;
  description: string | null;
  entity_type: PipelineEntityType;
  id: string;
  is_default: boolean;
  name: string;
  order_index: number;
  updated_at: string;
  updated_by: string | null;
  workspace_id: string;
};

export type PipelineStage = {
  color: string;
  created_at: string;
  entity_type: PipelineEntityType;
  id: string;
  is_closed: boolean;
  is_lost: boolean;
  is_won: boolean;
  name: string;
  order_index: number;
  pipeline_group_id: string;
  updated_at: string;
  workspace_id: string;
};

export type PipelineBoardCard = {
  client: {
    email: string | null;
    name: string | null;
  } | null;
  entity_type: PipelineEntityType;
  estimated_value: number | null;
  id: string;
  location: string | null;
  next_follow_up_at: string | null;
  payment_status: "unpaid" | "partial" | "paid" | "refunded" | "not_applicable" | null;
  priority: "low" | "normal" | "high" | "urgent" | null;
  scheduled_start: string | null;
  service_type: string | null;
  source: string | null;
  stage_id: string | null;
  status: string;
  title: string;
};

export type PipelineBoardStage = PipelineStage & {
  card_count: number;
  cards: PipelineBoardCard[];
  total_estimated_value: number;
};

export type PipelineBoard = {
  can_create_leads: boolean;
  can_move_cards: boolean;
  entity_type: PipelineEntityType | null;
  groups: PipelineGroup[];
  selected_group: PipelineGroup | null;
  stages: PipelineBoardStage[];
};

export type PipelineMoveRequest = {
  entity_type: PipelineEntityType;
  record_id: string;
  target_stage_id: string;
};

export type AssignmentTargetType = "lead" | "job" | "task";

export type AssignmentRule = {
  auto_create_task: boolean;
  created_at: string;
  created_by: string | null;
  enabled: boolean;
  entity_type: AssignmentTargetType;
  id: string;
  last_assigned_member_id: string | null;
  notify_assignee: boolean;
  strategy: "round_robin";
  task_due_offset_minutes: number;
  updated_at: string;
  updated_by: string | null;
  workspace_id: string;
};

export type AssignmentRuleMember = {
  active: boolean;
  assignment_rule_id: string;
  created_at: string;
  id: string;
  order_index: number;
  updated_at: string;
  workspace_id: string;
  workspace_member_id: string;
};

export type AssignableWorkspaceMember = {
  display_name: string;
  email: string | null;
  full_name: string | null;
  id: string;
  role: "owner" | "admin" | "manager" | "staff";
  status: "active";
  user_id: string;
  workspace_id: string;
};

export type AssignmentResult = {
  assigned_member: AssignableWorkspaceMember | null;
  assigned_member_id: string | null;
  auto_created_task_id?: string | null;
  error?: string | null;
  notify_assignee?: boolean;
  ok: boolean;
  record_id: string;
  target_type: AssignmentTargetType;
  warning?: string | null;
};

export type WorkspaceSettingsData = {
  branding: WorkspaceBrandingSettings | null;
  canManageSettings: boolean;
  canManageBranding: boolean;
  canManageModules: boolean;
  canManagePipeline: boolean;
  canViewMemberVisibility: boolean;
  canViewSettings: boolean;
  currentUserRole: WorkspaceRole;
  modules: WorkspaceModuleSettings | null;
  pipelineGroups: PipelineGroup[];
  pipelineStages: PipelineStage[];
  rolePermissions: WorkspaceRolePermission | null;
  teamMembers: WorkspaceMemberWithProfile[];
  workspace: Workspace;
};

export type ActiveWorkspaceContext = {
  branding: WorkspaceBranding | null;
  modules: WorkspaceModules | null;
  role: WorkspaceRole;
  rolePermissions: WorkspaceRolePermission | null;
  workspace: Workspace;
};

export type WorkspaceInvitation = {
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
  expires_at: string | null;
  id: string;
  invited_by: string | null;
  invited_email: string;
  role: AssignableWorkspaceRole;
  status: "pending" | "accepted" | "cancelled" | "expired";
  updated_at: string;
  workspace_id: string;
};

export type InviteAcceptanceDisplay = Pick<
  WorkspaceInvitation,
  "expires_at" | "id" | "invited_email" | "role" | "status"
> & {
  workspaceName: string | null;
};

export type InviteAcceptanceState =
  | {
      invitationId: string;
      invitation?: undefined;
      message: string;
      status: "unauthenticated" | "invalid" | "email_mismatch";
    }
  | {
      invitation: InviteAcceptanceDisplay;
      invitationId: string;
      message: string;
      status: "pending" | "accepted" | "cancelled" | "expired";
    };

export type InviteAcceptanceResult = {
  invitationId: string;
  role: AssignableWorkspaceRole;
  status: "accepted";
  workspaceId: string;
};

export type WorkspaceRolePermission = {
  can_create_appointments: boolean;
  can_create_jobs: boolean;
  can_create_leads: boolean;
  can_create_tasks: boolean;
  can_edit_basic_settings: boolean;
  can_edit_branding: boolean;
  can_manage_modules: boolean;
  can_manage_pipeline: boolean;
  can_view_audit_logs: boolean;
  can_view_settings: boolean;
  created_at: string;
  id: string;
  role: AssignableWorkspaceRole;
  updated_at: string;
  workspace_id: string;
};

export type WorkspaceMemberWithProfile = {
  accepted_at: string | null;
  created_at: string;
  id: string;
  invited_email: string | null;
  last_seen_at: string | null;
  role: WorkspaceRole;
  status: "active" | "invited" | "disabled";
  user: {
    avatar_url: string | null;
    email: string | null;
    full_name: string | null;
    id: string;
  };
  user_id: string;
  workspace_id: string;
};

export type OwnerAuditLog = {
  action: string;
  actor_user_id: string | null;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  id: string;
  metadata: Record<string, unknown> | null;
  workspace_id: string;
};

export type OwnerConsoleOverview = {
  accessRulesConfigured: boolean;
  auditLogCount: number;
  brandingFullyConfigured: boolean;
  brandingConfigured: boolean;
  enabledModuleCount: number;
  latestAuditLogs: OwnerAuditLog[];
  memberCount: number;
  pendingInvitationCount: number;
  pipelineGroupCount: number;
  pipelineStageCount: number;
  rolePermissionCount: number;
  teamReady: boolean;
  workspace: Workspace;
};

export type DashboardKpis = {
  currencyCode: string;
  estimatedRevenueThisMonth: number;
  jobsBookedThisMonth: number;
  newLeadsThisMonth: number;
  overdueTasks: number;
};

export type DashboardAgendaItem = {
  ends_at: string | null;
  id: string;
  location: string | null;
  starts_at: string;
  status: string;
  title: string;
  type: "appointment" | "job";
};

export type DashboardTaskItem = {
  created_at: string;
  due_at: string | null;
  id: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "todo" | "in_progress" | "done" | "cancelled";
  title: string;
};

export type DashboardTaskSummary = {
  completedTasks: number;
  overdueTasks: number;
  pendingTasks: number;
  recentTasks: DashboardTaskItem[];
  totalTasks: number;
};

export type DashboardPipelineStageSummary = {
  color: string;
  count: number;
  entity_type: PipelineEntityType;
  id: string;
  name: string;
  order_index: number;
};

export type PipelineBoardSummary = {
  entity_type: PipelineEntityType | null;
  group: PipelineGroup | null;
  has_configured_stages: boolean;
  has_error: boolean;
  stages: DashboardPipelineStageSummary[];
  total_cards: number;
  total_estimated_value: number;
};

export type DashboardRevenueSummary = {
  completedActualRevenue: number;
  currencyCode: string;
  estimatedRevenueAllOpenJobs: number;
  estimatedRevenueScheduledJobs: number;
  estimatedRevenueThisMonth: number;
  jobCount: number;
};

export type DashboardActivityItem = {
  created_at: string;
  id: string;
  icon: string;
  message: string;
  status: string | null;
  title: string;
  type: "automation" | "audit";
};

export type AutomationLogStatus =
  | "success"
  | "failed"
  | "pending"
  | "skipped"
  | "retrying";

export type AutomationLog = {
  automation_type: string;
  created_at: string;
  error_message: string | null;
  id: string;
  message: string;
  payload: Record<string, unknown> | null;
  related_id: string | null;
  related_type: string;
  status: AutomationLogStatus;
  workspace_id: string;
};

export type DashboardOverview = {
  agendaItems: DashboardAgendaItem[];
  kpis: DashboardKpis;
  pipeline: PipelineBoardSummary;
  recentActivity: DashboardActivityItem[];
  revenue: DashboardRevenueSummary;
  taskSummary: DashboardTaskSummary;
  workspace: {
    currencyCode: string;
    id: string;
    name: string;
  };
};
