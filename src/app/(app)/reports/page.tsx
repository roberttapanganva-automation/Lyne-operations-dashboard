import { Card } from "@/components/ui/Card";
import { ReportsOverviewClient } from "@/components/reports/ReportsOverviewClient";
import { canViewReports } from "@/lib/permissions/workspace";
import { normalizeReportsRange } from "@/lib/reports/types";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";

type ReportsPageProps = {
  searchParams?: Promise<{
    range?: string | string[];
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rangeParam = Array.isArray(resolvedSearchParams.range)
    ? resolvedSearchParams.range[0]
    : resolvedSearchParams.range;

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return (
      <Card className="p-6">
        <p className="text-sm font-semibold text-[var(--ops-text)]">
          Reports unavailable
        </p>
        <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
          {activeWorkspace.error ??
            "We could not load the active workspace for reports."}
        </p>
      </Card>
    );
  }

  if (!canViewReports(activeWorkspace.context.role)) {
    return (
      <Card className="p-6">
        <p className="text-sm font-semibold text-[var(--ops-text)]">
          Reports unavailable
        </p>
        <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
          Reports are available to managers, admins, and owners.
        </p>
      </Card>
    );
  }

  return (
    <ReportsOverviewClient initialRange={normalizeReportsRange(rangeParam)} />
  );
}
