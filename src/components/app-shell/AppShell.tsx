import type { ReactNode } from "react";
import { getCurrentAccountSummary } from "@/lib/account/queries";
import type { ActiveWorkspaceContext } from "@/types/domain";
import { AppShellChrome } from "./AppShellChrome";
import { Topbar } from "./Topbar";

type AppShellProps = {
  children: ReactNode;
  tableDensity: "compact" | "comfortable" | "spacious";
  workspaceContext: ActiveWorkspaceContext;
};

export function AppShell({
  children,
  tableDensity,
  workspaceContext,
}: AppShellProps) {
  const currentAccountPromise = getCurrentAccountSummary();

  return (
    <AppShellChrome
      currentAccount={currentAccountPromise}
      tableDensity={tableDensity}
      topbar={
        <Topbar
          currentAccount={currentAccountPromise}
          workspaceContext={workspaceContext}
        />
      }
      workspaceContext={workspaceContext}
    >
      {children}
    </AppShellChrome>
  );
}
