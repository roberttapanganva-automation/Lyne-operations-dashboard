import { CalendarBlankIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatDateTime } from "@/lib/formatting/date";
import type { DashboardAgendaItem } from "@/types/domain";

type TodayAgendaProps = {
  items: DashboardAgendaItem[];
};

export function TodayAgenda({ items }: TodayAgendaProps) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          description="Stay ahead of the day with a focused view of confirmed visits, service windows, and operational commitments."
          title="Today's Agenda"
        />
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-info-soft)] text-[var(--ops-info)]">
          <CalendarBlankIcon aria-hidden="true" size={24} weight="duotone" />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            description="No appointments or jobs scheduled for today."
            title="Agenda is clear"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <article
              className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4"
              key={`${item.type}-${item.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--ops-text)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                    {formatDateTime(item.starts_at)}
                  </p>
                </div>
                <Badge variant={item.type === "job" ? "info" : "default"}>
                  {item.type === "job" ? "Job" : "Appointment"}
                </Badge>
              </div>
              <p className="mt-3 text-sm text-[var(--ops-text-muted)]">
                {item.location ?? "Location not set"}
              </p>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
