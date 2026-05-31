"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { Workspace } from "@/types/domain";

type WorkspaceProfileFormProps = {
  canManageSettings: boolean;
  workspace: Workspace;
};

type WorkspaceResponse = {
  id: string;
};

function getErrorMessage(response: ApiResponse<WorkspaceResponse>) {
  return response.ok ? null : response.error.message;
}

export function WorkspaceProfileForm({
  canManageSettings,
  workspace,
}: WorkspaceProfileFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const disabled = !canManageSettings || isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      currency_code: String(formData.get("currency_code") ?? ""),
      industry: String(formData.get("industry") ?? ""),
      name: String(formData.get("name") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
    };

    try {
      const response = await fetch("/api/settings/workspace", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<WorkspaceResponse>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const errorMessage =
          message ?? "We could not update the workspace profile.";
        setError(errorMessage);
        notify.error("Workspace update failed", errorMessage);
        return;
      }

      setSuccess("Workspace profile updated.");
      notify.success("Workspace updated", "Workspace settings were saved.");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update the workspace profile.";
      setError(errorMessage);
      notify.error("Workspace update failed", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-[var(--ops-text)]">
          Workspace Profile
        </h2>
        <p className="text-sm text-[var(--ops-text-soft)]">
          Control the workspace name, business context, timezone, and currency.
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

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="settings-workspace-name"
            >
              Workspace name
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              defaultValue={workspace.name}
              disabled={disabled}
              id="settings-workspace-name"
              name="name"
              required
              type="text"
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="settings-industry"
            >
              Industry
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              defaultValue={workspace.industry ?? ""}
              disabled={disabled}
              id="settings-industry"
              name="industry"
              type="text"
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="settings-timezone"
            >
              Timezone
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              defaultValue={workspace.timezone}
              disabled={disabled}
              id="settings-timezone"
              name="timezone"
              required
              type="text"
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="settings-currency"
            >
              Currency code
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm uppercase text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              defaultValue={workspace.currency_code}
              disabled={disabled}
              id="settings-currency"
              maxLength={3}
              minLength={3}
              name="currency_code"
              required
              type="text"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={disabled} type="submit">
            {isSubmitting ? "Saving..." : "Save profile"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
