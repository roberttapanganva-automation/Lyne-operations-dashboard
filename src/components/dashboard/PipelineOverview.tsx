import Link from "next/link";
import { ArrowRightIcon, RowsIcon } from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatCurrency } from "@/lib/formatting/currency";
import type { PipelineBoardSummary } from "@/types/domain";

type PipelineOverviewProps = {
  currencyCode: string;
  summary: PipelineBoardSummary;
};

function StageRows({
  stages,
  totalCards,
}: {
  stages: PipelineBoardSummary["stages"];
  totalCards: number;
}) {
  return (
    <div className="space-y-3">
      {stages.slice(0, 5).map((stage) => {
        const width =
          totalCards > 0 ? Math.max((stage.count / totalCards) * 100, 6) : 0;

        return (
          <div key={stage.id}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="truncate font-medium text-[var(--ops-text)]">
                  {stage.name}
                </span>
              </div>
              <span className="shrink-0 font-semibold text-[var(--ops-text-soft)]">
                {stage.count}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[var(--ops-border)]">
              <div
                className="h-2 rounded-full bg-[var(--workspace-primary,var(--ops-primary))]"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PipelineOverview({
  currencyCode,
  summary,
}: PipelineOverviewProps) {
  const totalCards = summary.total_cards;
  const pipelineLabel = summary.group
    ? `${summary.group.name} (${summary.group.entity_type === "lead" ? "Leads" : "Jobs"})`
    : "No pipeline selected";

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          description="Keep an eye on stage momentum, card volume, and open value across the workflow that is driving today’s pipeline."
          title="Pipeline Overview"
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
          <RowsIcon aria-hidden="true" size={24} weight="duotone" />
        </div>
      </div>

      {summary.has_error ? (
        <p
          className="mt-6 rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
          role="alert"
        >
          We could not load the pipeline preview. Please refresh and try again.
        </p>
      ) : !summary.has_configured_stages ? (
        <div className="mt-6 space-y-4">
          <EmptyState
            description="No pipeline configured yet. Owners can create pipelines in Owner Console."
            title="No pipeline configured yet"
          />
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white px-4 text-sm font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-card-soft)]"
            href="/pipelines"
          >
            Open pipelines
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                Active Pipeline
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--ops-text)]">
                {pipelineLabel}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                Total Cards
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ops-text)]">
                {summary.total_cards}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                Est. Value
              </p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ops-text)]">
                {formatCurrency(summary.total_estimated_value, currencyCode)}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <StageRows stages={summary.stages} totalCards={totalCards} />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--ops-border)] pt-4">
            <p className="text-sm text-[var(--ops-text-soft)]">
              Open the board to review live movement, rebalance workload, and keep deals advancing cleanly.
            </p>
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ops-primary-dark)] transition hover:text-[var(--workspace-accent,var(--ops-primary-dark))]"
              href="/pipelines"
            >
              Open board
              <ArrowRightIcon aria-hidden="true" size={16} weight="bold" />
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
