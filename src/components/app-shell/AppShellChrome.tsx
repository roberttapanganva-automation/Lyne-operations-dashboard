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
  topbar: ReactNode;
  workspaceContext: ActiveWorkspaceContext;
};

export function AppShellChrome({
  children,
  currentAccount,
  topbar,
  workspaceContext,
}: AppShellChromeProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className="min-h-screen bg-[var(--ops-main-bg)] text-[var(--ops-text)]"
      style={getBrandingCssVars(workspaceContext.branding)}
    >
      <div
        className={`min-h-screen transition-[padding] duration-300 ease-out ${
          sidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[260px]"
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
