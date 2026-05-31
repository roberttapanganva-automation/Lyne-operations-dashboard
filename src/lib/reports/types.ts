export type ReportsRange = "7d" | "30d" | "90d" | "this_month";

export type ReportsRangeOption = {
  href: string;
  key: ReportsRange;
  label: string;
};

export const reportsRangeOptions: ReportsRangeOption[] = [
  { href: "/reports?range=7d", key: "7d", label: "7 Days" },
  { href: "/reports?range=30d", key: "30d", label: "30 Days" },
  { href: "/reports?range=90d", key: "90d", label: "90 Days" },
  { href: "/reports?range=this_month", key: "this_month", label: "This Month" },
];

export function normalizeReportsRange(value?: string | null): ReportsRange {
  if (
    value === "7d" ||
    value === "30d" ||
    value === "90d" ||
    value === "this_month"
  ) {
    return value;
  }

  return "30d";
}

export type ReportBreakdownItem<TStatus extends string = string> = {
  color?: string;
  count: number;
  id?: string;
  label: string;
  status: TStatus;
};

export type ReportsOverview = {
  automations: {
    byStatus: Array<
      ReportBreakdownItem<"success" | "failed" | "pending" | "skipped">
    >;
    recentFailures: Array<{
      automation_type: string;
      created_at: string;
      error_message: string | null;
      id: string;
      related_type: string;
      status: "failed";
    }>;
    successRate: number;
    total: number;
  };
  currencyCode: string;
  generatedAt: string;
  jobs: {
    byPaymentStatus: Array<ReportBreakdownItem>;
    byStatus: Array<ReportBreakdownItem>;
    estimatedRevenue: number;
    total: number;
  };
  kpis: {
    automationSuccessRate: number;
    completedTasks: number;
    estimatedRevenue: number;
    jobsBooked: number;
    newLeads: number;
  };
  leads: {
    bySource: Array<ReportBreakdownItem>;
    byStage: Array<ReportBreakdownItem>;
    byStatus: Array<ReportBreakdownItem>;
    total: number;
  };
  range: ReportsRange;
  rangeEnd: string;
  rangeLabel: string;
  rangeStart: string;
  tasks: {
    completed: number;
    completedTrend: Array<{
      count: number;
      label: string;
    }>;
    open: number;
    overdue: number;
  };
  workspace: {
    id: string;
    name: string;
    role: string;
  };
};
