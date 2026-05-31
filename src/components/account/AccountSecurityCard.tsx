"use client";

import { useState } from "react";
import { EnvelopeSimpleIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { SignOutButton } from "@/components/app-shell/SignOutButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/ui/toast";

type AccountSecurityCardProps = {
  embedded?: boolean;
  email: string | null;
};

export function AccountSecurityCard({
  embedded = false,
  email,
}: AccountSecurityCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handlePasswordReset() {
    if (!email) {
      return;
    }

    setError(null);
    setSuccess(null);
    setIsSending(true);

    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );

      if (resetError) {
        setError(resetError.message);
        notify.error("Password reset email could not be sent", resetError.message);
        return;
      }

      setSuccess("Password reset email sent.");
        notify.success(
          "Password reset email sent",
          "Check your inbox for the reset link.",
        );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Password reset email could not be sent.";
      setError(message);
      notify.error("Password reset email could not be sent", message);
    } finally {
      setIsSending(false);
    }
  }

  const content = (
    <>
      <div>
        <h2 className="text-base font-semibold text-[var(--ops-text)]">
          Security
        </h2>
        <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
          Manage sign-in access for this personal account.
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ops-primary-soft)] text-[var(--workspace-primary,var(--ops-primary-dark))]">
            <ShieldCheckIcon aria-hidden="true" size={20} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--ops-text)]">
              Account email
            </p>
            <p className="mt-1 break-all text-sm text-[var(--ops-text-soft)]">
              {email ?? "No email available"}
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p
          className="mt-4 rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-lg bg-[var(--ops-success-soft)] p-3 text-sm text-[var(--ops-success)]">
          {success}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button
          className="gap-2"
          disabled={!email || isSending}
          onClick={handlePasswordReset}
          type="button"
          variant="secondary"
        >
          <EnvelopeSimpleIcon aria-hidden="true" size={18} />
          {isSending ? "Sending..." : "Send password reset email"}
        </Button>
        <SignOutButton confirmationMode="dialog" variant="secondary" />
      </div>
    </>
  );

  if (embedded) {
    return content;
  }

  return <Card className="p-5 sm:p-6">{content}</Card>;
}
