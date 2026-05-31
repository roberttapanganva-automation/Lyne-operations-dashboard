"use client";

import type { ReactNode } from "react";
import type { CurrentAccountSummary } from "@/lib/account/queries";
import { useState } from "react";
import { getBrandingCssVars } from "@/lib/branding/cssVars";
import type { ActiveWorkspaceContext } from "@/types/domain";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

type AppShellChromeProps = {
  children: ReactNode;
  currentAccount: Promise<CurrentAccountSummary | null>;
  tableDensity: "compact" | "comfortable" | "spacious";
  topbar: ReactNode;
  workspaceContext: ActiveWorkspaceContext;
};

const densityStyles = `
  [data-table-density="compact"] .ops-density-surface :is(th, td) {
    padding-top: 0.5rem !important;
    padding-bottom: 0.5rem !important;
  }

  [data-table-density="spacious"] .ops-density-surface :is(th, td) {
    padding-top: 1.25rem !important;
    padding-bottom: 1.25rem !important;
  }

  [data-table-density="compact"] .ops-density-card {
    padding-top: 0.875rem !important;
    padding-bottom: 0.875rem !important;
  }

  [data-table-density="spacious"] .ops-density-card {
    padding-top: 1.5rem !important;
    padding-bottom: 1.5rem !important;
  }

  [data-table-density="compact"] .ops-density-card :is(.mt-4, .mt-5) {
    margin-top: 0.75rem !important;
  }

  [data-table-density="spacious"] .ops-density-card :is(.mt-4, .mt-5) {
    margin-top: 1.25rem !important;
  }
`;

export function AppShellChrome({
  children,
  currentAccount,
  tableDensity,
  topbar,
  workspaceContext,
}: AppShellChromeProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className="min-h-screen bg-[var(--ops-main-bg)] text-[var(--ops-text)]"
      data-table-density={tableDensity}
      style={getBrandingCssVars(workspaceContext.branding)}
    >
      <style>{densityStyles}</style>
      <div
        className={`min-h-screen transition-[padding] duration-300 ease-out ${
          sidebarCollapsed ? "lg:pl-[78px]" : "lg:pl-[264px]"
        }`}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          currentAccount={currentAccount}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
          workspaceContext={workspaceContext}
        />
        <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
          {topbar}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
      <MobileNav workspaceContext={workspaceContext} />
    </div>
  );
}
