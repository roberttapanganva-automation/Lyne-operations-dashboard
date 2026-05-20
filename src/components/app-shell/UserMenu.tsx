"use client";

import Link from "next/link";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import type { CurrentAccountSummary } from "@/lib/account/queries";
type UserMenuProps = {
  account: CurrentAccountSummary | null;
  compact?: boolean;
};

export function UserMenu({ account, compact = false }: UserMenuProps) {
  if (compact) {
    return (
      <Link
        aria-label="Account"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[var(--ops-sidebar-soft)] transition hover:bg-[var(--ops-sidebar-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
        href="/account"
        title={account?.displayName ?? "Account"}
      >
        <AccountAvatar
          avatarUrl={account?.avatarUrl}
          className="text-[var(--ops-white)]"
          email={account?.email}
          fullName={account?.fullName}
          size="sm"
        />
      </Link>
    );
  }

  return (
    <Link
      className="block rounded-xl border border-white/10 bg-[var(--ops-sidebar-soft)] p-4 transition hover:bg-[var(--ops-sidebar-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
      href="/account"
    >
      <div className="flex items-center gap-3">
        <AccountAvatar
          avatarUrl={account?.avatarUrl}
          className="text-[var(--ops-white)]"
          email={account?.email}
          fullName={account?.fullName}
          size="sm"
        />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[var(--ops-white)]">
              {account?.displayName ?? "Account"}
            </p>
            <span
              aria-label="Active"
              className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30"
              title="Active"
            />
          </div>
          <p className="mt-0.5 text-xs text-white/55">
            {account?.email ?? "Open personal account settings."}
          </p>
        </div>
      </div>
    </Link>
  );
}
