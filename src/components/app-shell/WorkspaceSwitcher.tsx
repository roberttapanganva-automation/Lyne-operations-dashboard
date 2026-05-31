import { CaretDownIcon } from "@phosphor-icons/react";
import { getWorkspaceDisplayName } from "@/lib/branding/display";
import type { ActiveWorkspaceContext } from "@/types/domain";

type WorkspaceSwitcherProps = {
  canSwitch?: boolean;
  collapsed?: boolean;
  workspaceContext: ActiveWorkspaceContext;
};

export function WorkspaceSwitcher({
  canSwitch = false,
  collapsed = false,
  workspaceContext,
}: WorkspaceSwitcherProps) {
  const workspaceName = workspaceContext.workspace.name;
  const appName = getWorkspaceDisplayName({
    branding: workspaceContext.branding,
    workspaceName,
  });
  const Wrapper = canSwitch ? "button" : "div";

  return (
    <Wrapper
      {...(canSwitch
        ? {
            "aria-label": "Switch workspace",
            className:
              "w-full rounded-xl border border-white/10 bg-white/[0.05] text-left transition hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]",
            type: "button",
          }
        : {
            className:
              "w-full rounded-xl border border-white/10 bg-white/[0.05] text-left",
          })}
    >
      {collapsed ? (
        <div
          aria-label={appName}
          className="flex h-8 w-full items-center justify-center"
          title={appName}
        >
          <span className="block h-1.5 w-1.5 rounded-full bg-[var(--workspace-primary,var(--ops-primary))]" />
        </div>
      ) : (
        <div className="flex min-h-[54px] items-center gap-2 px-2.5 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-4 text-[var(--ops-white)]">
              {appName}
            </span>
            <span className="mt-0.5 block truncate text-[11px] leading-4 text-white/55">
              {workspaceName}
            </span>
          </span>
          {canSwitch ? (
            <CaretDownIcon
              aria-hidden="true"
              className="shrink-0 text-white/55"
              size={14}
              weight="bold"
            />
          ) : null}
        </div>
      )}
    </Wrapper>
  );
}
