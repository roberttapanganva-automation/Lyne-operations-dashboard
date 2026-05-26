import { canViewReports } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import {
  normalizeReportsRange,
  type ReportBreakdownItem,
  type ReportsOverview,
  type ReportsRange,
} from "@/lib/reports/types";
import type { AutomationLogStatus } from "@/types/domain";

export type ReportsOverviewResult =
  | {
      data: ReportsOverview;
      status: "ready";
    }
  | {
      message: string;
      status: "forbidden" | "unauthenticated" | "unavailable";
    };

type LeadRow = {
  created_at: string;
  id: string;
  source: string | null;
  stage_id: string | null;
  status: "open" | "won" | "lost";
};

type PipelineStageRow = {
  color: string;
  id: string;
  name: string;
  order_index: number;
};

type JobStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";

type JobRow = {
  created_at: string;
  estimated_value: number | string | null;
  id: string;
  payment_status: "unpaid" | "partial" | "paid" | "refunded" | "not_applicable";
  scheduled_start: string | null;
  status: JobStatus;
};

type TaskRow = {
  completed_at: string | null;
  created_at: string;
  due_at: string | null;
  id: string;
  status: "todo" | "in_progress" | "done" | "cancelled";
};

type AutomationLogRow = {
  automation_type: string;
  created_at: string;
  error_message: string | null;
  id: string;
  message: string;
  related_type: string;
  status: AutomationLogStatus;
};

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getRangeWindow(rangeParam?: string | null) {
  const key = normalizeReportsRange(rangeParam);
  const now = new Date();
  const end = now;
  const start =
    key === "this_month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : startOfDay(
          new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - (key === "7d" ? 6 : key === "90d" ? 89 : 29),
          ),
        );
  const labelFormatter = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return {
    end,
    key,
    label: `${labelFormatter.format(start)} - ${labelFormatter.format(end)}`,
    start,
  };
}

