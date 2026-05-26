"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  CaretRightIcon,
  DotsThreeOutlineVerticalIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { ActiveWorkspaceContext } from "@/types/domain";
import { getMobileNavData } from "./nav-items";
import { SmartNavLink } from "./SmartNavLink";

type MobileNavProps = {
  workspaceContext: ActiveWorkspaceContext;
};

export function MobileNav({ workspaceContext }: MobileNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { overflowItems, primaryItems } = getMobileNavData(workspaceContext);
  const isOverflowActive = overflowItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  return (
    <>
      {moreOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      ) : null}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 lg:hidden ${
          moreOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-3 mb-[5.5rem] rounded-[28px] border border-[var(--ops-border)] bg-white p-3 shadow-[0_24px_64px_rgba(15,23,42,0.18)]">
          <div className="mb-2 flex items-center justify-between px-2 py-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ops-text-muted)]">
                More
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--ops-text)]">
                More workspace views
              </p>
            </div>
            <button
              aria-label="Close more navigation"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] text-[var(--ops-text-soft)] transition hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
              onClick={() => setMoreOpen(false)}
              type="button"
            >
              <XIcon aria-hidden="true" size={18} weight="bold" />
            </button>
          </div>
          <div className="space-y-2">
            {overflowItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.Icon;

              return (
                <SmartNavLink
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "bg-[linear-gradient(135deg,var(--workspace-primary,var(--ops-primary)),var(--ops-primary-dark))] text-white shadow-[0_12px_28px_var(--workspace-primary-glow,var(--ops-primary-glow))]"
                      : "bg-[var(--ops-card-soft)] text-[var(--ops-text)]"
                  }`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setMoreOpen(false)}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                      isActive
                        ? "bg-white/14"
                        : "bg-white text-[var(--ops-text-soft)] ring-1 ring-[var(--ops-border)]"
                    }`}
                  >
                    <Icon
                      aria-hidden="true"
                      size={18}
                      weight={isActive ? "duotone" : "regular"}
                    />
                  </span>
                  <span className="flex-1 truncate">{item.label}</span>
                  <CaretRightIcon aria-hidden="true" size={16} weight="bold" />
                </SmartNavLink>
              );
            })}
          </div>
        </div>
      </div>

      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--ops-border)] bg-[var(--ops-card)]/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.55rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1.5">
          {primaryItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.Icon;

            return (
              <SmartNavLink
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-semibold transition ${
                  isActive
                    ? "bg-[linear-gradient(180deg,var(--workspace-primary-soft,var(--ops-primary-soft)),rgba(255,255,255,0.96))] text-[var(--workspace-primary,var(--ops-primary-dark))]"
                    : "text-[var(--ops-text-soft)]"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon
                  aria-hidden="true"
                  size={20}
                  weight={isActive ? "duotone" : "regular"}
                />
                <span className="truncate">{item.label}</span>
              </SmartNavLink>
            );
          })}
          <button
            aria-expanded={moreOpen}
            aria-label="Open more navigation"
            className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center text-[11px] font-semibold transition ${
              isOverflowActive || moreOpen
                ? "bg-[linear-gradient(180deg,var(--workspace-primary-soft,var(--ops-primary-soft)),rgba(255,255,255,0.96))] text-[var(--workspace-primary,var(--ops-primary-dark))]"
                : "text-[var(--ops-text-soft)]"
            }`}
            onClick={() => setMoreOpen((value) => !value)}
            type="button"
          >
            <DotsThreeOutlineVerticalIcon
              aria-hidden="true"
              size={20}
              weight="duotone"
            />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
