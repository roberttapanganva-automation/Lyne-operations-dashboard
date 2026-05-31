"use client";

import {
  BriefcaseIcon,
  CalendarBlankIcon,
  ClockIcon,
  MapPinIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";
import { formatDateKeyInTimeZone, getTodayDateKey } from "@/lib/calendar/utils";

type CalendarDayViewProps = {
  activeDateKey: string;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  timezone: string;
};

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function formatEventTimeRange(event: CalendarEvent, timezone: string) {
  const start = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(event.starts_at));

  if (!event.ends_at) {
    return start;
  }

  const end = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(event.ends_at));

  return `${start} - ${end}`;
}

function getEventStyles(event: CalendarEvent) {
  if (event.type === "job") {
    return "border-[var(--ops-info-soft)] bg-[var(--ops-info-soft)]/60";
  }

  if (event.status === "completed") {
    return "border-[var(--ops-success-soft)] bg-[var(--ops-success-soft)]/60";
  }

  if (event.status === "cancelled" || event.status === "no_show") {
    return "border-[var(--ops-danger-soft)] bg-[var(--ops-danger-soft)]/60";
  }

  return "border-[var(--workspace-primary-soft,var(--ops-primary-soft))] bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]/75";
}

export function CalendarDayView({
  activeDateKey,
  events,
  onEventSelect,
  timezone,
}: CalendarDayViewProps) {
  const dayEvents = useMemo(
    () =>
      events.filter(
        (event) => formatDateKeyInTimeZone(event.starts_at, timezone) === activeDateKey,
      ),
    [activeDateKey, events, timezone],
  );
  const isToday = activeDateKey === getTodayDateKey(timezone);

  if (dayEvents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-5 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
          <CalendarBlankIcon aria-hidden="true" size={24} weight="duotone" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[var(--ops-text)]">
          No appointments or scheduled jobs on this day.
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
          Real workspace events will appear here once something is scheduled for{" "}
          {formatDateLabel(activeDateKey)}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--ops-border)] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
              {isToday ? "Today" : "Selected day"}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--ops-text)]">
              {formatDateLabel(activeDateKey)}
            </h3>
          </div>
          <div className="rounded-full bg-[var(--ops-card-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
            {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {dayEvents.map((event) => (
          <button
            className={`w-full rounded-2xl border p-4 text-left shadow-sm transition hover:border-[var(--workspace-primary,var(--ops-primary))] hover:shadow-md sm:p-5 ${getEventStyles(
              event,
            )}`}
            key={event.id}
            onClick={() => onEventSelect(event)}
            type="button"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    {event.type === "appointment" ? (
                      <CalendarBlankIcon aria-hidden="true" size={13} weight="duotone" />
                    ) : (
                      <BriefcaseIcon aria-hidden="true" size={13} weight="duotone" />
                    )}
                    {event.type === "appointment" ? "Appointment" : "Scheduled job"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    <ClockIcon aria-hidden="true" size={13} weight="duotone" />
                    {formatEventTimeRange(event, timezone)}
                  </span>
                </div>

                <h4 className="mt-3 text-base font-semibold text-[var(--ops-text)]">
                  {event.title}
                </h4>

                <div className="mt-3 grid gap-2 text-sm text-[var(--ops-text-soft)] sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <UserCircleIcon aria-hidden="true" size={16} weight="duotone" />
                    <span className="truncate">
                      {event.client_name ?? "No client linked"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPinIcon aria-hidden="true" size={16} weight="duotone" />
                    <span className="truncate">{event.location ?? "Location not set"}</span>
                  </div>
                </div>
              </div>

              {event.assigned_member_name ? (
                <div className="rounded-xl bg-white/80 px-3 py-2 text-sm text-[var(--ops-text)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    Assigned
                  </p>
                  <p className="mt-1 font-medium">{event.assigned_member_name}</p>
                </div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
