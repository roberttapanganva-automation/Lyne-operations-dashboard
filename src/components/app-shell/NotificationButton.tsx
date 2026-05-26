"use client";

import { BellIcon } from "@phosphor-icons/react";
import {
  BriefcaseIcon,
  CalendarBlankIcon,
  CheckSquareIcon,
  GearSixIcon,
  KanbanIcon,
  PaletteIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import type { ActivityIconKey } from "@/lib/activity/presentation";

type NotificationItem = {
  category: string;
  detail: string;
  id: string;
  icon: ActivityIconKey;
  message: string;
  timestamp: string;
};

type NotificationButtonProps = {
  items: NotificationItem[];
};

const readNotificationsKey = "opspilot:read-notifications";
const readAllTimestampKey = "opspilot:notifications-read-all-at";
const notificationLifetimeInDays = 3;
const notificationStorageEvent = "opspilot:notifications-storage";

function getStoredNotificationSnapshot() {
  if (typeof window === "undefined") {
    return JSON.stringify({ readAllAt: 0, readIds: [] });
  }

  try {
    const storedReadAll = window.localStorage.getItem(readAllTimestampKey);
    const storedReadIds = window.localStorage.getItem(readNotificationsKey);

    return JSON.stringify({
      readAllAt: storedReadAll ? Number.parseInt(storedReadAll, 10) || 0 : 0,
      readIds: storedReadIds ? (JSON.parse(storedReadIds) as string[]) : [],
    });
  } catch {
    return JSON.stringify({ readAllAt: 0, readIds: [] });
  }
}

function subscribeToNotificationStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(notificationStorageEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(notificationStorageEvent, onStoreChange);
  };
}

function parseStoredNotificationSnapshot(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot) as {
      readAllAt?: unknown;
      readIds?: unknown;
    };

    return {
      readAllAt:
        typeof parsed.readAllAt === "number" && Number.isFinite(parsed.readAllAt)
          ? parsed.readAllAt
          : 0,
      readIds: new Set(
        Array.isArray(parsed.readIds)
          ? parsed.readIds.filter((id): id is string => typeof id === "string")
          : [],
      ),
    };
  } catch {
    return { readAllAt: 0, readIds: new Set<string>() };
  }
}

function emitNotificationStorageChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(notificationStorageEvent));
  }
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

