"use client";

import { FormEvent, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { dispatchAccountUpdated } from "@/lib/account/accountEvents";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";

const timezoneOptions = [
  "UTC",
  "Asia/Taipei",
  "Asia/Manila",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Australia/Sydney",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Toronto",
  "America/Sao_Paulo",
] as const;

type ProfileResponse = {
  avatar_url: string | null;
  full_name: string | null;
  timezone: string;
};

type AccountProfileFormProps = {
  embedded?: boolean;
  email: string | null;
  fullName: string | null;
  timezone: string;
};

export function AccountProfileForm({
  embedded = false,
  email,
  fullName,
  timezone,
}: AccountProfileFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/account/profile", {
        body: JSON.stringify({
          full_name: String(formData.get("full_name") ?? ""),
          timezone: String(formData.get("timezone") ?? ""),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<ProfileResponse>;

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "Profile could not be saved."
          : result.error.message;
        setError(message);
        notify.error("Profile could not be saved", message);
        return;
      }

      setSuccess("Profile updated.");
      dispatchAccountUpdated({
        fullName: result.data.full_name,
      });
      notify.success("Changes saved", "Your account details were updated.");
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Profile could not be saved.";
      setError(message);
      notify.error("Profile could not be saved", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const content = (
    <>
      <div>
        <h2 className="text-base font-semibold text-[var(--ops-text)]">
          Personal Details
        </h2>
        <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
          Update the name and timezone your teammates see across the workspace.
        </p>
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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

        <div className="grid gap-4">
          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="account-full-name"
            >
              Display name
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              defaultValue={fullName ?? ""}
              id="account-full-name"
              name="full_name"
              maxLength={80}
              placeholder="Your display name"
              type="text"
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="account-email"
            >
              Email address
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 text-sm text-[var(--ops-text-soft)] shadow-sm outline-none"
              id="account-email"
              readOnly
              type="email"
              value={email ?? "No email available"}
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="account-timezone"
            >
              Timezone
            </label>
            <div className="relative mt-2">
              <select
                className="h-10 w-full appearance-none rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 pr-10 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                defaultValue={
                  timezoneOptions.includes(timezone as (typeof timezoneOptions)[number])
                    ? timezone
                    : "UTC"
                }
                id="account-timezone"
                name="timezone"
                required
              >
                {timezoneOptions.map((timezoneOption) => (
                  <option key={timezoneOption} value={timezoneOption}>
                    {timezoneOption}
                  </option>
                ))}
              </select>
              <CaretDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
                size={16}
                weight="bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </>
  );

  if (embedded) {
    return content;
  }

  return <Card className="p-5 sm:p-6">{content}</Card>;
}
