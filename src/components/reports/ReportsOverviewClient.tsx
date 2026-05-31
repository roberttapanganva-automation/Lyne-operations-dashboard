"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseIcon,
  CheckSquareIcon,
  CurrencyDollarIcon,
  DownloadSimpleIcon,
  LightningIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/formatting/currency";
import {
  reportsRangeOptions,
  type ReportBreakdownItem,
  type ReportsOverview,
  type ReportsRange,
} from "@/lib/reports/types";
import type { ApiResponse } from "@/types/api";

type ReportsOverviewClientProps = {
  initialRange: ReportsRange;
};

const jobStatusColors: Record<string, string> = {
  cancelled: "var(--ops-danger)",
  completed: "var(--ops-success)",
  draft: "var(--ops-text-muted)",
  in_progress: "var(--ops-primary)",
  scheduled: "var(--ops-info)",
};

const automationStatusColors: Record<string, string> = {
  failed: "var(--ops-danger)",
  pending: "var(--ops-warning)",
  skipped: "#64748b",
  success: "var(--ops-success)",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function formatPercent(value: number) {
  return `${value}%`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function buildConicGradient(
  items: Array<{ count: number; status: string }>,
  colors: Record<string, string>,
) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return "conic-gradient(var(--ops-card-soft) 0deg 360deg)";
  }

  let cursor = 0;
  const stops = items.map((item) => {
    const start = cursor;
    const end = cursor + (item.count / total) * 360;
    cursor = end;
    return `${colors[item.status] ?? "var(--ops-primary)"} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function buildDrilldownHref(
  pathname: string,
  range: ReportsRange,
  params: Record<string, string> = {},
) {
  const searchParams = new URLSearchParams({
    ...params,
    range,
  });

  return `${pathname}?${searchParams.toString()}`;
}

function ReportsSkeleton() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-28" />
        </div>
      </Card>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card className="p-5" key={index}>
            <Skeleton className="h-24 w-full" />
          </Card>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card className="p-5" key={index}>
            <Skeleton className="h-56 w-full" />
          </Card>
        ))}
      </section>
    </div>
  );
}

function MessageState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Card className="p-6">
      <p className="text-sm font-semibold text-[var(--ops-text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
        {description}
      </p>
    </Card>
  );
}

function RangeControls({
  activeRange,
  rangeLabel,
}: {
  activeRange: ReportsRange;
  rangeLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {reportsRangeOptions.map((option) => (
          <Link
            aria-current={activeRange === option.key ? "page" : undefined}
            className={`inline-flex h-9 items-center rounded-lg border px-4 text-sm font-semibold transition ${
              activeRange === option.key
                ? "border-[var(--ops-primary)] bg-[var(--ops-primary)] text-white shadow-[0_10px_24px_var(--ops-primary-glow)]"
                : "border-[var(--ops-border)] bg-[var(--ops-card)] text-[var(--ops-text)] hover:bg-[var(--ops-card-soft)]"
            }`}
            href={option.href}
            key={option.key}
          >
            {option.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex h-9 items-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 text-sm font-medium text-[var(--ops-text-soft)]">
          {rangeLabel}
        </div>
        <button
          className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-sm font-semibold text-[var(--ops-text-muted)] opacity-70"
          disabled
          type="button"
        >
          <DownloadSimpleIcon aria-hidden="true" size={16} weight="bold" />
          Export
        </button>
      </div>
    </div>
  );
}

function KpiCards({ overview }: { overview: ReportsOverview }) {
  const cards = [
    {
      helper: "Created in the selected period.",
      icon: UsersThreeIcon,
      tone: "text-[var(--ops-primary)] bg-[var(--ops-primary-soft)]",
      title: "New Leads",
      value: formatNumber(overview.kpis.newLeads),
    },
    {
      helper: "Non-cancelled jobs in this period.",
      icon: BriefcaseIcon,
      tone: "text-[var(--ops-info)] bg-[var(--ops-info-soft)]",
      title: "Jobs Booked",
      value: formatNumber(overview.kpis.jobsBooked),
    },
    {
      helper: "Estimated value from active jobs.",
      icon: CurrencyDollarIcon,
      tone: "text-[var(--ops-success)] bg-[var(--ops-success-soft)]",
      title: "Estimated Revenue",
      value: formatCurrency(overview.kpis.estimatedRevenue, overview.currencyCode),
    },
    {
      helper: "Completed in the selected period.",
      icon: CheckSquareIcon,
      tone: "text-[var(--ops-warning)] bg-[var(--ops-warning-soft)]",
      title: "Completed Tasks",
      value: formatNumber(overview.kpis.completedTasks),
    },
    {
      helper:
        overview.automations.total === 0
          ? "No automation runs in this period."
          : "Successful automation runs.",
      icon: LightningIcon,
      tone: "text-[var(--ops-primary-dark)] bg-[var(--ops-primary-soft)]",
      title: "Automation Success Rate",
      value: formatPercent(overview.kpis.automationSuccessRate),
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card className="p-5" key={card.title}>
            <div className="flex items-start gap-4">
              <span
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${card.tone}`}
              >
                <Icon aria-hidden="true" size={25} weight="duotone" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  {card.title}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-normal text-[var(--ops-text)]">
                  {card.value}
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--ops-text-soft)]">
                  {card.helper}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

