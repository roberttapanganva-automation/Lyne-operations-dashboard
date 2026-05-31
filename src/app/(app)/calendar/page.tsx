import { Card } from "@/components/ui/Card";
import { CalendarWorkspaceView } from "@/components/calendar/CalendarWorkspaceView";
import {
  canCreateCalendarRecords,
  getCalendarMonthData,
  getVisibleAppointmentsForCalendarList,
} from "@/lib/calendar/queries";
import type {
  CalendarPageTab,
  CalendarViewMode,
} from "@/lib/calendar/types";
import { normalizeDateKey, normalizeYearMonth } from "@/lib/calendar/utils";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
  canAssignOperationalRecords,
  canDeleteOperationalRecords,
  canEditOperationalRecords,
} from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";

type CalendarFilter = "today" | "upcoming" | "completed";

type CalendarPageProps = {
  searchParams: Promise<{
    date?: string;
    filter?: string;
    month?: string;
    tab?: string;
    view?: string;
  }>;
};

function getCalendarFilter(value: string | undefined): CalendarFilter {
  if (value === "today" || value === "completed") {
    return value;
  }

  return "upcoming";
}

function getCalendarTab(value: string | undefined): CalendarPageTab {
  if (value === "list" || value === "settings") {
    return value;
  }

  return "calendar";
}

function getCalendarViewMode(value: string | undefined): CalendarViewMode {
  if (value === "month") {
    return value;
  }

  return "month";
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const activeTab = getCalendarTab(params.tab);
  const activeFilter = getCalendarFilter(params.filter);
  const activeMonth = normalizeYearMonth(params.month);
  const activeViewMode = getCalendarViewMode(params.view);
  const activeDateKey = normalizeDateKey(params.date, activeMonth);
  const activeWorkspace = await getActiveWorkspace();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (activeWorkspace.status !== "ready" || !user) {
    return (
      <Card className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-[var(--ops-text)]">
          Calendar unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
          We could not resolve an active workspace for this calendar view right now.
        </p>
      </Card>
    );
  }

  const rolePermission = await getEffectiveRolePermission({
    role: activeWorkspace.context.role,
    supabase,
    workspaceId: activeWorkspace.context.workspace.id,
  });
  const monthData = await getCalendarMonthData({
    activeWorkspace: activeWorkspace.context,
    currentUserId: user.id,
    dateKey: activeDateKey,
    supabase,
    viewMode: activeViewMode,
    yearMonth: activeMonth,
  });
  const listAppointments = await getVisibleAppointmentsForCalendarList({
    activeWorkspace: activeWorkspace.context,
    currentUserId: user.id,
    supabase,
  });
  const canCreateRecords = canCreateCalendarRecords({
    role: activeWorkspace.context.role,
    rolePermission,
  });
  const canDeleteRecords = canDeleteOperationalRecords(activeWorkspace.context.role);
  const canEditRecords = canEditOperationalRecords(activeWorkspace.context.role);
  const canAssignJobs = canAssignOperationalRecords(activeWorkspace.context.role);
  const canFilterMembers =
    activeWorkspace.context.role === "owner" ||
    activeWorkspace.context.role === "admin" ||
    activeWorkspace.context.role === "manager";

  return (
    <CalendarWorkspaceView
      activeDateKey={activeDateKey}
      activeFilter={activeFilter}
      activeMonth={activeMonth}
      activeTab={activeTab}
      activeViewMode={activeViewMode}
      canAssignJobs={canAssignJobs}
      canCreateRecords={canCreateRecords}
      canDeleteRecords={canDeleteRecords}
      canEditRecords={canEditRecords}
      canFilterMembers={canFilterMembers}
      listAppointments={listAppointments}
      monthData={monthData}
      timezone={activeWorkspace.context.workspace.timezone}
    />
  );
}
