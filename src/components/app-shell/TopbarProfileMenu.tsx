"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CaretDownIcon,
  DesktopIcon,
  MoonIcon,
  QuestionIcon,
  SignOutIcon,
  SunIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { AccountAvatar } from "@/components/account/AccountAvatar";
import {
  ACCOUNT_UPDATED_EVENT,
  type AccountUpdatedDetail,
} from "@/lib/account/accountEvents";
import { useThemePreference } from "@/components/theme/ThemeProvider";
import { createClient } from "@/lib/supabase/client";
import type { CurrentAccountSummary } from "@/lib/account/queries";
import type { ApiResponse } from "@/types/api";
import type { ThemeMode, UserThemePreference, WorkspaceRole } from "@/types/domain";
import { SmartNavLink } from "./SmartNavLink";

type ThemePreferenceUpdateResponse = UserThemePreference & {
  theme_mode: ThemeMode;
};

type TopbarProfileMenuProps = {
  account: CurrentAccountSummary | null;
  role: WorkspaceRole;
};

const themeOptions: Array<{
  label: string;
  value: ThemeMode;
}> = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

function formatRole(role: WorkspaceRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function ModeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === "light") {
    return <SunIcon aria-hidden="true" size={16} weight="regular" />;
  }

  if (mode === "dark") {
    return <MoonIcon aria-hidden="true" size={16} weight="regular" />;
  }

  return <DesktopIcon aria-hidden="true" size={16} weight="regular" />;
}