function getNotificationTimestamp(item: NotificationItem) {
  const timestamp = new Date(item.timestamp).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getNotificationReadKey(item: NotificationItem) {
  return `${item.id}:${item.timestamp}`;
}

function NotificationItemIcon({ icon }: { icon: ActivityIconKey }) {
  const className = "text-[var(--workspace-primary,var(--ops-primary-dark))]";
  const iconProps = { className, size: 18, weight: "duotone" as const };

  switch (icon) {
    case "lead":
      return <UsersThreeIcon aria-hidden="true" {...iconProps} />;
    case "job":
      return <BriefcaseIcon aria-hidden="true" {...iconProps} />;
    case "task":
      return <CheckSquareIcon aria-hidden="true" {...iconProps} />;
    case "calendar":
      return <CalendarBlankIcon aria-hidden="true" {...iconProps} />;
    case "branding":
      return <PaletteIcon aria-hidden="true" {...iconProps} />;
    case "access":
      return <ShieldCheckIcon aria-hidden="true" {...iconProps} />;
    case "team":
      return <UsersThreeIcon aria-hidden="true" {...iconProps} />;
    case "pipeline":
      return <KanbanIcon aria-hidden="true" {...iconProps} />;
    default:
      return <GearSixIcon aria-hidden="true" {...iconProps} />;
  }
}

export function NotificationButton({ items }: NotificationButtonProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mountedAt] = useState(() => Date.now());
  const notificationSnapshot = useSyncExternalStore(
    subscribeToNotificationStorage,
    getStoredNotificationSnapshot,
    () => JSON.stringify({ readAllAt: 0, readIds: [] }),
  );
  const { readAllAt, readIds } = useMemo(
    () => parseStoredNotificationSnapshot(notificationSnapshot),
    [notificationSnapshot],
  );
  const cutoffTimestamp =
    mountedAt - notificationLifetimeInDays * 24 * 60 * 60 * 1000;
  const visibleItems = items.filter((item) => {
    const timestamp = getNotificationTimestamp(item);

    return timestamp >= cutoffTimestamp;
  });
  const unreadItems = visibleItems.filter((item) => {
    const timestamp = getNotificationTimestamp(item);
    const readKey = getNotificationReadKey(item);

    return timestamp > readAllAt && !readIds.has(readKey) && !readIds.has(item.id);
  });
  const unreadCount = unreadItems.length;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function persistReadIds(nextReadIds: Set<string>) {
    try {
      window.localStorage.setItem(
        readNotificationsKey,
        JSON.stringify([...nextReadIds]),
      );
    } catch {
      // Keep the in-memory read state even if localStorage is unavailable.
    }

    emitNotificationStorageChange();
  }

  function persistReadAllAt(nextReadAllAt: number) {
    try {
      window.localStorage.setItem(readAllTimestampKey, String(nextReadAllAt));
    } catch {
      // Keep the in-memory read timestamp even if localStorage is unavailable.
    }

    emitNotificationStorageChange();
  }

  function markAllAsRead() {
    if (visibleItems.length === 0) {
      return;
    }

    const latestTimestamp = visibleItems.reduce((latest, item) => {
      const timestamp = getNotificationTimestamp(item);
      return Math.max(latest, timestamp);
    }, readAllAt);
    const nextReadIds = new Set(readIds);

    visibleItems.forEach((item) => {
      nextReadIds.add(item.id);
      nextReadIds.add(getNotificationReadKey(item));
    });

    persistReadIds(nextReadIds);
    persistReadAllAt(latestTimestamp);
  }

  function markItemAsRead(notificationId: string) {
    const notification = visibleItems.find((item) => item.id === notificationId);

    if (!notification) {
      return;
    }

    const timestamp = getNotificationTimestamp(notification);
    const readKey = getNotificationReadKey(notification);
    const isUnread =
      timestamp > readAllAt &&
      !readIds.has(readKey) &&
      !readIds.has(notificationId);

    if (!isUnread) {
      return;
    }

    persistReadIds(new Set([...readIds, notificationId, readKey]));
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-label="Notifications"
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ops-text-soft)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
          isOpen
            ? "bg-[var(--ops-card-soft)] text-[var(--ops-text)]"
            : "bg-transparent hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
        }`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <motion.span
          animate={
            unreadCount > 0 && !isOpen
              ? { rotate: [0, -16, 16, -12, 12, 0] }
              : { rotate: 0 }
          }
          transition={{
            duration: 0.9,
            ease: "easeInOut",
            repeat: unreadCount > 0 && !isOpen ? Number.POSITIVE_INFINITY : 0,
            repeatDelay: 1.2,
          }}
        >
          <BellIcon aria-hidden="true" size={20} weight="regular" />
        </motion.span>
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ops-primary)] px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed right-4 top-16 z-50 flex max-h-[min(32rem,calc(100vh-5rem))] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] p-3 shadow-lg sm:right-6 lg:absolute lg:right-0 lg:top-full lg:mt-2 lg:w-[25rem]">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--ops-text)]">
              Notifications
            </p>
            {unreadCount > 0 ? (
              <button
                className="text-xs font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))] hover:text-[var(--workspace-accent,var(--ops-primary))]"
                onClick={markAllAsRead}
                type="button"
              >
                Read all
              </button>
            ) : (
              <span className="text-xs text-[var(--ops-text-muted)]">
                All read
              </span>
            )}
          </div>
          {visibleItems.length === 0 ? (
            <p className="mt-3 rounded-lg bg-[var(--ops-card-soft)] px-3 py-2 text-sm text-[var(--ops-text-soft)]">
              No notifications yet.
            </p>
          ) : (
            <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {visibleItems.map((item) => {
                const itemTimestamp = getNotificationTimestamp(item);
                const readKey = getNotificationReadKey(item);
                const isUnread =
                  itemTimestamp > readAllAt &&
                  !readIds.has(readKey) &&
                  !readIds.has(item.id);

                return (
                  <li key={item.id}>
                    <button
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                        isUnread
                          ? "border-[var(--workspace-primary,var(--ops-primary))]/35 bg-[var(--ops-card)]"
                          : "border-[var(--ops-border)] bg-[var(--ops-card)]"
                      }`}
                      onClick={() => markItemAsRead(item.id)}
                      type="button"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]">
                          <NotificationItemIcon icon={item.icon} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="pr-2 text-sm font-semibold leading-5 text-[var(--ops-text)]">
                              {item.message}
                            </p>
                            <span className="shrink-0 text-[11px] font-medium text-[var(--ops-text-muted)]">
                              {formatTime(item.timestamp)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-[var(--ops-text-soft)]">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
