"use client";

import * as Popover from "@radix-ui/react-popover";
import {
  CalendarBlankIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  GearSixIcon,
  ListBulletsIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AddAppointmentDialog } from "@/components/calendar/AddAppointmentDialog";
import { CalendarEventDetailsDialog } from "@/components/calendar/CalendarEventDetailsDialog";
import { CalendarList } from "@/components/calendar/CalendarList";
import { CalendarManageViewPanel } from "@/components/calendar/CalendarManageViewPanel";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { CalendarFilter } from "@/components/calendar/CalendarToolbar";
import type {
  CalendarEvent,
  CalendarFilterMember,
  CalendarManageViewType,
  CalendarMonthData,
  CalendarPageTab,
  CalendarViewMode,
} from "@/lib/calendar/types";
import {
  formatDateKeyInTimeZone,
  getCalendarViewRange,
  getTodayDateKey,
} from "@/lib/calendar/utils";

type CalendarWorkspaceViewProps = {
  activeDateKey: string;
  activeFilter: CalendarFilter;
  activeMonth: string;
  activeTab: CalendarPageTab;
  activeViewMode: CalendarViewMode;
  canAssignJobs: boolean;
  canCreateRecords: boolean;
  canDeleteRecords: boolean;
  canEditRecords: boolean;
  canFilterMembers: boolean;
  listAppointments: CalendarMonthData["visible_appointments"];
  monthData: CalendarMonthData;
  timezone: string;
};

const tabs: Array<{
  icon: typeof CalendarBlankIcon;
  label: string;
  value: CalendarPageTab;
}> = [
  { icon: CalendarBlankIcon, label: "Calendar View", value: "calendar" },
  { icon: ListBulletsIcon, label: "Appointment List View", value: "list" },
  { icon: GearSixIcon, label: "Calendar Settings", value: "settings" },
];