function ChartCard({
  actionHref,
  actionLabel = "View Details",
  children,
  subtitle,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--ops-text)]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--ops-text-soft)]">{subtitle}</p>
        </div>
        {actionHref ? (
          <Link
            aria-label={`${actionLabel} for ${title}`}
            className="hidden h-9 items-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-xs font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] sm:inline-flex"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function LeadPerformance({ overview }: { overview: ReportsOverview }) {
  const stages = overview.leads.byStage;
  const max = Math.max(...stages.map((stage) => stage.count), 1);

  return (
    <ChartCard
      actionHref={buildDrilldownHref("/crm", overview.range, { tab: "leads" })}
      subtitle="Leads by pipeline stage"
      title="Lead Performance"
    >
      {overview.leads.total === 0 ? (
        <EmptyState
          description="New leads and pipeline activity will appear here."
          title="No lead data yet."
        />
      ) : (
        <div className="space-y-4">
          {stages.map((stage) => (
            <div
              className="grid grid-cols-[112px_minmax(0,1fr)_44px] items-center gap-3 text-sm"
              key={stage.id ?? stage.status}
            >
              <span className="truncate font-medium text-[var(--ops-text)]">
                {stage.label}
              </span>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--ops-card-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--workspace-primary,var(--ops-primary))]"
                  style={{ width: `${Math.max((stage.count / max) * 100, 8)}%` }}
                />
              </div>
              <span className="text-right font-semibold text-[var(--ops-text)]">
                {stage.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}

function JobPerformance({ overview }: { overview: ReportsOverview }) {
  const breakdown = overview.jobs.byStatus;
  const total = overview.jobs.total;
  const gradient = buildConicGradient(breakdown, jobStatusColors);

  return (
    <ChartCard
      actionHref={buildDrilldownHref("/jobs", overview.range)}
      subtitle="Jobs by status"
      title="Job Performance"
    >
      {total === 0 ? (
        <EmptyState
          description="Scheduled and completed jobs will appear here."
          title="No job data yet."
        />
      ) : (
        <div className="grid items-center gap-6 md:grid-cols-[160px_minmax(0,1fr)_190px]">
          <div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full">
            <div
              className="flex h-full w-full items-center justify-center rounded-full shadow-[inset_0_0_0_1px_var(--ops-border)]"
              style={{ background: gradient }}
            >
              <div className="h-[72px] w-[72px] rounded-full bg-[var(--ops-card)] shadow-sm" />
            </div>
          </div>
          <BreakdownLegend
            colors={jobStatusColors}
            items={breakdown}
            total={total}
          />
          <Link
            aria-label="View estimated revenue jobs"
            className="rounded-xl bg-[var(--ops-primary-soft)] p-5 transition hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
            href={buildDrilldownHref("/jobs", overview.range, { payment: "all" })}
          >
            <p className="text-sm font-medium text-[var(--ops-text)]">
              Estimated Revenue
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--ops-text)]">
              {formatCurrency(overview.jobs.estimatedRevenue, overview.currencyCode)}
            </p>
            <p className="mt-3 text-sm leading-5 text-[var(--ops-text-soft)]">
              Based on scheduled and completed jobs.
            </p>
          </Link>
        </div>
      )}
    </ChartCard>
  );
}

function BreakdownLegend({
  colors,
  items,
  total,
}: {
  colors: Record<string, string>;
  items: ReportBreakdownItem[];
  total: number;
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-5 text-sm"
          key={item.status}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[item.status] ?? item.color }}
            />
            <span className="font-medium text-[var(--ops-text)]">
              {item.label}
            </span>
          </div>
          <span className="whitespace-nowrap text-right text-[var(--ops-text-soft)]">
            {item.count} ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
          </span>
        </div>
      ))}
    </div>
  );
}

