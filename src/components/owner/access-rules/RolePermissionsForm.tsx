"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { WorkspaceRolePermission } from "@/types/domain";

const permissionFields = [
  ["can_view_settings", "View settings"],
  ["can_edit_basic_settings", "Edit basic settings"],
  ["can_edit_branding", "Edit branding"],
  ["can_manage_modules", "Manage modules"],
  ["can_manage_pipeline", "Manage pipeline"],
  ["can_create_leads", "Create leads"],
  ["can_create_jobs", "Create jobs"],
  ["can_create_tasks", "Create tasks"],
  ["can_create_appointments", "Create appointments"],
  ["can_view_automations", "View automations"],
  ["can_view_audit_logs", "View audit logs"],
] as const;

export function RolePermissionsForm({
  permissions,
}: {
  permissions: WorkspaceRolePermission[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      permissions: permissions.map((permission) => ({
        role: permission.role,
        ...Object.fromEntries(
          permissionFields.map(([field]) => [
            field,
            formData.get(`${permission.role}.${field}`) === "on",
          ]),
        ),
      })),
    };

    try {
      const response = await fetch("/api/owner/access-rules", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<
        WorkspaceRolePermission[]
      >;

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "Access rules update failed."
          : result.error.message;
        setError(message);
        notify.error("Access rules could not be saved", message);
        return;
      }

      setSuccess("Access rules updated.");
      notify.success("Changes saved", "Access rules updated.");
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Access rules update failed.";
      setError(message);
      notify.error("Access rules could not be saved", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? (
        <p className="rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-[var(--ops-success-soft)] p-3 text-sm text-[var(--ops-success)]">
          {success}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        {permissions.map((permission) => (
          <Card className="p-5 sm:p-6" key={permission.role}>
            <h2 className="text-lg font-semibold capitalize text-[var(--ops-text)]">
              {permission.role}
            </h2>
            <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
              Owner role is excluded and always has full control.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {permissionFields.map(([field, label]) => (
                <label
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-3 text-sm font-medium text-[var(--ops-text)]"
                  htmlFor={`${permission.role}.${field}`}
                  key={field}
                >
                  {label}
                  <input
                    className="h-5 w-5 accent-[var(--ops-primary)]"
                    defaultChecked={Boolean(permission[field])}
                    disabled={isSubmitting}
                    id={`${permission.role}.${field}`}
                    name={`${permission.role}.${field}`}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Saving..." : "Save Access Rules"}
        </Button>
      </div>
    </form>
  );
}
