"use client";

import { CalendarBlankIcon } from "@phosphor-icons/react";
import { useMemo } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";
import {
  buildCalendarMonthCells,
  getCalendarWeekdayLabels,
} from "@/lib/calendar/utils";

type CalendarMonthViewProps = {
  activeMonth: string;
  events: CalendarEvent[];
  expandedDateKey: string | null;
  onEventSelect: (event: CalendarEvent) => void;
  onExpandDate: (dateKey: string | null) => void;
  timezone: string;
};

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function getEventChipStyles(event: CalendarEvent) {
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

export function CalendarMonthView({
  activeMonth,
  events,
  expandedDateKey,
  onEventSelect,
  onExpandDate,
  timezone,
}: CalendarMonthViewProps) {
  const weekdayLabels = getCalendarWeekdayLabels();
  const cells = useMemo(
    () =>
      buildCalendarMonthCells({
        timezone,
        yearMonth: activeMonth,
      }),
    [activeMonth, timezone],
  );
  const eventsByDateKey = useMemo(() => {
    const nextMap = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const list = nextMap.get(event.date_key) ?? [];
      list.push(event);
      nextMap.set(event.date_key, list);
    }

    return nextMap;
  }, [events]);
  const mobileAgenda = useMemo(
    () => cells.filter((cell) => (eventsByDateKey.get(cell.dateKey)?.length ?? 0) > 0),
    [cells, eventsByDateKey],
  );

  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-5 py-6 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
            <CalendarBlankIcon aria-hidden="true" size={22} weight="duotone" />
          </div>
          <h3 className="mt-3 text-base font-semibold text-[var(--ops-text)]">
            No appointments or scheduled jobs this month.
          </h3>
          <p className="mt-1 text-sm leading-6 text-[var(--ops-text-soft)]">
            New appointments and scheduled jobs will appear in the calendar grid
            when they are added to the workspace.
          </p>
        </div>
      ) : null}

      <div className="md:hidden">
        {mobileAgenda.length === 0 ? (
          <div className="rounded-2xl border border-[var(--ops-border)] bg-white p-4 text-sm text-[var(--ops-text-soft)] shadow-sm">
            This month has no dated calendar items yet.
          </div>
        ) : (
          <div className="space-y-3">
            {mobileAgenda.map((cell) => {
              const dayEvents = eventsByDateKey.get(cell.dateKey) ?? [];

              return (
                <section
                  className="rounded-2xl border border-[var(--ops-border)] bg-white p-4 shadow-sm"
                  key={cell.dateKey}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ops-text)]">
                        {new Intl.DateTimeFormat("en-US", {
                          dateStyle: "full",
                        }).format(new Date(`${cell.dateKey}T12:00:00Z`))}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        {dayEvents.length}{" "}
                        {dayEvents.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    {dayEvents.map((event) => (
                      <button
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition ${getEventChipStyles(
                          event,
                        )}`}
                        key={event.id}
                        onClick={() => onEventSelect(event)}
                        type="button"
                      >
                        <span className="truncate">{event.title}</span>
                        <span className="ml-3 shrink-0 text-xs font-semibold">
                          {formatTime(event.starts_at, timezone)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[var(--ops-border)] bg-white md:block">
        <div className="grid grid-cols-7 border-b border-[var(--ops-border)] bg-[var(--ops-card-soft)]">
          {weekdayLabels.map((label) => (
            <div
              className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]"
              key={label}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayEvents = eventsByDateKey.get(cell.dateKey) ?? [];
            const showAllEvents = expandedDateKey === cell.dateKey;
            const visibleEvents = showAllEvents ? dayEvents : dayEvents.slice(0, 3);
            const hiddenCount = dayEvents.length - visibleEvents.length;

            return (
              <div
                className={`min-h-[148px] border-b border-r border-[var(--ops-border)] px-2 py-2 ${
                  cell.isCurrentMonth ? "bg-white" : "bg-[var(--ops-card-soft)]/65"
                }`}
                key={cell.dateKey}
              >
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span
                    className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-semibold ${
                      cell.isToday
                        ? "bg-[var(--workspace-primary,var(--ops-primary))] text-white"
                        : cell.isCurrentMonth
                          ? "text-[var(--ops-text)]"
                          : "text-[var(--ops-text-muted)]"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                  {dayEvents.length > 0 ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                      {dayEvents.length}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  {visibleEvents.map((event) => (
                    <button
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition hover:brightness-95 ${getEventChipStyles(
                        event,
                      )}`}
                      key={event.id}
                      onClick={() => onEventSelect(event)}
                      type="button"
                    >
                      <span className="min-w-0 truncate">{event.title}</span>
                      <span className="shrink-0 text-[10px] font-semibold opacity-80">
                        {formatTime(event.starts_at, timezone)}
                      </span>
                    </button>
                  ))}

                  {hiddenCount > 0 ? (
                    <button
                      className="inline-flex h-7 items-center rounded-lg px-2 text-[11px] font-semibold text-[var(--workspace-primary,var(--ops-primary))] transition hover:bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]"
                      onClick={() =>
                        onExpandDate(showAllEvents ? null : cell.dateKey)
                      }
                      type="button"
                    >
                      {showAllEvents ? "Show less" : `+${hiddenCount} more`}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
