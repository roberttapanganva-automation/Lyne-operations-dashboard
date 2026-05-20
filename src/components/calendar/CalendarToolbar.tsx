import Link from "next/link";

export type CalendarFilter = "today" | "upcoming" | "completed";

const filters: { href: string; label: string; value: CalendarFilter }[] = [
  { href: "/calendar?filter=today", label: "Today", value: "today" },
  { href: "/calendar", label: "Upcoming", value: "upcoming" },
  {
    href: "/calendar?filter=completed",
    label: "Completed",
    value: "completed",
  },
];

type CalendarToolbarProps = {
  activeFilter: CalendarFilter;
};

export function CalendarToolbar({ activeFilter }: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Link
          className={`inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
            activeFilter === filter.value
              ? "bg-[var(--ops-primary)] text-white shadow-[0_10px_24px_var(--ops-primary-glow)]"
              : "text-[var(--ops-text-soft)] hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
          }`}
          href={filter.href}
          key={filter.value}
        >
          {filter.label}
        </Link>
      ))}
    </div>
  );
}
