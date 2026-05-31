"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { getAssignableRoles } from "@/lib/permissions/workspace";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { WorkspaceInvitation } from "@/types/domain";

export function InviteMemberForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expiresDate, setExpiresDate] = useState<Date | undefined>(undefined);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setInviteLink(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const expiresAt = expiresDate
      ? new Date(
          expiresDate.getFullYear(),
          expiresDate.getMonth(),
          expiresDate.getDate(),
          23,
          59,
          59,
          999,
        ).toISOString()
      : "";
    const payload = {
      expires_at: expiresAt,
      invited_email: String(formData.get("invited_email") ?? ""),
      role: String(formData.get("role") ?? "staff"),
    };

    try {
      const response = await fetch("/api/owner/invitations", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<WorkspaceInvitation>;

      if (!response.ok || !result.ok) {
        const message = result.ok ? "Invite creation failed." : result.error.message;
        setError(message);
        notify.error("Invite could not be created", message);
        return;
      }

      event.currentTarget.reset();
      setExpiresDate(undefined);
      setSuccess("Pending invite created. Copy the invite link and send it manually for now.");
      setInviteLink(`${window.location.origin}/invite/${result.data.id}`);
      notify.success("Created successfully", "Pending invite created.");
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Invite creation failed.";
      setError(message);
      notify.error("Invite could not be created", message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="space-y-1">
        <h2 className="font-semibold text-[var(--ops-text)]">Invite Member</h2>
        <p className="text-sm leading-5 text-[var(--ops-text-soft)]">
          Pending invite record only. Email sending will be connected later.
        </p>
      </div>

      <form
        className="mt-4 grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_120px_170px_auto]"
        onSubmit={handleSubmit}
      >
        {error ? (
          <p
            className="rounded-lg bg-[var(--ops-danger-soft)] p-2.5 text-sm text-[var(--ops-danger)] lg:col-span-4"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <div className="rounded-lg bg-[var(--ops-success-soft)] p-2.5 text-sm text-[var(--ops-success)] lg:col-span-4">
            <p>{success}</p>
            {inviteLink ? (
              <p className="mt-2 break-all font-medium">{inviteLink}</p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="invite-email">
            Email
          </label>
          <input
            className="mt-1.5 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
            id="invite-email"
            name="invited_email"
            required
            type="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="invite-role">
            Role
          </label>
          <select
            className="mt-1.5 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
            id="invite-role"
            name="role"
            required
          >
            {getAssignableRoles().map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="invite-expires">
            Expires
          </label>
          <input
            id="invite-expires"
            name="expires_at"
            readOnly
            type="hidden"
            value={expiresDate ? expiresDate.toISOString() : ""}
          />
          <DatePicker
            aria-label="Invite expiry date"
            clearable
            disabled={isSubmitting}
            onChange={setExpiresDate}
            value={expiresDate}
          />
        </div>

        <div className="flex items-end lg:justify-end">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating..." : "Create Invite"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