function TaskProductivity({ overview }: { overview: ReportsOverview }) {
  const trend = overview.tasks.completedTrend;
  const max = Math.max(...trend.map((item) => item.count), 1);

  return (
    <ChartCard
      actionHref={buildDrilldownHref("/tasks", overview.range, { tab: "history" })}
      subtitle="Tasks overview"
      title="Task Productivity"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_160px]">
        {trend.length === 0 ? (
          <EmptyState
            description="Completed task activity will appear here as the team finishes work."
            title="No completed task trend yet."
          />
        ) : (
          <div className="flex h-48 items-end gap-2 border-b border-[var(--ops-border)] px-1">
            {trend.map((item) => (
              <div
                className="flex min-w-8 flex-1 flex-col items-center gap-2"
                key={item.label}
              >
                <div
                  className="w-full max-w-8 rounded-t-lg bg-[var(--workspace-primary,var(--ops-primary))]"
                  style={{ height: `${Math.max((item.count / max) * 150, 18)}px` }}
                  title={`${item.label}: ${item.count}`}
                />
                <span className="hidden text-[10px] text-[var(--ops-text-soft)] sm:block">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-lg bg-[var(--ops-info-soft)] p-3">
            <p className="text-xs font-semibold text-[var(--ops-info)]">
              Open Tasks
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--ops-text)]">
              {overview.tasks.open}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--ops-success-soft)] p-3">
            <p className="text-xs font-semibold text-[var(--ops-success)]">
              Completed
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--ops-text)]">
              {overview.tasks.completed}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--ops-danger-soft)] p-3">
            <p className="text-xs font-semibold text-[var(--ops-danger)]">
              Overdue
            </p>
            <p className="mt-2 text-xl font-semibold text-[var(--ops-text)]">
              {overview.tasks.overdue}
            </p>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

function AutomationReliability({ overview }: { overview: ReportsOverview }) {
  const successRate = overview.automations.successRate;
  const gaugeValue = successRate;

  return (
    <ChartCard
      actionHref={buildDrilldownHref("/automations", overview.range)}
      subtitle="Automation runs overview"
      title="Automation Reliability"
    >
      {overview.automations.total === 0 ? (
        <EmptyState
          description="Automation runs will appear here after webhooks or test events are processed."
          title="No automation logs yet."
        />
      ) : (
        <div className="grid items-center gap-7 md:grid-cols-[minmax(230px,0.9fr)_minmax(260px,1.1fr)]">
          <div className="flex min-h-44 flex-col items-center justify-center">
            <div className="relative h-36 w-full max-w-72">
              <svg
                aria-hidden="true"
                className="h-full w-full overflow-visible"
                viewBox="0 0 240 150"
              >
                <path
                  d="M 28 118 A 92 92 0 0 1 212 118"
                  fill="none"
                  pathLength={100}
                  stroke="var(--ops-card-soft)"
                  strokeLinecap="butt"
                  strokeWidth={28}
                />
                <path
                  d="M 28 118 A 92 92 0 0 1 212 118"
                  fill="none"
                  pathLength={100}
                  stroke="var(--ops-success)"
                  strokeDasharray={`${gaugeValue} ${100 - gaugeValue}`}
                  strokeLinecap="butt"
                  strokeWidth={28}
                />
                {overview.automations.byStatus.find(
                  (item) => item.status === "failed",
                )?.count ? (
                  <path
                    d="M 28 118 A 92 92 0 0 1 212 118"
                    fill="none"
                    pathLength={100}
                    stroke="var(--ops-danger)"
                    strokeDasharray="4 96"
                    strokeDashoffset={-96}
                    strokeLinecap="butt"
                    strokeWidth={28}
                  />
                ) : null}
              </svg>
              <div className="absolute inset-x-0 bottom-2 text-center">
                <p className="text-3xl font-semibold leading-none text-[var(--ops-text)]">
                  {formatPercent(successRate)}
                </p>
                <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
                  Success Rate
                </p>
              </div>
            </div>
          </div>
          <BreakdownLegend
            colors={automationStatusColors}
            items={overview.automations.byStatus}
            total={overview.automations.total}
          />
        </div>
      )}
    </ChartCard>
  );
}

