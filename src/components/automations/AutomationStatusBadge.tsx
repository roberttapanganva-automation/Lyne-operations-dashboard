import type { AutomationLogStatus } from "@/types/domain";

const statusClasses: Record<AutomationLogStatus, string> = {
  failed: "bg-[var(--ops-danger-soft)] text-[var(--ops-danger)]",
  pending: "bg-[var(--ops-warning-soft)] text-[var(--ops-warning)]",
  retrying: "bg-[var(--ops-warning-soft)] text-[var(--ops-warning)]",
  skipped: "bg-[var(--ops-info-soft)] text-[var(--ops-info)]",
  success: "bg-[var(--ops-success-soft)] text-[var(--ops-success)]",
};

export function AutomationStatusBadge({
  status,
}: {
  status: AutomationLogStatus;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