const listFilters: Array<{ label: string; value: CalendarFilter }> = [
  { label: "Today", value: "today" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Completed", value: "completed" },
];

const viewOptions: Array<{
  description: string;
  disabled?: boolean;
  label: string;
  value: CalendarViewMode;
}> = [
  {
    description: "Coming later",
    disabled: true,
    label: "Day view",
    value: "day",
  },
  {
    description: "Coming later",
    disabled: true,
    label: "Week view",
    value: "week",
  },
  {
    description: "Current working view",
    label: "Month view",
    value: "month",
  },
];

function getInitialSourceSelection() {
  return { appointments: true, jobs: true };
}

function filterAppointmentsForList({
  activeFilter,
  appointments,
  timezone,
}: {
  activeFilter: CalendarFilter;
  appointments: CalendarMonthData["visible_appointments"];
  timezone: string;
}) {
  const now = new Date();
  const todayKey = getTodayDateKey(timezone);

  if (activeFilter === "today") {
    return appointments.filter(
      (appointment) =>
        appointment.status !== "cancelled" &&
        formatDateKeyInTimeZone(appointment.starts_at, timezone) === todayKey,
    );
  }

  if (activeFilter === "completed") {
    return appointments.filter((appointment) => appointment.status === "completed");
  }

  return appointments.filter(
    (appointment) =>
      appointment.status !== "completed" &&
      appointment.status !== "cancelled" &&
      new Date(appointment.starts_at).getTime() >= now.getTime(),
  );
}

function deriveViewType({
  appointments,
  jobs,
}: {
  appointments: boolean;
  jobs: boolean;
}): CalendarManageViewType {
  if (appointments && jobs) {
    return "all";
  }

  if (appointments) {
    return "appointments";
  }

  return "scheduled_jobs";
}

function formatMemberSearch(members: CalendarFilterMember[], search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return members;
  }

  return members.filter((member) => {
    const haystack = `${member.label} ${member.email ?? ""} ${member.role}`.toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}

function getFilterHref({
  dateKey,
  filter,
  month,
  view,
}: {
  dateKey: string;
  filter: CalendarFilter;
  month: string;
  view: CalendarViewMode;
}) {
  const params = new URLSearchParams({
    date: dateKey,
    month,
    tab: "list",
    view,
  });

  if (filter !== "upcoming") {
    params.set("filter", filter);
  }

  return `/calendar?${params.toString()}`;
}

function getViewModeLabel(view: CalendarViewMode) {
  if (view === "day") {
    return "Day view";
  }

  if (view === "week") {
    return "Week view";
  }

  return "Month view";
}

function CalendarViewSelector({
  activeViewMode,
  onSelect,
}: {
  activeViewMode: CalendarViewMode;
  onSelect: (view: CalendarViewMode) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root onOpenChange={setOpen} open={open}>
      <Popover.Trigger asChild>
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--ops-border)] bg-white px-3 text-sm font-medium text-[var(--ops-text)] shadow-sm transition hover:bg-[var(--ops-card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
          type="button"
        >
          <CalendarBlankIcon aria-hidden="true" size={16} weight="duotone" />
          <span>{getViewModeLabel(activeViewMode)}</span>
          <CaretDownIcon
            aria-hidden="true"
            className={`transition ${open ? "rotate-180" : ""}`}
            size={14}
            weight="bold"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className="z-[70] w-64 rounded-2xl border border-[var(--ops-border)] bg-white p-2 shadow-2xl"
          collisionPadding={16}
          sideOffset={8}
        >
          <div className="space-y-1" role="menu">
            {viewOptions.map((option) => {
              const active = option.value === activeViewMode;

              return (
                <button
                  aria-checked={active}
                  aria-disabled={option.disabled ? "true" : undefined}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                    option.disabled
                      ? "cursor-not-allowed opacity-55"
                      : active
                        ? "bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]"
                        : "hover:bg-[var(--ops-card-soft)]"
                  }`}
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => {
                    if (option.disabled) {
                      return;
                    }

                    onSelect(option.value);
                    setOpen(false);
                  }}
                  role="menuitemradio"
                  type="button"
                >
                  <div>
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {option.label}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--ops-text-soft)]">
                      {option.description}
                    </p>
                  </div>
                  {active ? (
                    <CheckIcon
                      aria-hidden="true"
                      className="text-[var(--workspace-primary,var(--ops-primary))]"
                      size={16}
                      weight="bold"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function CalendarWorkspaceView({
  activeDateKey,
  activeFilter,
  activeMonth,
  activeTab,
  activeViewMode,
  canAssignJobs,
  canCreateRecords,
  canDeleteRecords,
  canEditRecords,
  canFilterMembers,
  listAppointments: appointmentListItems,
  monthData,
  timezone,
}: CalendarWorkspaceViewProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [desktopManageOpen, setDesktopManageOpen] = useState(false);
  const [mobileManageOpen, setMobileManageOpen] = useState(false);
  const [expandedDateKey, setExpandedDateKey] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [sourceSelection, setSourceSelection] = useState(getInitialSourceSelection());
  const viewRange = useMemo(
    () =>
      getCalendarViewRange({
        dateKey: activeDateKey,
        view: activeViewMode,
        yearMonth: activeMonth,
      }),
    [activeDateKey, activeMonth, activeViewMode],
  );
  const filteredMembers = useMemo(
    () => formatMemberSearch(monthData.filter_members, memberSearch),
    [memberSearch, monthData.filter_members],
  );
  const listAppointments = useMemo(
    () =>
      filterAppointmentsForList({
        activeFilter,
        appointments: appointmentListItems,
        timezone,
      }),
    [activeFilter, appointmentListItems, timezone],
  );
  const visibleViewType = deriveViewType(sourceSelection);
  const filteredEvents = useMemo(() => {
    const jobsById = new Map(
      monthData.events
        .filter((event) => event.type === "job" && event.job)
        .map((event) => [event.source_record_id, event.job]),
    );
    const selectedMember = monthData.filter_members.find(
      (member) => member.id === selectedMemberId,
    );

    return monthData.events.filter((event) => {
      if (!sourceSelection.appointments && event.type === "appointment") {
        return false;
      }

      if (!sourceSelection.jobs && event.type === "job") {
        return false;
      }

      if (!selectedMember) {
        return true;
      }

      if (event.type === "job") {
        return event.assigned_member_id === selectedMember.id;
      }

      if (event.appointment?.created_by === selectedMember.user_id) {
        return true;
      }

      if (event.appointment?.job_id) {
        return (
          jobsById.get(event.appointment.job_id)?.assigned_member_id ===
          selectedMember.id
        );
      }

      return false;
    });
  }, [monthData.events, monthData.filter_members, selectedMemberId, sourceSelection]);
  const manageOpen = desktopManageOpen || mobileManageOpen;

  function updateSearchParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (!value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleRangeChange(direction: "previous" | "next") {
    const nextDateKey =
      direction === "previous" ? viewRange.previousDateKey : viewRange.nextDateKey;
    const nextMonthKey =
      direction === "previous" ? viewRange.previousMonthKey : viewRange.nextMonthKey;

    updateSearchParams({
      date: nextDateKey,
      month: activeViewMode === "month" ? nextMonthKey : nextDateKey.slice(0, 7),
      tab: activeTab,
      view: activeViewMode,
    });
  }

  function handleTodayClick() {
    const todayDateKey = getTodayDateKey(timezone);

    updateSearchParams({
      date: todayDateKey,
      month: todayDateKey.slice(0, 7),
      tab: activeTab,
      view: activeViewMode,
    });
  }

  function handleSourceToggle(source: "appointment" | "job", checked: boolean) {
    setSourceSelection((current) => {
      const nextSelection =
        source === "appointment"
          ? {
              ...current,
              appointments: checked,
            }
          : {
              ...current,
              jobs: checked,
            };

      if (!nextSelection.appointments && !nextSelection.jobs) {
        return current;
      }

      return nextSelection;
    });
  }

  function handleViewModeChange(nextView: CalendarViewMode) {
    if (nextView !== "month") {
      return;
    }

    updateSearchParams({
      date: activeDateKey,
      filter: null,
      month: activeDateKey.slice(0, 7),
      tab: "calendar",
      view: nextView,
    });
  }

  function handleViewTypeChange(value: CalendarManageViewType) {
    if (value === "all") {
      setSourceSelection({ appointments: true, jobs: true });
      return;
    }

    if (value === "appointments") {
      setSourceSelection({ appointments: true, jobs: false });
      return;
    }

    setSourceSelection({ appointments: false, jobs: true });
  }

  function handleManageViewToggle() {
    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      setMobileManageOpen((current) => !current);
      return;
    }

    setDesktopManageOpen((current) => !current);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <div
          aria-label="Calendar sections"
          className="flex flex-wrap gap-2"
          role="tablist"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.value;
            const params = new URLSearchParams(searchParams.toString());
            params.set("date", activeDateKey);
            params.set("month", activeMonth);
            params.set("tab", tab.value);
            params.set("view", activeViewMode);

            if (tab.value !== "list") {
              params.delete("filter");
            }

            return (
              <Link
                aria-selected={active}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] font-semibold transition ${
                  active
                    ? "bg-[var(--workspace-primary,var(--ops-primary))] text-white shadow-[0_10px_24px_var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    : "bg-[var(--ops-card-soft)] text-[var(--ops-text-soft)] hover:text-[var(--ops-text)]"
                }`}
                href={`/calendar?${params.toString()}`}
                key={tab.value}
                role="tab"
              >
                <tab.icon aria-hidden="true" size={16} weight="duotone" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {activeTab === "calendar" ? (
          <Card className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <Button onClick={handleTodayClick} type="button" variant="secondary">
                  Today
                </Button>
                <div className="flex items-center gap-2">
                  <button
                    aria-label={`Previous ${activeViewMode}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--ops-border)] bg-white text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
                    onClick={() => handleRangeChange("previous")}
                    type="button"
                  >
                    <CaretLeftIcon aria-hidden="true" size={18} weight="bold" />
                  </button>
                  <div className="min-w-[170px] rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-4 py-2 text-center shadow-sm">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {viewRange.label}
                    </p>
                  </div>
                  <button
                    aria-label={`Next ${activeViewMode}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--ops-border)] bg-white text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
                    onClick={() => handleRangeChange("next")}
                    type="button"
                  >
                    <CaretRightIcon aria-hidden="true" size={18} weight="bold" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <CalendarViewSelector
                  activeViewMode={activeViewMode}
                  onSelect={handleViewModeChange}
                />
                <Button
                  aria-expanded={manageOpen}
                  onClick={handleManageViewToggle}
                  type="button"
                  variant="secondary"
                >
                  <SlidersHorizontalIcon
                    aria-hidden="true"
                    size={16}
                    weight="regular"
                  />
                  <span className="ml-2">Manage view</span>
                </Button>
                {canCreateRecords ? (
                  <AddAppointmentDialog className="h-10 w-full sm:w-auto" />
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      {activeTab === "list" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {listFilters.map((filter) => (
                <Link
                  className={`inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
                    activeFilter === filter.value
                      ? "bg-[var(--ops-primary)] text-white shadow-[0_10px_24px_var(--ops-primary-glow)]"
                      : "text-[var(--ops-text-soft)] hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                  }`}
                  href={getFilterHref({
                    dateKey: activeDateKey,
                    filter: filter.value,
                    month: activeMonth,
                    view: activeViewMode,
                  })}
                  key={filter.value}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
            {canCreateRecords ? (
              <AddAppointmentDialog className="h-9 w-full sm:w-auto" />
            ) : null}
          </div>
          <Card className="overflow-hidden">
            <CalendarList
              appointments={listAppointments}
              canCreateRecords={canCreateRecords}
              canDeleteRecords={canDeleteRecords}
            />
          </Card>
        </div>
      ) : null}

      {activeTab === "settings" ? (
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
              <GearSixIcon aria-hidden="true" size={22} weight="duotone" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                  Calendar settings
                </h2>
                <Badge variant="info">Coming later</Badge>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
                Month view is now live. Day and week layouts, saved filters, and
                deeper calendar controls are still deferred so this page stays
                focused on real workspace data and safe role boundaries.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                Current month
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--ops-text)]">
                {viewRange.label}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                Workspace timezone
              </p>
              <p className="mt-2 text-base font-semibold text-[var(--ops-text)]">
                {timezone}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {activeTab === "calendar" ? (
        <div className={`grid gap-5 ${desktopManageOpen ? "xl:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
          <div className="space-y-4">
            {activeViewMode === "month" ? (
              <CalendarMonthView
                activeMonth={viewRange.monthKey}
                events={filteredEvents}
                expandedDateKey={expandedDateKey}
                onEventSelect={setSelectedEvent}
                onExpandDate={setExpandedDateKey}
                timezone={timezone}
              />
            ) : null}
          </div>

          {desktopManageOpen ? (
            <div className="hidden xl:block">
              <CalendarManageViewPanel
                canFilterMembers={canFilterMembers}
                filteredMembers={filteredMembers}
                onMemberSearchChange={setMemberSearch}
                onSelectedMemberChange={setSelectedMemberId}
                onSourceToggle={handleSourceToggle}
                onViewTypeChange={handleViewTypeChange}
                selectedMemberId={selectedMemberId}
                sourceSelection={sourceSelection}
                viewType={visibleViewType}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "calendar" && mobileManageOpen ? (
        <div className="xl:hidden">
          <div
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => setMobileManageOpen(false)}
          />
          <div
            aria-labelledby="calendar-manage-view-title"
            aria-modal="true"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[1.5rem] border border-b-0 border-[var(--ops-border)] bg-[var(--ops-page)] px-4 pb-6 pt-4 shadow-2xl"
            role="dialog"
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--ops-border)]" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-base font-semibold text-[var(--ops-text)]"
                  id="calendar-manage-view-title"
                >
                  Manage view
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Filter the calendar without changing saved settings.
                </p>
              </div>
              <button
                aria-label="Close manage view panel"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--ops-border)] bg-white text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
                onClick={() => setMobileManageOpen(false)}
                type="button"
              >
                <XIcon aria-hidden="true" size={18} weight="regular" />
              </button>
            </div>
            <CalendarManageViewPanel
              canFilterMembers={canFilterMembers}
              filteredMembers={filteredMembers}
              onMemberSearchChange={setMemberSearch}
              onSelectedMemberChange={setSelectedMemberId}
              onSourceToggle={handleSourceToggle}
              onViewTypeChange={handleViewTypeChange}
              selectedMemberId={selectedMemberId}
              sourceSelection={sourceSelection}
              viewType={visibleViewType}
            />
          </div>
        </div>
      ) : null}

      <CalendarEventDetailsDialog
        canAssignJobs={canAssignJobs}
        canEditRecords={canEditRecords}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        timezone={timezone}
      />
    </div>
  );
}
