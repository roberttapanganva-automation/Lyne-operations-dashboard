import { CalendarPlusIcon, ClockIcon } from "@phosphor-icons/react/ssr";
import { AddAppointmentDialog } from "./AddAppointmentDialog";

type CalendarEmptyStateProps = {
  canCreateRecords: boolean;
};

export function CalendarEmptyState({
  canCreateRecords,
}: CalendarEmptyStateProps) {
  return (
    <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
      <div className="p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
          <CalendarPlusIcon aria-hidden="true" size={26} weight="duotone" />
        </div>
        <h2 className="mt-5 text-lg font-semibold text-[var(--ops-text)]">
          No appointments yet. Add your first appointment to start tracking
          your schedule.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
          Appointments from jobs, manual scheduling, or future automations
          will appear here.
        </p>
        <div className="mt-5">
          {canCreateRecords ? (
            <AddAppointmentDialog />
          ) : (
            <p className="text-sm text-[var(--ops-text-muted)]">
              You have read-only access for this workspace.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-6 lg:border-l lg:border-t-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
          <ClockIcon aria-hidden="true" size={18} weight="duotone" />
          Upcoming schedule
        </div>
        <div className="mt-5 space-y-3">
          <div className="h-16 rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-white" />
          <div className="h-16 rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-white" />
          <div className="h-16 rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-white" />
        </div>
      </div>
    </div>
  );
}
