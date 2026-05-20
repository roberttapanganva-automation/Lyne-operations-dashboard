import type { ReactNode } from "react";
import { getCurrentAccountSummary } from "@/lib/account/queries";
import type { ActiveWorkspaceContext } from "@/types/domain";
import { AppShellChrome } from "./AppShellChrome";
import { Topbar } from "./Topbar";

type AppShellProps = {
  children: ReactNode;
  workspaceContext: ActiveWorkspaceContext;
};

export function AppShell({ children, workspaceContext }: AppShellProps) {
  const currentAccountPromise = getCurrentAccountSummary();

  return (
    <AppShellChrome
      currentAccount={currentAccountPromise}
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
