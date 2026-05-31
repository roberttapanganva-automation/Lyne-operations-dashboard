import type { CalendarViewMode } from "@/lib/calendar/types";

type CalendarMonthRange = {
  gridEnd: Date;
  gridEndExclusiveKey: string;
  gridStart: Date;
  gridStartKey: string;
  monthDate: Date;
  monthKey: string;
  nextMonthKey: string;
  previousMonthKey: string;
};

export type CalendarViewRange = {
  anchorDate: Date;
  anchorDateKey: string;
  label: string;
  monthKey: string;
  nextDateKey: string;
  nextMonthKey: string;
  previousDateKey: string;
  previousMonthKey: string;
  rangeEndDateExclusive: Date;
  rangeEndExclusiveKey: string;
  rangeStartDate: Date;
  rangeStartKey: string;
  view: CalendarViewMode;
};

export type CalendarDayCell = {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type CalendarWeekCell = {
  dateKey: string;
  dayNumber: number;
  isToday: boolean;
  label: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function normalizeYearMonth(value?: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  const today = new Date();

  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
}

export function normalizeDateKey(value?: string, fallbackYearMonth?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const fallbackMonth = normalizeYearMonth(fallbackYearMonth);
  return `${fallbackMonth}-01`;
}

export function getDateFromKey(dateKey: string) {
  return new Date(`${normalizeDateKey(dateKey)}T12:00:00Z`);
}

export function getMonthKeyFromDateKey(dateKey: string) {
  return normalizeDateKey(dateKey).slice(0, 7);
}

export function getMonthLabel(yearMonth: string) {
  const [year, month] = normalizeYearMonth(yearMonth).split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function toDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addUtcDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

export function getCalendarRange(yearMonth?: string): CalendarMonthRange {
  const normalized = normalizeYearMonth(yearMonth);
  const [year, month] = normalized.split("-").map(Number);
  const monthDate = new Date(Date.UTC(year, month - 1, 1));
  const gridStart = addUtcDays(monthDate, -monthDate.getUTCDay());
  const gridEnd = addUtcDays(gridStart, 42);
  const previousMonth = new Date(Date.UTC(year, month - 2, 1));
  const nextMonth = new Date(Date.UTC(year, month, 1));

  return {
    gridEnd,
    gridEndExclusiveKey: toDateKey(gridEnd),
    gridStart,
    gridStartKey: toDateKey(gridStart),
    monthDate,
    monthKey: normalized,
    nextMonthKey: `${nextMonth.getUTCFullYear()}-${pad(nextMonth.getUTCMonth() + 1)}`,
    previousMonthKey: `${previousMonth.getUTCFullYear()}-${pad(previousMonth.getUTCMonth() + 1)}`,
  };
}

function getWeekLabel(rangeStartDate: Date, rangeEndDateExclusive: Date) {
  const rangeEndDate = addUtcDays(rangeEndDateExclusive, -1);
  const startMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(rangeStartDate);
  const endMonthLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(rangeEndDate);
  const startDayLabel = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
  }).format(rangeStartDate);
  const endDayLabel = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
  }).format(rangeEndDate);
  const yearLabel = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
  }).format(rangeEndDate);

  if (rangeStartDate.getUTCMonth() === rangeEndDate.getUTCMonth()) {
    return `${startMonthLabel} ${startDayLabel} - ${endDayLabel}, ${yearLabel}`;
  }

  return `${startMonthLabel} ${startDayLabel} - ${endMonthLabel} ${endDayLabel}, ${yearLabel}`;
}

function getDayLabel(anchorDate: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
  }).format(anchorDate);
}

