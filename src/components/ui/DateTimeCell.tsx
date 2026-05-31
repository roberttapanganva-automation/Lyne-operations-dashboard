type DateTimeCellProps = {
  emptyLabel?: string;
  value: string | null;
};

type DateTimeHeaderProps = {
  label: string;
};

function formatDatePart(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatTimePart(value: string) {
  return new Intl.DateTimeFormat("en", {
    timeStyle: "short",
  }).format(new Date(value));
}

export function DateTimeHeader({ label }: DateTimeHeaderProps) {
  return (
    <div className="min-w-[180px]">
      <span className="block text-center">{label}</span>
      <span className="mt-1 grid grid-cols-[minmax(0,1fr)_88px] gap-4 text-[10px] font-semibold normal-case tracking-normal text-[var(--ops-text-muted)]/70">
        <span>Date</span>
        <span className="text-right">Time</span>
      </span>
    </div>
  );
}

export function DateTimeCell({
  emptyLabel = "Not scheduled",
  value,
}: DateTimeCellProps) {
  if (!value) {
    return (
      <span className="text-sm text-[var(--ops-text-muted)]">{emptyLabel}</span>
    );
  }

  return (
    <span className="grid min-w-[180px] grid-cols-[minmax(0,1fr)_88px] gap-4 text-sm text-[var(--ops-text-soft)]">
      <span>{formatDatePart(value)}</span>
      <span className="text-right text-[var(--ops-text-muted)]">
        {formatTimePart(value)}
      </span>
    </span>
  );
}
