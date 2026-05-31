import {
  BriefcaseMetalIcon,
  CheckSquareOffsetIcon,
  TargetIcon,
} from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Card";
import type { AccountActivitySummary } from "@/lib/account/queries";

type AccountActivityCardProps = {
  activity: AccountActivitySummary;
};

function getActivityLabel(kind: "lead" | "task") {
  return kind === "lead" ? "Lead" : "Task";
}

export function AccountActivityCard({ activity }: AccountActivityCardProps) {
  const isEmpty =
    activity.assignedLeadCount === 0 &&
    activity.activeJobCount === 0 &&
    activity.openTaskCount === 0;

  return (
    <Card className="p-5 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--ops-text)]">
          My Activity
        </h2>
        <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
          Your assigned work in this workspace.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--ops-text-soft)]">
              Assigned leads
            </p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
              <TargetIcon aria-hidden="true" size={18} weight="duotone" />
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-[var(--ops-text)]">
            {activity.assignedLeadCount}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--ops-text-soft)]">
              Active jobs
            </p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ops-info-soft)] text-[var(--ops-info)]">
              <BriefcaseMetalIcon aria-hidden="true" size={18} weight="duotone" />
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-[var(--ops-text)]">
            {activity.activeJobCount}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[var(--ops-text-soft)]">
              Open tasks
            </p>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ops-success-soft)] text-[var(--ops-success)]">
              <CheckSquareOffsetIcon
                aria-hidden="true"
                size={18}
                weight="duotone"
              />
            </span>
          </div>
          <p className="mt-4 text-2xl font-semibold text-[var(--ops-text)]">
            {activity.openTaskCount}
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="mt-5 rounded-xl border border-dashed border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-5 py-8 text-center">
          <p className="text-sm text-[var(--ops-text-soft)]">
            No assigned activity yet. Leads, jobs, and tasks assigned to you will
            appear here.
          </p>
        </div>
      ) : activity.recentItems.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
            Recent assigned activity
          </p>
          <div className="mt-3 space-y-3">
            {activity.recentItems.map((item) => (
              <div
                className="rounded-xl border border-[var(--ops-border)] bg-white px-4 py-3"
                key={`${item.kind}-${item.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--ops-text)]">
                    {item.title}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-[var(--ops-card-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ops-text-soft)]">
                    {getActivityLabel(item.kind)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
                  {item.scheduledAt
                    ? `Scheduled follow-up: ${new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.scheduledAt))}`
                    : "No scheduled follow-up yet."}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
