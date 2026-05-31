import { buildAuditActivityLookups, presentAuditActivity } from "@/lib/activity/presentation";
import {
  formatAutomationEventName,
  getAutomationSourceLabel,
  sanitizeAutomationErrorMessage,
} from "@/lib/automations/presentation";
import { createClient } from "@/lib/supabase/server";
import { getPipelinePreviewForDashboard } from "@/lib/pipelines/queries";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type {
  DashboardActivityItem,
  DashboardAgendaItem,
  DashboardOverview,
  DashboardTaskItem,
} from "@/types/domain";

type LeadRow = {
  created_at: string;
  id: string;
  stage_id: string | null;
};

type JobRow = {
  actual_value: number | string | null;
  created_at: string;
  estimated_value: number | string;
  id: string;
  location: string | null;
  scheduled_end: string | null;
  scheduled_start: string | null;
  stage_id: string | null;
  status: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
  title: string;
};

type TaskRow = DashboardTaskItem;

type AppointmentRow = {
  ends_at: string | null;
  id: string;
  location: string | null;
  starts_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  title: string;
};

type AutomationLogRow = {
  automation_type: string;
  created_at: string;
  error_message: string | null;
  id: string;
  message: string;
  payload: Record<string, unknown> | null;
  related_type: string;
  status: "success" | "failed" | "pending" | "skipped" | "retrying";
};

type AuditLogRow = {
  action: string;
  actor_user_id: string | null;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  id: string;
  metadata: Record<string, unknown> | null;
  workspace_id: string;
};

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getDateRanges(now = new Date()) {
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const startOfToday = startOfLocalDay(now);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  return {
    now,
    startOfMonth,
    startOfNextMonth,
    startOfToday,
    startOfTomorrow,
  };
}

function isWithinRange(value: string | null, start: Date, end: Date) {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();

  return timestamp >= start.getTime() && timestamp < end.getTime();
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === "number" ? value : Number(value);
}

function isTaskOverdue(task: TaskRow, now: Date) {
  if (!task.due_at || task.status === "done" || task.status === "cancelled") {
    return false;
  }

  return new Date(task.due_at).getTime() < now.getTime();
}

function dateForTaskSort(task: TaskRow) {
  return new Date(task.due_at ?? task.created_at).getTime();
}

function buildAgendaItems({
  appointments,
  jobs,
}: {
  appointments: AppointmentRow[];
  jobs: JobRow[];
}): DashboardAgendaItem[] {
  const appointmentItems = appointments.map((appointment) => ({
    ends_at: appointment.ends_at,
    id: appointment.id,
    location: appointment.location,
    starts_at: appointment.starts_at,
    status: appointment.status,
    title: appointment.title,
    type: "appointment" as const,
  }));

  const jobItems = jobs
    .filter((job) => job.scheduled_start)
    .map((job) => ({
      ends_at: job.scheduled_end,
      id: job.id,
      location: job.location,
      starts_at: job.scheduled_start as string,
      status: job.status,
      title: job.title,
      type: "job" as const,
    }));

  return [...appointmentItems, ...jobItems].sort(
    (first, second) =>
      new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime(),
  );
}

async function buildActivityItems({
  auditLogs,
  automationLogs,
  supabase,
}: {
  auditLogs: AuditLogRow[];
  automationLogs: AutomationLogRow[];
  supabase: Awaited<ReturnType<typeof createClient>>;
}): Promise<DashboardActivityItem[]> {
  const automationItems = automationLogs.map((log) => ({
    category:
      log.automation_type.includes("assigned") ||
      log.automation_type.includes("assignment")
        ? "Assignments"
        : "Automation",
    created_at: log.created_at,
    id: log.id,
    icon: "automation",
    message: sanitizeAutomationErrorMessage(log.error_message) ?? log.message,
    source: getAutomationSourceLabel(log),
    status: log.status,
    title: formatAutomationEventName(log.automation_type),
    type: "automation" as const,
  }));

  const auditLookups = await buildAuditActivityLookups(supabase, auditLogs);
  const auditItems = auditLogs.map((log) => {
    const presentation = presentAuditActivity(log, auditLookups);

    return {
      created_at: log.created_at,
      id: log.id,
      icon: presentation.icon,
      category: presentation.category,
      message: presentation.description,
      source: "Audit",
      status: null,
      title: presentation.title,
      type: "audit" as const,
    };
  });

  return [...automationItems, ...auditItems]
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() -
        new Date(first.created_at).getTime(),
    )
    .slice(0, 8);
}

