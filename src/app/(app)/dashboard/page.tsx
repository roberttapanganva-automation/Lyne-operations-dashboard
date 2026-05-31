import {
  BriefcaseIcon,
  CurrencyDollarIcon,
  ListChecksIcon,
  UserPlusIcon,
} from "@phosphor-icons/react/ssr";
import { AIAssistantCard } from "@/components/dashboard/AIAssistantCard";
import { PipelineOverview } from "@/components/dashboard/PipelineOverview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { RevenueOverview } from "@/components/dashboard/RevenueOverview";
import { StatCard } from "@/components/dashboard/StatCard";
import { TasksOverview } from "@/components/dashboard/TasksOverview";
import { TodayAgenda } from "@/components/dashboard/TodayAgenda";
import { formatCurrency } from "@/lib/formatting/currency";
import { getDashboardOverview } from "@/lib/dashboard/queries";

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  const stats = [
    {
      description: "Leads created in the current month.",
      icon: UserPlusIcon,
      title: "New Leads",
      tone: "primary" as const,
      value: String(overview.kpis.newLeadsThisMonth),
    },
    {
      description: "Non-cancelled jobs created or scheduled this month.",
      icon: BriefcaseIcon,
      title: "Jobs Booked",
      tone: "info" as const,
      value: String(overview.kpis.jobsBookedThisMonth),
    },
    {
      description: "Estimated job value for this month.",
      icon: CurrencyDollarIcon,
      title: "Revenue (Est.)",
      tone: "success" as const,
      value: formatCurrency(
        overview.kpis.estimatedRevenueThisMonth,
        overview.kpis.currencyCode,
      ),
    },
    {
      description: "Tasks past due that are not done or cancelled.",
      icon: ListChecksIcon,
      title: "Overdue Tasks",
      tone: "warning" as const,
      value: String(overview.kpis.overdueTasks),
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-[var(--ops-primary-dark)]">
          What needs attention today?
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-normal text-[var(--ops-text)] sm:text-3xl">
          Your operations command center is live.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ops-text-soft)]">
          Track today’s priorities, open work, pipeline activity, and key business updates in one place.
        </p>
      </section>

      <section
        aria-label="Dashboard metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <PipelineOverview
          currencyCode={overview.workspace.currencyCode}
          summary={overview.pipeline}
        />
        <TodayAgenda items={overview.agendaItems} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <TasksOverview summary={overview.taskSummary} />
        <RevenueOverview summary={overview.revenue} />
        <RecentActivity items={overview.recentActivity} />
      </section>

      <section>
        <AIAssistantCard />
      </section>
    </div>
  );
}