function isWithinRange(value: string | null, start: Date, end: Date) {
  if (!value) {
    return false;
  }

  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function labelFromStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildBreakdown<T extends string>(
  values: T[],
  order: T[],
): Array<ReportBreakdownItem<T>> {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const known = order
    .map((status) => ({
      count: counts.get(status) ?? 0,
      label: labelFromStatus(status),
      status,
    }))
    .filter((item) => item.count > 0);
  const ordered = new Set(order);
  const other = Array.from(counts.entries())
    .filter(([status]) => !ordered.has(status))
    .map(([status, count]) => ({
      count,
      label: labelFromStatus(status),
      status,
    }));

  return [...known, ...other];
}

function buildSourceBreakdown(leads: LeadRow[]) {
  const counts = new Map<string, number>();

  for (const lead of leads) {
    const source = lead.source?.trim() || "Not set";
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
    .map(([source, count]) => ({
      count,
      label: source,
      status: source,
    }));
}

function isTaskOverdue(task: TaskRow, now: Date) {
  if (!task.due_at || task.status === "done" || task.status === "cancelled") {
    return false;
  }

  return new Date(task.due_at).getTime() < now.getTime();
}

function buildTaskTrend(tasks: TaskRow[], start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  });
  const buckets = new Map<string, number>();

  for (const task of tasks) {
    if (!isWithinRange(task.completed_at, start, end)) {
      continue;
    }

    const completedAt = new Date(task.completed_at as string);
    const key = formatter.format(completedAt);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return Array.from(buckets.entries()).map(([label, count]) => ({
    count,
    label,
  }));
}

function normalizeAutomationStatus(status: AutomationLogStatus) {
  if (status === "retrying") {
    return "pending" as const;
  }

  return status;
}

export async function getReportsOverview(
  rangeParam?: string | null,
): Promise<ReportsOverviewResult> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return {
      message:
        activeWorkspace.error ??
        "Reports could not load because no active workspace is available.",
      status:
        activeWorkspace.status === "no-user" ? "unauthenticated" : "unavailable",
    };
  }

  if (!canViewReports(activeWorkspace.context.role)) {
    return {
      message: "Reports are available to managers and workspace admins.",
      status: "forbidden",
    };
  }

  const supabase = await createClient();
  const workspaceId = activeWorkspace.context.workspace.id;
  const currencyCode = activeWorkspace.context.workspace.currency_code ?? "USD";
  const { end, key, label, start } = getRangeWindow(rangeParam);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [
    leadsResult,
    stagesResult,
    jobsResult,
    tasksResult,
    automationLogsResult,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id,stage_id,status,source,created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .returns<LeadRow[]>(),
    supabase
      .from("pipeline_stages")
      .select("id,name,color,order_index")
      .eq("workspace_id", workspaceId)
      .eq("entity_type", "lead")
      .order("order_index", { ascending: true })
      .returns<PipelineStageRow[]>(),
    supabase
      .from("jobs")
      .select("id,status,payment_status,estimated_value,scheduled_start,created_at")
      .eq("workspace_id", workspaceId)
      .returns<JobRow[]>(),
    supabase
      .from("tasks")
      .select("id,status,due_at,completed_at,created_at")
      .eq("workspace_id", workspaceId)
      .returns<TaskRow[]>(),
    supabase
      .from("automation_logs")
      .select("id,automation_type,related_type,status,message,error_message,created_at")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false })
      .returns<AutomationLogRow[]>(),
  ]);

  const fatalError =
    leadsResult.error ??
    stagesResult.error ??
    jobsResult.error ??
    tasksResult.error ??
    automationLogsResult.error;

  if (fatalError) {
    return {
      message: fatalError.message,
      status: "unavailable",
    };
  }

  const leads = leadsResult.data ?? [];
  const stages = stagesResult.data ?? [];
  const jobs = (jobsResult.data ?? []).filter((job) =>
    isWithinRange(job.scheduled_start ?? job.created_at, start, end),
  );
  const tasks = tasksResult.data ?? [];
  const completedTasks = tasks.filter(
    (task) =>
      task.status === "done" && isWithinRange(task.completed_at, start, end),
  );
  const automationLogs = automationLogsResult.data ?? [];
  const now = new Date();

  const stageCounts = new Map<string, number>();
  let noStageCount = 0;

  for (const lead of leads) {
    if (!lead.stage_id) {
      noStageCount += 1;
      continue;
    }

    stageCounts.set(lead.stage_id, (stageCounts.get(lead.stage_id) ?? 0) + 1);
  }

  const byStage = stages
    .map((stage) => ({
      color: stage.color,
      count: stageCounts.get(stage.id) ?? 0,
      id: stage.id,
      label: stage.name,
      status: stage.id,
    }))
    .filter((stage) => stage.count > 0);

  if (noStageCount > 0) {
    byStage.push({
      color: "#94a3b8",
      count: noStageCount,
      id: "no-stage",
      label: "No stage",
      status: "no-stage",
    });
  }

  const jobStatusOrder: JobStatus[] = [
    "scheduled",
    "in_progress",
    "completed",
    "draft",
    "cancelled",
  ];
  const jobBreakdown = buildBreakdown(
    jobs.map((job) => job.status),
    jobStatusOrder,
  );
  const jobPaymentBreakdown = buildBreakdown(
    jobs.map((job) => job.payment_status),
    ["unpaid", "partial", "paid", "refunded", "not_applicable"],
  );

  const automationCounts = {
    failed: 0,
    pending: 0,
    skipped: 0,
    success: 0,
  };

  for (const log of automationLogs) {
    const status = normalizeAutomationStatus(log.status);
    automationCounts[status] += 1;
  }

  const automationTotal = automationLogs.length;
  const automationSuccessRate =
    automationTotal > 0
      ? Math.round((automationCounts.success / automationTotal) * 100)
      : 0;

  const estimatedRevenue = jobs
    .filter((job) => job.status !== "cancelled")
    .reduce((total, job) => total + toNumber(job.estimated_value), 0);

  return {
    data: {
      currencyCode,
      generatedAt: now.toISOString(),
      jobs: {
        byPaymentStatus: jobPaymentBreakdown,
        byStatus: jobBreakdown,
        estimatedRevenue,
        total: jobs.length,
      },
      kpis: {
        automationSuccessRate,
        completedTasks: completedTasks.length,
        estimatedRevenue,
        jobsBooked: jobs.filter((job) => job.status !== "cancelled").length,
        newLeads: leads.length,
      },
      leads: {
        bySource: buildSourceBreakdown(leads),
        byStage,
        byStatus: buildBreakdown(
          leads.map((lead) => lead.status),
          ["open", "won", "lost"],
        ),
        total: leads.length,
      },
      range: key,
      rangeEnd: endIso,
      rangeLabel: label,
      rangeStart: startIso,
      tasks: {
        completed: completedTasks.length,
        completedTrend: buildTaskTrend(completedTasks, start, end),
        open: tasks.filter(
          (task) => task.status !== "done" && task.status !== "cancelled",
        ).length,
        overdue: tasks.filter((task) => isTaskOverdue(task, now)).length,
      },
      automations: {
        byStatus: [
          { count: automationCounts.success, label: "Successful", status: "success" },
          { count: automationCounts.failed, label: "Failed", status: "failed" },
          { count: automationCounts.pending, label: "Pending", status: "pending" },
          { count: automationCounts.skipped, label: "Skipped", status: "skipped" },
        ],
        recentFailures: automationLogs
          .filter((log) => log.status === "failed")
          .slice(0, 5)
          .map((log) => ({
            automation_type: log.automation_type,
            created_at: log.created_at,
            error_message: log.error_message ?? log.message,
            id: log.id,
            related_type: log.related_type,
            status: "failed",
          })),
        successRate: automationSuccessRate,
        total: automationTotal,
      },
      workspace: {
        id: workspaceId,
        name: activeWorkspace.context.workspace.name,
        role: activeWorkspace.context.role,
      },
    },
    status: "ready",
  };
}
