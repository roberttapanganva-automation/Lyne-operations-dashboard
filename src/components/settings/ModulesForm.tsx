"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { WorkspaceModuleSettings } from "@/types/domain";

type ModulesFormProps = {
  canManageSettings: boolean;
  modules: WorkspaceModuleSettings | null;
};

type ModulesResponse = Record<string, unknown>;

const moduleFields = [
  ["leads_enabled", "Leads"],
  ["jobs_enabled", "Jobs"],
  ["tasks_enabled", "Tasks"],
  ["calendar_enabled", "Calendar"],
  ["reports_enabled", "Reports"],
  ["automations_enabled", "Automations"],
  ["ai_enabled", "AI"],
  ["invoices_enabled", "Invoices"],
] as const;

const moduleDefaults: Record<(typeof moduleFields)[number][0], boolean> = {
  ai_enabled: false,
  automations_enabled: true,
  calendar_enabled: true,
  invoices_enabled: false,
  jobs_enabled: true,
  leads_enabled: true,
  reports_enabled: true,
  tasks_enabled: true,
};

function getErrorMessage(response: ApiResponse<ModulesResponse>) {
  return response.ok ? null : response.error.message;
}

export function ModulesForm({ canManageSettings, modules }: ModulesFormProps) {
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
    const payload = Object.fromEntries(
      moduleFields.map(([key]) => [key, formData.get(key) === "on"]),
    );

    try {
      const response = await fetch("/api/settings/modules", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<ModulesResponse>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const errorMessage =
          message ?? "We could not update workspace modules.";
        setError(errorMessage);
        notify.error("Modules could not be updated", errorMessage);
        return;
      }

      setSuccess("Workspace modules updated.");
      notify.success("Modules updated", "Workspace module visibility was saved.");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update workspace modules.";
      setError(errorMessage);
      notify.error("Modules could not be updated", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-[var(--ops-text)]">
          Modules
        </h2>
        <p className="text-sm text-[var(--ops-text-soft)]">
          Toggle workspace modules. AI and invoice settings do not enable those
          features yet.
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

        <div className="grid gap-3 sm:grid-cols-2">
          {moduleFields.map(([key, label]) => (
            <label
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-3 text-sm font-medium text-[var(--ops-text)]"
              htmlFor={`settings-module-${key}`}
              key={key}
            >
              {label}
              <input
                className="h-5 w-5 accent-[var(--ops-primary)]"
                defaultChecked={modules?.[key] ?? moduleDefaults[key]}
                disabled={disabled}
                id={`settings-module-${key}`}
                name={key}
                type="checkbox"
              />
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <Button disabled={disabled} type="submit">
            {isSubmitting ? "Saving..." : "Save modules"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
