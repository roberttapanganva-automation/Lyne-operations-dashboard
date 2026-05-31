"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  buildCalendarWeekCells,
  formatDateKeyInTimeZone,
  getTodayDateKey,
} from "@/lib/calendar/utils";

type CalendarWeekViewProps = {
  activeDateKey: string;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
  timezone: string;
};

function formatEventTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatDayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

function getEventStyles(event: CalendarEvent) {
  if (event.type === "job") {
    return "border border-[var(--ops-info-soft)] bg-[var(--ops-info-soft)]/75 text-[var(--ops-info)]";
  }

  if (event.status === "completed") {
    return "border border-[var(--ops-success-soft)] bg-[var(--ops-success-soft)]/75 text-[var(--ops-success)]";
  }

  if (event.status === "cancelled" || event.status === "no_show") {
    return "border border-[var(--ops-danger-soft)] bg-[var(--ops-danger-soft)]/75 text-[var(--ops-danger)]";
  }

  return "border border-[var(--workspace-primary-soft,var(--ops-primary-soft))] bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]";
}

export function CalendarWeekView({
  activeDateKey,
  events,
  onEventSelect,
  timezone,
}: CalendarWeekViewProps) {
  const weekCells = useMemo(
    () =>
      buildCalendarWeekCells({
        dateKey: activeDateKey,
        timezone,
      }),
    [activeDateKey, timezone],
  );
  const eventsByDateKey = useMemo(() => {
    const nextMap = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const dateKey = formatDateKeyInTimeZone(event.starts_at, timezone);
      const list = nextMap.get(dateKey) ?? [];
      list.push(event);
      nextMap.set(dateKey, list);
    }

    return nextMap;
  }, [events, timezone]);
  const todayKey = getTodayDateKey(timezone);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-5 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
          <CalendarBlankIcon aria-hidden="true" size={24} weight="duotone" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[var(--ops-text)]">
          No appointments or scheduled jobs this week.
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
          Your live workspace schedule will appear here as appointments and job
          visits are added.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="xl:hidden">
        <div className="space-y-3">
          {weekCells.map((cell) => {
            const dayEvents = eventsByDateKey.get(cell.dateKey) ?? [];

            return (
              <section
                className="rounded-2xl border border-[var(--ops-border)] bg-white p-4 shadow-sm"
                key={cell.dateKey}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ops-text)]">
                      {formatDayLabel(cell.dateKey)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      {dayEvents.length === 0
                        ? "No scheduled items"
                        : `${dayEvents.length} ${dayEvents.length === 1 ? "item" : "items"}`}
                    </p>
                  </div>
                  {cell.dateKey === todayKey ? (
                    <span className="rounded-full bg-[var(--workspace-primary,var(--ops-primary))] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                      Today
                    </span>
                  ) : null}
                </div>

                {dayEvents.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-[var(--ops-border)] px-3 py-3 text-sm text-[var(--ops-text-soft)]">
                    No appointments or scheduled jobs on this day.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {dayEvents.map((event) => (
                      <button
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${getEventStyles(
                          event,
                        )}`}
                        key={event.id}
                        onClick={() => onEventSelect(event)}
                        type="button"
                      >
                        <span className="min-w-0 truncate">{event.title}</span>
                        <span className="shrink-0 text-xs font-semibold">
                          {formatEventTime(event.starts_at, timezone)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[var(--ops-border)] bg-white xl:block">
        <div className="grid grid-cols-7 border-b border-[var(--ops-border)] bg-[var(--ops-card-soft)]">
          {weekCells.map((cell) => (
            <div
              className="border-r border-[var(--ops-border)] px-3 py-3 last:border-r-0"
              key={cell.dateKey}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                {cell.label}
              </p>
              <p
                className={`mt-2 inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-semibold ${
                  cell.isToday
                    ? "bg-[var(--workspace-primary,var(--ops-primary))] text-white"
                    : "text-[var(--ops-text)]"
                }`}
              >
                {cell.dayNumber}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {weekCells.map((cell) => {
            const dayEvents = eventsByDateKey.get(cell.dateKey) ?? [];

            return (
              <div
                className="min-h-[520px] border-r border-[var(--ops-border)] px-2 py-3 last:border-r-0"
                key={cell.dateKey}
              >
                {dayEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--ops-border)] bg-[var(--ops-card-soft)]/55 px-3 py-4 text-center text-xs text-[var(--ops-text-soft)]">
                    No events
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <button
                        className={`flex w-full flex-col items-start gap-1 rounded-xl px-3 py-2 text-left transition hover:brightness-95 ${getEventStyles(
                          event,
                        )}`}
                        key={event.id}
                        onClick={() => onEventSelect(event)}
                        type="button"
                      >
                        <span className="w-full truncate text-xs font-semibold uppercase tracking-[0.14em] opacity-75">
                          {formatEventTime(event.starts_at, timezone)}
                        </span>
                        <span className="w-full truncate text-sm font-semibold">
                          {event.title}
                        </span>
                        {event.client_name ? (
                          <span className="w-full truncate text-xs opacity-80">
                            {event.client_name}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
