"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import {
  ACCOUNT_UPDATED_EVENT,
  type AccountUpdatedDetail,
} from "@/lib/account/accountEvents";
import type { CurrentAccountSummary } from "@/lib/account/queries";
import { SmartNavLink } from "./SmartNavLink";

type UserMenuProps = {
  accessory?: ReactNode;
  account: CurrentAccountSummary | null;
  compact?: boolean;
};

export function UserMenu({
  accessory,
  account,
  compact = false,
}: UserMenuProps) {
  const [accountOverride, setAccountOverride] = useState<{
    avatarUrl?: string | null;
    fullName?: string | null;
  } | null>(null);
  const liveAccount = useMemo(() => {
    if (!account) {
      return null;
    }

    const fullName =
      accountOverride?.fullName !== undefined
        ? accountOverride.fullName
        : account.fullName;
    const displayName =
      fullName?.trim() || account.email || account.displayName;

    return {
      ...account,
      avatarUrl:
        accountOverride?.avatarUrl !== undefined
          ? accountOverride.avatarUrl
          : account.avatarUrl,
      displayName,
      fullName,
    };
  }, [account, accountOverride]);

  useEffect(() => {
    function handleAccountUpdated(event: Event) {
      const detail = (event as CustomEvent<AccountUpdatedDetail>).detail;
      setAccountOverride((current) => ({
        avatarUrl:
          detail.avatarUrl !== undefined
            ? detail.avatarUrl
            : current?.avatarUrl,
        fullName:
          detail.fullName !== undefined ? detail.fullName : current?.fullName,
      }));
    }

    window.addEventListener(ACCOUNT_UPDATED_EVENT, handleAccountUpdated as EventListener);

    return () => {
      window.removeEventListener(
        ACCOUNT_UPDATED_EVENT,
        handleAccountUpdated as EventListener,
      );
    };
  }, []);

  if (compact) {
    return (
      <SmartNavLink
        aria-label="Account"
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
        href="/account"
        title={liveAccount?.displayName ?? "Account"}
      >
        <AccountAvatar
          avatarUrl={liveAccount?.avatarUrl}
          className="text-[var(--ops-white)]"
          email={liveAccount?.email}
          fullName={liveAccount?.fullName}
          size="xs"
        />
      </SmartNavLink>
    );
  }

  if (accessory) {
    return (
      <div className="flex items-center gap-2 px-1">
        <SmartNavLink
          className="min-w-0 flex-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
          href="/account"
        >
          <div className="flex min-h-0 items-center gap-2.5">
            <AccountAvatar
              avatarUrl={liveAccount?.avatarUrl}
              className="text-[var(--ops-white)]"
              email={liveAccount?.email}
              fullName={liveAccount?.fullName}
              size="xs"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-semibold leading-4 text-[var(--ops-white)]">
                  {liveAccount?.displayName ?? "Account"}
                </p>
                <span
                  aria-label="Active"
                  className="inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30"
                  title="Active"
                />
              </div>
              <p className="mt-0.5 truncate text-[11px] leading-4 text-white/55">
                {liveAccount?.email ?? "Open personal account settings."}
              </p>
            </div>
          </div>
        </SmartNavLink>
        <div className="shrink-0">{accessory}</div>
      </div>
    );
  }

  return (
    <SmartNavLink
      className="block rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-2 transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
      href="/account"
    >
      <div className="flex min-h-0 items-center gap-2.5">
        <AccountAvatar
          avatarUrl={liveAccount?.avatarUrl}
          className="text-[var(--ops-white)]"
          email={liveAccount?.email}
          fullName={liveAccount?.fullName}
          size="xs"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold leading-4 text-[var(--ops-white)]">
              {liveAccount?.displayName ?? "Account"}
            </p>
            <span
              aria-label="Active"
              className="inline-flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30"
              title="Active"
            />
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-4 text-white/55">
            {liveAccount?.email ?? "Open personal account settings."}
          </p>
        </div>
        <CaretRightIcon
          aria-hidden="true"
          className="shrink-0 text-white/35"
          size={12}
          weight="bold"
        />
      </div>
    </SmartNavLink>
  );
}