function FailedAutomations({ overview }: { overview: ReportsOverview }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--ops-text)]">
            Recent Failed Automations
          </h2>
          <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
            Latest automation failures in this period
          </p>
        </div>
        <Link
          aria-label="View failed automation runs"
          className="hidden h-9 items-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-xs font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] sm:inline-flex"
          href={buildDrilldownHref("/automations", overview.range, {
            status: "failed",
          })}
        >
          View Failed Runs
        </Link>
      </div>
      {overview.automations.recentFailures.length === 0 ? (
        <div className="p-5">
          <EmptyState
            description="No failed automations in this period."
            title="Automation failures are clear."
          />
        </div>
      ) : (
        <div className="ops-density-surface overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--ops-card-soft)] text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ops-text-muted)]">
              <tr>
                <th className="px-5 py-3">Workflow</th>
                <th className="px-5 py-3">Related type</th>
                <th className="px-5 py-3">Error</th>
                <th className="px-5 py-3">Failed at</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ops-border)] bg-[var(--ops-card)]">
              {overview.automations.recentFailures.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium text-[var(--ops-text)]">
                    {item.automation_type}
                  </td>
                  <td className="px-5 py-3 text-[var(--ops-text-soft)]">
                    {item.related_type}
                  </td>
                  <td className="max-w-sm px-5 py-3 text-[var(--ops-text-soft)]">
                    <span className="line-clamp-2">
                      {item.error_message ?? "No error message recorded."}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--ops-text-soft)]">
                    {formatDateTime(item.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant="danger">Failed</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function ReportsOverviewClient({
  initialRange,
}: ReportsOverviewClientProps) {
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const requestPath = useMemo(
    () => `/api/reports/overview?range=${encodeURIComponent(initialRange)}`,
    [initialRange],
  );

  useEffect(() => {
    let isActive = true;

    fetch(requestPath, {
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse<ReportsOverview>;

        if (!body.ok) {
          throw new Error(body.error.message);
        }

        return body.data;
      })
      .then((data) => {
        if (!isActive) {
          return;
        }

        setError(null);
        setOverview(data);
      })
      .catch((fetchError: unknown) => {
        if (!isActive) {
          return;
        }

        setOverview(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Reports could not be loaded.",
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [requestPath]);

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  if (error) {
    return (
      <MessageState
        description={error}
        title={
          error === "Reports are available to managers and workspace admins."
            ? "Reports unavailable"
            : "Reports could not be loaded"
        }
      />
    );
  }

  if (!overview) {
    return (
      <MessageState
        description="Try refreshing the page."
        title="Reports could not be loaded"
      />
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <RangeControls activeRange={overview.range} rangeLabel={overview.rangeLabel} />
      <KpiCards overview={overview} />
      <section className="grid gap-4 xl:grid-cols-2">
        <LeadPerformance overview={overview} />
        <JobPerformance overview={overview} />
        <TaskProductivity overview={overview} />
        <AutomationReliability overview={overview} />
      </section>
      <FailedAutomations overview={overview} />
    </div>
  );
}
