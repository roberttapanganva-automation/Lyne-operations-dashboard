"use client";

import { SignOutIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type SignOutButtonProps = {
  className?: string;
  compact?: boolean;
  confirmationMode?: "popover" | "dialog";
  variant?: "primary" | "secondary" | "ghost";
};

export function SignOutButton({
  className = "",
  compact = false,
  confirmationMode = "popover",
  variant = "ghost",
}: SignOutButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function confirmSignOut() {
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  const trigger = compact ? (
    <button
      aria-expanded={confirmOpen}
      aria-label="Sign out"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] disabled:opacity-50 ${className}`}
      disabled={isSigningOut}
      onClick={() => setConfirmOpen((value) => !value)}
      type="button"
    >
      <SignOutIcon aria-hidden="true" size={20} weight="regular" />
    </button>
  ) : (
    <Button
      className={`gap-2 ${className}`}
      disabled={isSigningOut}
      onClick={() => setConfirmOpen((value) => !value)}
      type="button"
      variant={variant}
    >
      <SignOutIcon aria-hidden="true" size={20} weight="regular" />
      {isSigningOut ? "Signing out..." : "Sign out"}
    </Button>
  );

  const confirmationContent = (
    <>
      <p className="text-sm font-semibold text-[var(--ops-text)]">Log out now?</p>
      <p className="mt-1 text-xs text-[var(--ops-text-soft)]">
        You can stay logged in or continue to log out.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] text-xs font-semibold text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-main-bg)]"
          onClick={() => setConfirmOpen(false)}
          type="button"
        >
          Stay
        </button>
        <button
          className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-[var(--ops-danger)] text-xs font-semibold text-white transition hover:opacity-90"
          disabled={isSigningOut}
          onClick={confirmSignOut}
          type="button"
        >
          {isSigningOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="relative">
      {trigger}

      {confirmationMode === "dialog" && confirmOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
          onClick={() => setConfirmOpen(false)}
          role="dialog"
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] p-4 shadow-[0_18px_48px_rgba(15,23,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            {confirmationContent}
          </div>
        </div>
      ) : null}

      {confirmationMode === "popover" && confirmOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] p-3 shadow-lg">
          {confirmationContent}
        </div>
      ) : null}
    </div>
  );
}
