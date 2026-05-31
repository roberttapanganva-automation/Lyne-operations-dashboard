"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftIcon,
  GearSixIcon,
  ListChecksIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SquaresFourIcon,
  TargetIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { getBrandingCssVars } from "@/lib/branding/cssVars";
import {
  getWorkspaceDisplayName,
} from "@/lib/branding/display";
import type { ActiveWorkspaceContext } from "@/types/domain";

const ownerNavItems = [
  { href: "/owner", label: "Overview", Icon: SquaresFourIcon },
  { href: "/owner/team", label: "Team", Icon: UsersThreeIcon },
  { href: "/owner/invitations", label: "Invitations", Icon: UsersThreeIcon },
  { href: "/owner/branding", label: "Branding", Icon: PaintBrushIcon },
  { href: "/owner/modules", label: "Modules", Icon: SlidersHorizontalIcon },
  { href: "/owner/pipeline", label: "Pipeline", Icon: ListChecksIcon },
  { href: "/owner/assignments", label: "Assignments", Icon: TargetIcon },
  { href: "/owner/access-rules", label: "Access Rules", Icon: ShieldCheckIcon },
  { href: "/owner/audit-logs", label: "Audit Logs", Icon: GearSixIcon },
] as const;

type OwnerConsoleShellProps = {
  children: ReactNode;
  workspaceContext: ActiveWorkspaceContext;
};

export function OwnerConsoleShell({
  children,
  workspaceContext,
}: OwnerConsoleShellProps) {
  const pathname = usePathname();
  const appName = getWorkspaceDisplayName({
    branding: workspaceContext.branding,
    workspaceName: workspaceContext.workspace.name,
  });

  return (
    <div
      className="min-h-screen bg-[var(--ops-main-bg)] text-[var(--ops-text)]"
      style={getBrandingCssVars(workspaceContext.branding)}
    >
      <aside className="fixed inset-y-0 left-0 hidden w-[280px] bg-[var(--ops-sidebar)] px-5 py-6 text-white lg:flex lg:flex-col">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
            Owner Console
          </p>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Owner">
          {ownerNavItems.map((item) => {
            const Icon = item.Icon;
            const isActive = pathname === item.href;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[linear-gradient(135deg,var(--workspace-primary),var(--workspace-accent))] text-white shadow-[0_12px_28px_var(--workspace-primary-glow)]"
                    : "text-white/70 hover:bg-[var(--workspace-primary-soft)] hover:text-white"
                }`}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" size={20} weight="duotone" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-[var(--workspace-primary-soft)] hover:text-white"
          href="/dashboard"
        >
          <ArrowLeftIcon aria-hidden="true" size={18} weight="regular" />
          Main Dashboard
        </Link>
      </aside>

      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-10 border-b border-[var(--ops-border)] bg-[var(--ops-main-bg)]/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                Owner controls
              </p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
                {appName}
              </h2>
            </div>
          </div>
        </header>

        <nav
          aria-label="Owner mobile"
          className="border-b border-[var(--ops-border)] bg-white px-4 py-3 lg:hidden"
        >
          <div className="flex gap-2 overflow-x-auto">
            {ownerNavItems.map((item) => (
              <Link
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${
                  pathname === item.href
                    ? "bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]"
                    : "text-[var(--ops-text-soft)]"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
