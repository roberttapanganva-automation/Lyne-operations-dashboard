"use client";

import { BellIcon, ClockIcon, MonitorIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { UserPreferences } from "@/types/domain";

type PreferencesFormProps = {
  preferences: UserPreferences;
};

const timezoneOptions = [
  "UTC",
  "Asia/Manila",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Australia/Sydney",
];

const dateFormatOptions = [
  { label: "Jan 5, 2026", value: "MMM d, yyyy" },
  { label: "01/05/2026", value: "MM/dd/yyyy" },
  { label: "05/01/2026", value: "dd/MM/yyyy" },
  { label: "2026-01-05", value: "yyyy-MM-dd" },
] as const;

const landingPageOptions = [
  { label: "Dashboard", value: "/dashboard" },
  { label: "CRM / Leads", value: "/leads" },
  { label: "Jobs", value: "/jobs" },
  { label: "Tasks", value: "/tasks" },
  { label: "Calendar", value: "/calendar" },
  { label: "Pipelines", value: "/pipelines" },
  { label: "Automations", value: "/automations" },
] as const;

const densityOptions = [
  { label: "Compact", value: "compact" },
  { label: "Comfortable", value: "comfortable" },
  { label: "Spacious", value: "spacious" },
] as const;

function getErrorMessage(response: ApiResponse<UserPreferences>) {
  return response.ok ? null : response.error.message;
}

function syncAppTableDensity(tableDensity: UserPreferences["table_density"]) {
  document
    .querySelector("[data-table-density]")
    ?.setAttribute("data-table-density", tableDensity);
}

export function PreferencesForm({ preferences }: PreferencesFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<UserPreferences>(preferences);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updatePreference<TKey extends keyof UserPreferences>(
    key: TKey,
    value: UserPreferences[TKey],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/me/preferences", {
        body: JSON.stringify(formState),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<UserPreferences>;
      const message = getErrorMessage(result);

      if (!response.ok || !result.ok) {
        const errorMessage = message ?? "We could not update your preferences.";
        setError(errorMessage);
        notify.error("Preferences update failed", errorMessage);
        return;
      }

      setFormState(result.data);
      syncAppTableDensity(result.data.table_density);
      setSuccess("Personal preferences saved.");
      notify.success("Preferences saved", "Your personal settings were updated.");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update your preferences.";
      setError(errorMessage);
      notify.error("Preferences update failed", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ops-primary-soft)] text-[var(--workspace-primary,var(--ops-primary-dark))]">
              <ClockIcon aria-hidden="true" size={20} weight="duotone" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--ops-text)]">
                Personal Preferences
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--ops-text-soft)]">
                These settings apply only to your account.
              </p>
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 py-2 text-xs font-medium text-[var(--ops-text-soft)]">
          <MonitorIcon aria-hidden="true" size={16} weight="duotone" />
          Theme can be changed from the topbar.
        </div>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <p
            className="rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg bg-[var(--ops-success-soft)] p-3 text-sm text-[var(--ops-success)]">
            {success}
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="preferences-timezone"
            >
              Timezone
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="preferences-timezone"
              onChange={(event) =>
                updatePreference("timezone", event.target.value)
              }
              value={formState.timezone}
            >
              {timezoneOptions.includes(formState.timezone) ? null : (
                <option value={formState.timezone}>{formState.timezone}</option>
              )}
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="preferences-date-format"
            >
              Date format
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="preferences-date-format"
              onChange={(event) =>
                updatePreference(
                  "date_format",
                  event.target.value as UserPreferences["date_format"],
                )
              }
              value={formState.date_format}
            >
              {dateFormatOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="preferences-time-format"
            >
              Time format
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="preferences-time-format"
              onChange={(event) =>
                updatePreference(
                  "time_format",
                  event.target.value as UserPreferences["time_format"],
                )
              }
              value={formState.time_format}
            >
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="preferences-week-starts-on"
            >
              Week starts on
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="preferences-week-starts-on"
              onChange={(event) =>
                updatePreference(
                  "week_starts_on",
                  event.target.value as UserPreferences["week_starts_on"],
                )
              }
              value={formState.week_starts_on}
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="preferences-default-landing-page"
            >
              Default landing page
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="preferences-default-landing-page"
              onChange={(event) =>
                updatePreference(
                  "default_landing_page",
                  event.target.value as UserPreferences["default_landing_page"],
                )
              }
              value={formState.default_landing_page}
            >
              {landingPageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="preferences-table-density"
            >
              Table density
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="preferences-table-density"
              onChange={(event) =>
                updatePreference(
                  "table_density",
                  event.target.value as UserPreferences["table_density"],
                )
              }
              value={formState.table_density}
            >
              {densityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label
            className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4"
            htmlFor="preferences-reduce-motion"
          >
            <span>
              <span className="block text-sm font-medium text-[var(--ops-text)]">
                Reduced motion
              </span>
              <span className="mt-1 block text-sm text-[var(--ops-text-soft)]">
                Prefer quieter transitions in the interface.
              </span>
            </span>
            <input
              checked={formState.reduce_motion}
              className="h-5 w-5 accent-[var(--ops-primary)]"
              disabled={isSubmitting}
              id="preferences-reduce-motion"
              onChange={(event) =>
                updatePreference("reduce_motion", event.target.checked)
              }
              type="checkbox"
            />
          </label>

          <label
            className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4"
            htmlFor="preferences-in-app-notifications"
          >
            <span>
              <span className="flex items-center gap-2 text-sm font-medium text-[var(--ops-text)]">
                <BellIcon aria-hidden="true" size={16} weight="duotone" />
                In-app notifications
              </span>
              <span className="mt-1 block text-sm text-[var(--ops-text-soft)]">
                Receive product alerts inside OpsPilot.
              </span>
            </span>
            <input
              checked={formState.in_app_notifications_enabled}
              className="h-5 w-5 accent-[var(--ops-primary)]"
              disabled={isSubmitting}
              id="preferences-in-app-notifications"
              onChange={(event) =>
                updatePreference(
                  "in_app_notifications_enabled",
                  event.target.checked,
                )
              }
              type="checkbox"
            />
          </label>
        </div>

        <div className="flex justify-end">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save preferences"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