function createEmptyDashboardOverview(
  workspace: DashboardOverview["workspace"],
): DashboardOverview {
  return {
    agendaItems: [],
    kpis: {
      currencyCode: workspace.currencyCode,
      estimatedRevenueThisMonth: 0,
      jobsBookedThisMonth: 0,
      newLeadsThisMonth: 0,
      overdueTasks: 0,
    },
    pipeline: {
      entity_type: null,
      group: null,
      has_configured_stages: false,
      has_error: false,
      stages: [],
      total_cards: 0,
      total_estimated_value: 0,
    },
    recentActivity: [],
    revenue: {
      completedActualRevenue: 0,
      currencyCode: workspace.currencyCode,
      estimatedRevenueAllOpenJobs: 0,
      estimatedRevenueScheduledJobs: 0,
      estimatedRevenueThisMonth: 0,
      jobCount: 0,
    },
    taskSummary: {
      completedTasks: 0,
      overdueTasks: 0,
      pendingTasks: 0,
      recentTasks: [],
      totalTasks: 0,
    },
    workspace,
  };
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return createEmptyDashboardOverview({
      currencyCode: "USD",
      id: "",
      name: "",
    });
  }

  const supabase = await createClient();
  const workspace = {
    currencyCode: activeWorkspace.context.workspace.currency_code ?? "USD",
    id: activeWorkspace.context.workspace.id,
    name: activeWorkspace.context.workspace.name,
  };
  const workspaceId = workspace.id;
  const {
    now,
    startOfMonth,
    startOfNextMonth,
    startOfToday,
    startOfTomorrow,
  } = getDateRanges();

  const [
    leadsResult,
    jobsResult,
    tasksResult,
    appointmentsResult,
    automationLogsResult,
    auditLogsResult,
    pipelinePreview,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,stage_id,created_at")
      .eq("workspace_id", workspaceId)
      .returns<LeadRow[]>(),
    supabase
      .from("jobs")
      .select(
        "id,title,stage_id,scheduled_start,scheduled_end,location,estimated_value,actual_value,status,created_at",
      )
      .eq("workspace_id", workspaceId)
      .returns<JobRow[]>(),
    supabase
      .from("tasks")
      .select("id,title,due_at,priority,status,created_at")
      .eq("workspace_id", workspaceId)
      .returns<TaskRow[]>(),
    supabase
      .from("appointments")
      .select("id,title,starts_at,ends_at,location,status")
      .eq("workspace_id", workspaceId)
      .gte("starts_at", startOfToday.toISOString())
      .lt("starts_at", startOfTomorrow.toISOString())
      .order("starts_at", { ascending: true })
      .returns<AppointmentRow[]>(),
    supabase
      .from("automation_logs")
      .select("id,automation_type,related_type,status,message,payload,error_message,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AutomationLogRow[]>(),
    supabase
      .from("audit_logs")
      .select("id,workspace_id,action,actor_user_id,entity_id,entity_type,metadata,created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<AuditLogRow[]>(),
    getPipelinePreviewForDashboard(),
  ]);

  const fatalError =
    leadsResult.error ??
    jobsResult.error ??
    tasksResult.error ??
    appointmentsResult.error ??
    automationLogsResult.error ??
    auditLogsResult.error;

  if (fatalError) {
    throw new Error(fatalError.message);
  }

  const leads = leadsResult.data ?? [];
  const jobs = jobsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const appointments = appointmentsResult.data ?? [];
  const automationLogs = automationLogsResult.data ?? [];
  const auditLogs = auditLogsResult.data ?? [];

  const activeJobs = jobs.filter((job) => job.status !== "cancelled");
  const jobsBookedThisMonth = activeJobs.filter(
    (job) =>
      isWithinRange(job.created_at, startOfMonth, startOfNextMonth) ||
      isWithinRange(job.scheduled_start, startOfMonth, startOfNextMonth),
  ).length;
  const estimatedRevenueThisMonth = activeJobs
    .filter((job) =>
      job.scheduled_start
        ? isWithinRange(job.scheduled_start, startOfMonth, startOfNextMonth)
        : isWithinRange(job.created_at, startOfMonth, startOfNextMonth),
    )
    .reduce((total, job) => total + toNumber(job.estimated_value), 0);
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task, now)).length;
  const todayJobs = jobs.filter((job) =>
    isWithinRange(job.scheduled_start, startOfToday, startOfTomorrow),
  );
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const pendingTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  ).length;
  const recentTasks = [...tasks].sort(
    (first, second) => dateForTaskSort(first) - dateForTaskSort(second),
  );
  const openJobs = jobs.filter(
    (job) => job.status !== "completed" && job.status !== "cancelled",
  );
  const scheduledJobs = jobs.filter(
    (job) => job.status === "scheduled" && Boolean(job.scheduled_start),
  );
  const completedActualRevenue = jobs
    .filter((job) => job.status === "completed" && job.actual_value !== null)
    .reduce((total, job) => total + toNumber(job.actual_value), 0);

  return {
    agendaItems: buildAgendaItems({
      appointments,
      jobs: todayJobs,
    }),
    kpis: {
      currencyCode: workspace.currencyCode,
      estimatedRevenueThisMonth,
      jobsBookedThisMonth,
      newLeadsThisMonth: leads.filter((lead) =>
        isWithinRange(lead.created_at, startOfMonth, startOfNextMonth),
      ).length,
      overdueTasks,
    },
    pipeline: pipelinePreview,
    recentActivity: await buildActivityItems({
      auditLogs,
      automationLogs,
      supabase,
    }),
    revenue: {
      completedActualRevenue,
      currencyCode: workspace.currencyCode,
      estimatedRevenueAllOpenJobs: openJobs.reduce(
        (total, job) => total + toNumber(job.estimated_value),
        0,
      ),
      estimatedRevenueScheduledJobs: scheduledJobs.reduce(
        (total, job) => total + toNumber(job.estimated_value),
        0,
      ),
      estimatedRevenueThisMonth,
      jobCount: jobs.length,
    },
    taskSummary: {
      completedTasks,
      overdueTasks,
      pendingTasks,
      recentTasks: recentTasks.slice(0, 5),
      totalTasks: tasks.length,
    },
    workspace,
  };
}
