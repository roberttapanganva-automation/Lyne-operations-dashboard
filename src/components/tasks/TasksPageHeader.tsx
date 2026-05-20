import Link from "next/link";
import { AddTaskDialog } from "./AddTaskDialog";

export type TaskViewFilter = "today" | "upcoming" | "whats-left";
export type TaskPageView = "active" | "history";

type TasksPageHeaderProps = {
  activeFilter: TaskViewFilter;
  activeTaskCount: number;
  activeView: TaskPageView;
  canCreateRecords: boolean;
  historyTaskCount: number;
};

const filters: Array<{
  label: string;
  value: TaskViewFilter;
}> = [
  { label: "What's left", value: "whats-left" },
  { label: "Today", value: "today" },
  { label: "Upcoming", value: "upcoming" },
];

export function TasksPageHeader({
  activeFilter,
  activeTaskCount,
  activeView,
  canCreateRecords,
  historyTaskCount,
}: TasksPageHeaderProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-[var(--ops-border)] bg-white p-1 shadow-sm">
          <Link
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
              activeView === "active"
                ? "bg-[var(--ops-primary)] text-white shadow-[0_10px_24px_var(--ops-primary-glow)]"
                : "text-[var(--ops-text-soft)] hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
            }`}
            href={`/tasks?view=active&filter=${activeFilter}`}
          >
            Active Tasks
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeView === "active"
                  ? "bg-white/20 text-white"
                  : "bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]"
              }`}
            >
              {activeTaskCount}
            </span>
          </Link>
          <Link
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
              activeView === "history"
                ? "bg-[var(--ops-primary)] text-white shadow-[0_10px_24px_var(--ops-primary-glow)]"
                : "text-[var(--ops-text-soft)] hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
            }`}
            href="/tasks?view=history"
          >
            Task History
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                activeView === "history"
                  ? "bg-white/20 text-white"
                  : "bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]"
              }`}
            >
              {historyTaskCount}
            </span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center">
          {activeView === "active" && canCreateRecords ? (
            <AddTaskDialog className="h-9" />
          ) : null}
        </div>
      </div>

      {activeView === "active" ? (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Link
              className={`inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
                activeFilter === filter.value
                  ? "bg-[var(--ops-primary)] text-white shadow-[0_10px_24px_var(--ops-primary-glow)]"
                  : "text-[var(--ops-text-soft)] hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
              }`}
              href={`/tasks?view=active&filter=${filter.value}`}
              key={filter.value}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
