"use client";

import { use } from "react";
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
  getWorkspaceSubtitle,
} from "@/lib/branding/display";
import type { ActiveWorkspaceContext } from "@/types/domain";
import { getSidebarNavGroups, getUtilityNavItems } from "./nav-items";
import { SmartNavLink } from "./SmartNavLink";
import { UserMenu } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import type { CurrentAccountSummary } from "@/lib/account/queries";

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
  const expandedAssetUrl = getWorkspaceLogoUrl({
    branding: workspaceContext.branding,
    workspaceName: workspaceContext.workspace.name,
  });
  const fallbackSubtitle = getWorkspaceSubtitle();
  const navGroups = getSidebarNavGroups(workspaceContext);
  const utilityItems = getUtilityNavItems(workspaceContext);
  const ToggleIcon = collapsed ? CaretRightIcon : CaretLeftIcon;

  return (
    <aside
      className={`fixed inset-y-0 left-0 hidden shrink-0 overflow-hidden border-r border-white/5 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_28%),linear-gradient(180deg,#0B1020_0%,#101931_100%)] text-[var(--ops-white)] transition-[width] duration-300 ease-out lg:flex lg:flex-col ${
        collapsed ? "w-[78px]" : "w-[264px]"
      }`}
    >
      <div
        className={`relative flex h-full min-h-0 flex-col overflow-hidden ${
          collapsed ? "px-2 py-3" : "px-3 py-3"
        }`}
      >
        <div className={`${collapsed ? "" : "px-1"} shrink-0`}>
          <div
            className={`relative ${collapsed ? "flex min-h-[52px] items-start justify-center pt-1" : "min-h-[76px] pt-1"}`}
          >
            <SmartNavLink
              className={`min-w-0 ${collapsed ? "mx-auto pt-0.5" : "block w-full pt-0.5"}`}
              href="/dashboard"
              title={collapsed ? appName : undefined}
            >
              {collapsed ? (
                <span
                  aria-label={appName}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`${appName} icon`}
                    className="h-6 w-6 object-contain"
                    src={collapsedAssetUrl}
                  />
                </span>
              ) : (
                <span className="block min-w-0 text-center">
                  {expandedAssetUrl ? (
                    <>
                      <span className="flex min-h-[34px] items-center justify-center overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={`${appName} logo`}
                          className="max-h-8 w-auto max-w-full object-contain object-center"
                          src={expandedAssetUrl}
                        />
                      </span>
                      <span className="mt-1 block text-[11px] leading-4 text-white/55">
                        {fallbackSubtitle}
                      </span>
                    </>
                  ) : (
                    <span className="mx-auto flex w-full max-w-[190px] items-center justify-center gap-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.06] ring-1 ring-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          alt={`${appName} icon`}
                          className="h-7 w-7 object-contain"
                          src={collapsedAssetUrl}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-white">
                          {appName}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] leading-4 text-white/55">
                          {fallbackSubtitle}
                        </span>
                      </span>
                    </span>
                  )}
                </span>
              )}
            </SmartNavLink>
          </div>
        </div>

        {!collapsed ? (
          <div className="mt-2 shrink-0">
            <WorkspaceSwitcher
              canSwitch={workspaceContext.role === "owner"}
              collapsed={collapsed}
              workspaceContext={workspaceContext}
            />
          </div>
        ) : null}

        <div className={`${collapsed ? "mt-2" : "mt-2.5"} shrink-0`}>
          <button
            aria-label={collapsed ? "Expand sidebar search" : "Search anything"}
            className={`inline-flex h-8 w-full items-center rounded-xl border border-white/10 bg-white/[0.04] text-white/58 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] ${
              collapsed ? "justify-center" : "justify-start px-2.5"
            }`}
            onClick={() => {
              if (collapsed) {
                onToggleCollapsed();
              }
            }}
            type="button"
          >
            <MagnifyingGlassIcon aria-hidden="true" size={15} weight="regular" />
            {!collapsed ? (
              <span className="ml-2 flex-1 text-left text-[13px] font-medium">
                Search anything
              </span>
            ) : null}
          </button>
        </div>

        <div className="mt-2.5 min-h-0 flex-1 overflow-hidden">
          <nav
            aria-label="Primary"
            className={`flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              collapsed ? "gap-2" : "gap-2.5"
            }`}
          >
            {navGroups.map((group) => (
              <div key={group.label}>
                {!collapsed ? (
                  <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/32">
                    {group.label}
                  </p>
                ) : null}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.Icon;

                    return (
                      <SmartNavLink
                        aria-current={isActive ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={`group flex items-center gap-2 rounded-lg text-[13px] font-medium transition ${
                          isActive
                            ? "bg-[linear-gradient(135deg,var(--workspace-primary,var(--ops-primary)),var(--ops-primary-dark))] text-white shadow-[0_10px_22px_var(--workspace-primary-glow,var(--ops-primary-glow))]"
                            : "text-white/66 hover:bg-white/[0.06] hover:text-white"
                        } ${collapsed ? "h-[34px] justify-center px-1.5" : "h-[34px] px-2"}`}
                        href={item.href}
                        key={item.href}
                        title={collapsed ? item.label : undefined}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition ${
                            isActive
                              ? "bg-white/14 text-white"
                              : "text-white/72 group-hover:bg-white/[0.08] group-hover:text-white"
                          }`}
                        >
                          <Icon
                            aria-hidden="true"
                            size={16}
                            weight={isActive ? "duotone" : "regular"}
                          />
                        </span>
                        {!collapsed ? (
                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>
                        ) : (
                          <span className="sr-only">{item.label}</span>
                        )}
                      </SmartNavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            {utilityItems.length > 0 ? (
              <div className={`${collapsed ? "pt-1" : "pt-1.5"}`}>
                <div className="space-y-0.5">
                  {utilityItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    const Icon = item.Icon;

                    return (
                      <SmartNavLink
                        aria-current={isActive ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        className={`group flex items-center gap-2 rounded-lg text-[13px] font-medium transition ${
                          isActive
                            ? "bg-white/[0.08] text-white"
                            : "text-white/58 hover:bg-white/[0.05] hover:text-white"
                        } ${collapsed ? "h-[34px] justify-center px-1.5" : "h-[34px] px-2"}`}
                        href={item.href}
                        key={item.href}
                        title={collapsed ? item.label : undefined}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/72 transition group-hover:bg-white/[0.08] group-hover:text-white">
                          <Icon
                            aria-hidden="true"
                            size={16}
                            weight={isActive ? "duotone" : "regular"}
                          />
                        </span>
                        {!collapsed ? (
                          <span className="truncate">{item.label}</span>
                        ) : null}
                      </SmartNavLink>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </nav>
        </div>

        <div
          className={`mt-3 shrink-0 border-t border-white/8 ${
            collapsed ? "pt-2" : "pt-2.5"
          }`}
        >
          {collapsed ? (
            <div className="flex justify-center px-1 py-1">
              <button
                aria-expanded={!collapsed}
                aria-label="Expand sidebar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,var(--workspace-primary,var(--ops-primary)),var(--ops-primary-dark))] text-white transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
                onClick={onToggleCollapsed}
                type="button"
              >
                <ToggleIcon aria-hidden="true" size={14} weight="bold" />
              </button>
            </div>
          ) : (
            <UserMenu
              accessory={
                <button
                  aria-expanded={!collapsed}
                  aria-label="Collapse sidebar"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,var(--workspace-primary,var(--ops-primary)),var(--ops-primary-dark))] text-white transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
                  onClick={onToggleCollapsed}
                  type="button"
                >
                  <ToggleIcon aria-hidden="true" size={14} weight="bold" />
                </button>
              }
              account={account}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
