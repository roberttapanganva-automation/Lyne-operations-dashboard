import { TrendUpIcon } from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatCurrency } from "@/lib/formatting/currency";
import type { DashboardRevenueSummary } from "@/types/domain";

type RevenueOverviewProps = {
  summary: DashboardRevenueSummary;
};

export function RevenueOverview({ summary }: RevenueOverviewProps) {
  const hasRevenueData =
    summary.jobCount > 0 &&
    (summary.estimatedRevenueThisMonth > 0 ||
      summary.estimatedRevenueAllOpenJobs > 0 ||
      summary.estimatedRevenueScheduledJobs > 0 ||
      summary.completedActualRevenue > 0);

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          description="Watch projected revenue, scheduled production value, and completed earnings in one operating view."
          title="Revenue Overview"
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
          <TrendUpIcon aria-hidden="true" size={24} weight="duotone" />
        </div>
      </div>

      {!hasRevenueData ? (
        <div className="mt-6">
          <EmptyState
            description="No estimated revenue yet. Job estimates will appear here after jobs are created."
            title="No revenue estimates"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          <div className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
              Revenue (Est.) this month
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--ops-text)]">
              {formatCurrency(
                summary.estimatedRevenueThisMonth,
                summary.currencyCode,
              )}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-[var(--ops-card-soft)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                Open est.
              </p>
              <p className="mt-1 font-semibold text-[var(--ops-text)]">
                {formatCurrency(
                  summary.estimatedRevenueAllOpenJobs,
                  summary.currencyCode,
                )}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--ops-card-soft)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                Scheduled est.
              </p>
              <p className="mt-1 font-semibold text-[var(--ops-text)]">
                {formatCurrency(
                  summary.estimatedRevenueScheduledJobs,
                  summary.currencyCode,
                )}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--ops-card-soft)] p-3">
              <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                Actual completed
              </p>
              <p className="mt-1 font-semibold text-[var(--ops-text)]">
                {formatCurrency(
                  summary.completedActualRevenue,
                  summary.currencyCode,
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
