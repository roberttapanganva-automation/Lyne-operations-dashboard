"use client";

import { use } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CaretLeftIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import {
  getWorkspaceDisplayName,
  getWorkspaceIconUrl,
  getWorkspaceLogoUrl,
} from "@/lib/branding/display";
import type { ActiveWorkspaceContext } from "@/types/domain";
import type { CurrentAccountSummary } from "@/lib/account/queries";
import { getVisibleNavItems } from "./nav-items";
import { UserMenu } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type SidebarProps = {
  collapsed: boolean;
  currentAccount: Promise<CurrentAccountSummary | null>;
  onToggleCollapsed: () => void;
  workspaceContext: ActiveWorkspaceContext;
};

export function Sidebar({
  collapsed,
  currentAccount,
  onToggleCollapsed,
  workspaceContext,
}: SidebarProps) {
  const account = use(currentAccount);
  const pathname = usePathname();
  const appName = getWorkspaceDisplayName({
    branding: workspaceContext.branding,
    workspaceName: workspaceContext.workspace.name,
  });
  const collapsedAssetUrl = getWorkspaceIconUrl({
    branding: workspaceContext.branding,
    workspaceName: workspaceContext.workspace.name,
  });
  const expandedAssetUrl =
    getWorkspaceLogoUrl({
      branding: workspaceContext.branding,
      workspaceName: workspaceContext.workspace.name,
    }) ?? collapsedAssetUrl;
  const visibleNavItems = getVisibleNavItems(workspaceContext);
  const ToggleIcon = collapsed ? CaretRightIcon : CaretLeftIcon;

  return (
    <aside
      className={`fixed inset-y-0 left-0 hidden shrink-0 bg-[var(--ops-sidebar)] px-5 py-6 text-[var(--ops-white)] transition-[width] duration-300 ease-out lg:flex lg:flex-col ${
        collapsed ? "w-[84px]" : "w-[260px]"
      }`}
    >
      <Link
        className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""} min-w-0`}
        href="/dashboard"
      >
        {collapsed ? (
          <span aria-label={appName} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden" title={appName}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={`${appName} icon`}
              className="h-full w-full object-contain"
              src={collapsedAssetUrl}
            />
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="flex min-h-[48px] w-full items-center justify-center overflow-hidden px-1 py-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${appName} logo`}
                className="max-h-12 w-auto max-w-full object-contain object-center"
                src={expandedAssetUrl}
              />
            </span>
            <span className="mt-1 block text-center text-xs text-white/55">
              Command Center
            </span>
          </span>
        )}
      </Link>

      {!collapsed && workspaceContext.role === "owner" ? (
        <WorkspaceSwitcher workspaceContext={workspaceContext} />
      ) : null}

      <nav
        className={`flex flex-1 flex-col gap-1 ${collapsed ? "mt-6" : "mt-5"}`}
        aria-label="Main"
      >
        {collapsed ? (
          <button
            aria-label="Search anything"
            className="mb-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-white/10 bg-white/8 text-white/75 transition hover:bg-white/12 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
            type="button"
          >
            <MagnifyingGlassIcon aria-hidden="true" size={18} weight="regular" />
          </button>
        ) : (
          <div className="mb-2 px-0">
            <label className="sr-only" htmlFor="global-search">
              Search anything
            </label>
            <div className="relative">
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45"
                size={17}
                weight="regular"
              />
              <input
                className="h-9 w-full rounded-lg border border-white/10 bg-white/8 px-3 pl-9 text-sm text-white outline-none transition placeholder:text-white/45 hover:bg-white/10 focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                id="global-search"
                placeholder="Search..."
                type="search"
              />
            </div>
          </div>
        )}
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.Icon;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[linear-gradient(135deg,var(--ops-primary),var(--ops-primary-dark))] text-[var(--ops-white)] shadow-[0_12px_28px_var(--ops-primary-glow)]"
                  : "text-white/70 hover:bg-white/10 hover:text-[var(--ops-white)]"
              } ${collapsed ? "justify-center px-2" : "px-3"}`}
              href={item.href}
              key={item.href}
              title={collapsed ? item.label : undefined}
            >
              <Icon aria-hidden="true" size={20} weight="duotone" />
              <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {collapsed ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <UserMenu account={account} compact />
          <button
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-[var(--ops-primary)] text-white shadow-[0_10px_24px_var(--ops-primary-glow)] transition hover:bg-[var(--ops-primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
            onClick={onToggleCollapsed}
            type="button"
          >
            <ToggleIcon aria-hidden="true" size={20} weight="regular" />
          </button>
        </div>
      ) : (
        <div className="relative mt-2">
          <UserMenu account={account} />
          <button
            aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
            className="absolute right-[-14px] top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[var(--ops-primary)] text-white shadow-[0_10px_24px_var(--ops-primary-glow)] transition hover:bg-[var(--ops-primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
            onClick={onToggleCollapsed}
            type="button"
          >
            <ToggleIcon aria-hidden="true" size={20} weight="regular" />
          </button>
        </div>
      )}
    </aside>
  );
}
