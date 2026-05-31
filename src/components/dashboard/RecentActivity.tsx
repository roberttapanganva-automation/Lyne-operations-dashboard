"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  CheckSquareIcon,
  ClockCounterClockwiseIcon,
  FunnelSimpleIcon,
  GearSixIcon,
  KanbanIcon,
  PaletteIcon,
  RobotIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/formatting/date";
import type { DashboardActivityItem } from "@/types/domain";

type RecentActivityProps = {
  items: DashboardActivityItem[];
};

type ActivityFilter = "all" | "audit" | "automation" | "assignments" | "tasks";

const filters: Array<{ id: ActivityFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "audit", label: "Audit" },
  { id: "automation", label: "Automation" },
  { id: "assignments", label: "Assignments" },
  { id: "tasks", label: "Tasks" },
];

function ActivityRowIcon({ icon }: { icon: string }) {
  const props = {
    className: "text-[var(--workspace-primary,var(--ops-primary-dark))]",
    size: 18,
    weight: "duotone" as const,
  };

  switch (icon) {
    case "automation":
      return <RobotIcon aria-hidden="true" {...props} />;
    case "lead":
      return <UsersThreeIcon aria-hidden="true" {...props} />;
    case "job":
      return <BriefcaseIcon aria-hidden="true" {...props} />;
    case "task":
      return <CheckSquareIcon aria-hidden="true" {...props} />;
    case "calendar":
      return <CalendarBlankIcon aria-hidden="true" {...props} />;
    case "branding":
      return <PaletteIcon aria-hidden="true" {...props} />;
    case "access":
      return <ShieldCheckIcon aria-hidden="true" {...props} />;
    case "team":
      return <UsersThreeIcon aria-hidden="true" {...props} />;
    case "pipeline":
      return <KanbanIcon aria-hidden="true" {...props} />;
    default:
      return <GearSixIcon aria-hidden="true" {...props} />;
  }
}

function statusVariant(status: DashboardActivityItem["status"]) {
  if (status === "success") {
    return "success" as const;
  }

  if (status === "failed") {
    return "danger" as const;
  }

  if (status === "pending" || status === "retrying") {
    return "warning" as const;
  }

  if (status === "skipped") {
    return "default" as const;
  }

  return "info" as const;
}

function statusLabel(item: DashboardActivityItem) {
  if (item.status) {
    return item.status.charAt(0).toUpperCase() + item.status.slice(1);
  }

  return item.type === "automation" ? "Automation" : "Audit";
}

function matchesFilter(item: DashboardActivityItem, filter: ActivityFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "audit" || filter === "automation") {
    return item.type === filter;
  }

  if (filter === "assignments") {
    return item.category === "Assignments";
  }

  return item.category === "Tasks";
}

export function RecentActivity({ items }: RecentActivityProps) {
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>("all");
  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, activeFilter)),
    [activeFilter, items],
  );
  const filterCounts = useMemo(
    () =>
      filters.reduce(
        (counts, filter) => ({
          ...counts,
          [filter.id]: items.filter((item) => matchesFilter(item, filter.id))
            .length,
        }),
        {} as Record<ActivityFilter, number>,
      ),
    [items],
  );

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--ops-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
                <ClockCounterClockwiseIcon
                  aria-hidden="true"
                  size={18}
                  weight="duotone"
                />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--ops-text)]">
                  Recent Activity
                </h2>
                <p className="mt-1 text-sm leading-5 text-[var(--ops-text-soft)]">
                  Latest workspace updates across operations and automation.
                </p>
              </div>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--ops-border)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--ops-text-soft)] sm:inline-flex">
            <FunnelSimpleIcon aria-hidden="true" size={13} />
            Latest 8
          </span>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.id;

            return (
              <button
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
                  isActive
                    ? "border-transparent bg-[var(--workspace-primary,var(--ops-primary))] text-white shadow-[0_10px_22px_var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    : "border-[var(--ops-border)] bg-white text-[var(--ops-text-soft)] hover:border-[var(--workspace-primary,var(--ops-primary))] hover:text-[var(--workspace-primary,var(--ops-primary-dark))]"
                }`}
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                type="button"
              >
                {filter.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-white/18 text-white"
                      : "bg-[var(--ops-card-soft)] text-[var(--ops-text-muted)]"
                  }`}
                >
                  {filterCounts[filter.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-5">
          <EmptyState
            description="No recent activity yet. Activity logs will appear after workspace actions."
            title="No recent activity"
          />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-5">
          <EmptyState
            description="Try another filter to review the latest workspace updates."
            title="No matching activity"
          />
        </div>
      ) : (
        <div className="max-h-[430px] overflow-y-auto p-5">
          <div className="relative space-y-0">
            <div
              aria-hidden="true"
              className="absolute bottom-5 left-[17px] top-5 w-px bg-[var(--ops-border)]"
            />
            {filteredItems.map((item) => (
              <article
                className="relative flex gap-3 pb-4 last:pb-0"
                key={`${item.type}-${item.id}`}
              >
                <div className="z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] shadow-sm">
                  <ActivityRowIcon icon={item.icon} />
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-transparent px-1 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ops-text)]">
                      {item.title}
                    </p>
                    <Badge
                      className="shrink-0 px-2 py-0.5 text-[11px]"
                      variant={statusVariant(item.status)}
                    >
                      {statusLabel(item)}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--ops-text-soft)]">
                    {item.message}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--ops-text-muted)]">
                    <span>{formatDateTime(item.created_at)}</span>
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--ops-border-strong)]" />
                    <span>{item.category}</span>
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--ops-border-strong)]" />
                    <span>{item.source}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {filteredItems.length > 0 ? (
        <div className="border-t border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-[var(--ops-text-muted)]">
            <CheckCircleIcon aria-hidden="true" size={14} weight="duotone" />
            Showing the latest {filteredItems.length} real workspace updates.
          </div>
        </div>
      ) : null}
    </Card>
  );
}