export function getCalendarViewRange({
  dateKey,
  view,
  yearMonth,
}: {
  dateKey?: string;
  view: CalendarViewMode;
  yearMonth?: string;
}): CalendarViewRange {
  if (view === "month") {
    const monthRange = getCalendarRange(yearMonth);
    const anchorDateKey = `${monthRange.monthKey}-01`;

    return {
      anchorDate: monthRange.monthDate,
      anchorDateKey,
      label: getMonthLabel(monthRange.monthKey),
      monthKey: monthRange.monthKey,
      nextDateKey: `${monthRange.nextMonthKey}-01`,
      nextMonthKey: monthRange.nextMonthKey,
      previousDateKey: `${monthRange.previousMonthKey}-01`,
      previousMonthKey: monthRange.previousMonthKey,
      rangeEndDateExclusive: monthRange.gridEnd,
      rangeEndExclusiveKey: monthRange.gridEndExclusiveKey,
      rangeStartDate: monthRange.gridStart,
      rangeStartKey: monthRange.gridStartKey,
      view,
    };
  }

  const anchorDate = getDateFromKey(normalizeDateKey(dateKey, yearMonth));
  const anchorDateKey = toDateKey(anchorDate);
  const monthKey = getMonthKeyFromDateKey(anchorDateKey);

  if (view === "day") {
    const nextDate = addUtcDays(anchorDate, 1);
    const previousDate = addUtcDays(anchorDate, -1);

    return {
      anchorDate,
      anchorDateKey,
      label: getDayLabel(anchorDate),
      monthKey,
      nextDateKey: toDateKey(nextDate),
      nextMonthKey: getMonthKeyFromDateKey(toDateKey(nextDate)),
      previousDateKey: toDateKey(previousDate),
      previousMonthKey: getMonthKeyFromDateKey(toDateKey(previousDate)),
      rangeEndDateExclusive: nextDate,
      rangeEndExclusiveKey: toDateKey(nextDate),
      rangeStartDate: anchorDate,
      rangeStartKey: anchorDateKey,
      view,
    };
  }

  const rangeStartDate = addUtcDays(anchorDate, -anchorDate.getUTCDay());
  const rangeEndDateExclusive = addUtcDays(rangeStartDate, 7);
  const nextAnchorDate = addUtcDays(anchorDate, 7);
  const previousAnchorDate = addUtcDays(anchorDate, -7);

  return {
    anchorDate,
    anchorDateKey,
    label: getWeekLabel(rangeStartDate, rangeEndDateExclusive),
    monthKey,
    nextDateKey: toDateKey(nextAnchorDate),
    nextMonthKey: getMonthKeyFromDateKey(toDateKey(nextAnchorDate)),
    previousDateKey: toDateKey(previousAnchorDate),
    previousMonthKey: getMonthKeyFromDateKey(toDateKey(previousAnchorDate)),
    rangeEndDateExclusive,
    rangeEndExclusiveKey: toDateKey(rangeEndDateExclusive),
    rangeStartDate,
    rangeStartKey: toDateKey(rangeStartDate),
    view,
  };
}

export function formatDateKeyInTimeZone(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  }
}

export function getTodayDateKey(timezone: string) {
  return formatDateKeyInTimeZone(new Date().toISOString(), timezone);
}

export function buildCalendarMonthCells({
  timezone,
  yearMonth,
}: {
  timezone: string;
  yearMonth?: string;
}) {
  const range = getCalendarRange(yearMonth);
  const todayKey = getTodayDateKey(timezone);
  const cells: CalendarDayCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const date = addUtcDays(range.gridStart, index);
    const dateKey = toDateKey(date);
    cells.push({
      dateKey,
      dayNumber: date.getUTCDate(),
      isCurrentMonth: dateKey.startsWith(range.monthKey),
      isToday: dateKey === todayKey,
    });
  }

  return cells;
}

export function buildCalendarWeekCells({
  dateKey,
  timezone,
}: {
  dateKey: string;
  timezone: string;
}) {
  const range = getCalendarViewRange({
    dateKey,
    view: "week",
  });
  const todayKey = getTodayDateKey(timezone);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addUtcDays(range.rangeStartDate, index);
    const resolvedDateKey = toDateKey(date);

    return {
      dateKey: resolvedDateKey,
      dayNumber: date.getUTCDate(),
      isToday: resolvedDateKey === todayKey,
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
      }).format(date),
    } satisfies CalendarWeekCell;
  });
}

export function getCalendarWeekdayLabels() {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

export function isImplementedCalendarView(view: CalendarViewMode) {
  return view === "month" || view === "week" || view === "day";
}