export function TopbarProfileMenu({ account, role }: TopbarProfileMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const { setUserThemeMode, userThemeMode } = useThemePreference();
  const [accountOverride, setAccountOverride] = useState<{
    avatarUrl?: string | null;
    fullName?: string | null;
  } | null>(null);
  const [confirmSignOutOpen, setConfirmSignOutOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
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

  const displayName = liveAccount?.displayName ?? liveAccount?.email ?? "Account";
  const email = liveAccount?.email ?? "No email available";

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setConfirmSignOutOpen(false);
      }
    }

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

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setConfirmSignOutOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener(ACCOUNT_UPDATED_EVENT, handleAccountUpdated as EventListener);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(
        ACCOUNT_UPDATED_EVENT,
        handleAccountUpdated as EventListener,
      );
    };
  }, []);

  async function updateThemeMode(themeMode: ThemeMode) {
    const previousMode = userThemeMode;
    setError(null);
    setIsSavingTheme(true);
    setUserThemeMode(themeMode);

    try {
      const response = await fetch("/api/me/theme", {
        body: JSON.stringify({ theme_mode: themeMode }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result =
        (await response.json()) as ApiResponse<ThemePreferenceUpdateResponse>;

      if (!response.ok || !result.ok) {
        setUserThemeMode(previousMode);
        setError(result.ok ? "Theme update failed." : result.error.message);
        return;
      }

      setUserThemeMode(result.data.theme_mode);
    } catch (caughtError) {
      setUserThemeMode(previousMode);
      setError(
        caughtError instanceof Error ? caughtError.message : "Theme update failed.",
      );
    } finally {
      setIsSavingTheme(false);
    }
  }

  async function confirmSignOut() {
    setIsSigningOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
        className="group inline-flex h-10 translate-y-0.5 items-center justify-center gap-1 rounded-lg px-1 text-[var(--ops-text-soft)] transition hover:bg-white/80 hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
        onClick={() => {
          setError(null);
          setIsOpen((value) => !value);
          setConfirmSignOutOpen(false);
        }}
        type="button"
      >
        {account ? (
          <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center">
            <AccountAvatar
              avatarUrl={liveAccount?.avatarUrl ?? null}
              email={liveAccount?.email ?? null}
              fullName={liveAccount?.fullName ?? null}
              size="sm"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white"
            />
          </span>
        ) : (
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--ops-text-soft)] shadow-sm ring-1 ring-[var(--ops-border)]">
            <UserCircleIcon aria-hidden="true" size={20} weight="regular" />
            <span
              aria-hidden="true"
              className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white"
            />
          </span>
        )}
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[var(--ops-text-muted)] shadow-sm ring-1 ring-[var(--ops-border)] transition group-hover:text-[var(--ops-text-soft)]">
          <CaretDownIcon aria-hidden="true" size={11} weight="bold" />
        </span>
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--ops-border)] bg-white shadow-xl"
          role="menu"
        >
          <div className="border-b border-[var(--ops-border)] bg-[var(--ops-card-soft)]/70 p-3.5">
            <div className="flex items-start gap-3">
              <AccountAvatar
                avatarUrl={liveAccount?.avatarUrl ?? null}
                email={liveAccount?.email ?? null}
                fullName={liveAccount?.fullName ?? null}
                size="md"
              />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                    {displayName}
                  </p>
                  <span className="inline-flex shrink-0 rounded-full border border-[var(--workspace-primary,var(--ops-primary))]/15 bg-[var(--ops-primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--workspace-primary,var(--ops-primary-dark))]">
                    {formatRole(role)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-[var(--ops-text-soft)]">
                  {email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <SmartNavLink
              className="block rounded-lg px-3 py-2.5 transition hover:bg-[var(--ops-card-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
              href="/account"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              <span className="block text-sm font-semibold text-[var(--ops-text)]">
                Account
              </span>
              <span className="mt-0.5 block text-xs text-[var(--ops-text-soft)]">
                Edit profile & avatar
              </span>
            </SmartNavLink>
          </div>

          <div className="border-t border-[var(--ops-border)] px-3 py-3">
            <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
              Appearance
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {themeOptions.map((option) => {
                const selected = option.value === userThemeMode;

                return (
                  <button
                    className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
                      selected
                        ? "border-[var(--workspace-primary,var(--ops-primary))] bg-[var(--ops-primary-soft)] text-[var(--workspace-primary,var(--ops-primary-dark))]"
                        : "border-[var(--ops-border)] bg-white text-[var(--ops-text-soft)] hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                    }`}
                    disabled={isSavingTheme}
                    key={option.value}
                    onClick={() => updateThemeMode(option.value)}
                    type="button"
                  >
                    <ModeIcon mode={option.value} />
                    {option.label}
                  </button>
                );
              })}
            </div>
            {error ? (
              <p className="mt-2 rounded-lg bg-[var(--ops-danger-soft)] p-2 text-xs text-[var(--ops-danger)]">
                {error}
              </p>
            ) : null}
          </div>

          <div className="border-t border-[var(--ops-border)] p-1.5">
            <button
              className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--ops-text-muted)] opacity-70"
              disabled
              type="button"
            >
              <QuestionIcon aria-hidden="true" size={17} weight="regular" />
              Help & support
            </button>
          </div>

          <div className="border-t border-[var(--ops-border)] p-1.5">
            {confirmSignOutOpen ? (
              <div className="rounded-lg bg-[var(--ops-card-soft)] p-3">
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  Sign out now?
                </p>
                <p className="mt-1 text-xs text-[var(--ops-text-soft)]">
                  You can stay logged in or return to the login screen.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white text-xs font-semibold text-[var(--ops-text-soft)] transition hover:text-[var(--ops-text)]"
                    disabled={isSigningOut}
                    onClick={() => setConfirmSignOutOpen(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-[var(--ops-danger)]/25 bg-[var(--ops-danger-soft)] text-xs font-semibold text-[var(--ops-danger)] transition hover:border-[var(--ops-danger)]/40 disabled:opacity-60"
                    disabled={isSigningOut}
                    onClick={confirmSignOut}
                    type="button"
                  >
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--ops-danger)] transition hover:bg-[var(--ops-danger-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-danger)]"
                disabled={isSigningOut}
                onClick={() => setConfirmSignOutOpen(true)}
                type="button"
              >
                <SignOutIcon aria-hidden="true" size={17} weight="regular" />
                Sign out
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
