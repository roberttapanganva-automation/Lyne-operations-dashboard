import { BouncingDots } from "@/components/loading-ui/BouncingDots";

const skeletonCards = ["New Leads", "Jobs Booked", "Revenue", "Overdue"];

export default function DashboardLoading() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--ops-primary-dark)]">
              Loading dashboard
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--ops-text)] sm:text-3xl">
              Loading your operations overview
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
              Preparing the latest workspace activity, schedules, pipeline
              movement, and follow-ups.
            </p>
          </div>
          <BouncingDots
            className="text-[var(--workspace-primary,var(--ops-primary))]"
            label="Loading dashboard"
          />
        </div>
      </section>

      <section
        aria-label="Loading dashboard metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {skeletonCards.map((label) => (
          <div
            className="rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm"
            key={label}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-3 w-24 rounded-full bg-[var(--ops-card-soft)]" />
                <div className="mt-4 h-8 w-16 rounded-lg bg-[var(--ops-card-soft)]" />
                <div className="mt-4 h-3 w-full max-w-48 rounded-full bg-[var(--ops-card-soft)]" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-[var(--ops-primary-soft)]" />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="min-h-80 rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm">
          <div className="h-4 w-40 rounded-full bg-[var(--ops-card-soft)]" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="h-3 rounded-full bg-[var(--ops-card-soft)]"
                key={index}
              />
            ))}
          </div>
        </div>
        <div className="min-h-80 rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm">
          <div className="h-4 w-32 rounded-full bg-[var(--ops-card-soft)]" />
          <div className="mt-5 rounded-xl border border-dashed border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-8" />
        </div>
      </section>
    </div>
  );
}
