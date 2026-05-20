"use client";

import { BriefcaseIcon } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import {
  getTopbarRouteMatch,
  TopbarHeading,
} from "@/components/app-shell/TopbarHeading";

type TopbarTitleBlockProps = {
  appName: string;
  displayName: string;
  greeting: string;
};

export function TopbarTitleBlock({
  appName,
  displayName,
  greeting,
}: TopbarTitleBlockProps) {
  const pathname = usePathname();

  if (pathname === "/dashboard") {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
          {appName}
        </p>
        <TopbarHeading displayName={displayName} greeting={greeting} />
      </div>
    );
  }

  const routeMatch = getTopbarRouteMatch(pathname);
  const RouteIcon = routeMatch?.Icon ?? BriefcaseIcon;
  const routeTitle = routeMatch?.title ?? "Workspace";
  const hasStrongTitleTreatment = Boolean(routeMatch?.subtitle);

  if (hasStrongTitleTreatment) {
    return <TopbarHeading displayName={displayName} greeting={greeting} />;
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
        <RouteIcon
          aria-hidden="true"
          className="text-[var(--ops-primary-dark)]"
          size={14}
          weight="duotone"
        />
        <span>{routeTitle}</span>
      </div>
      <TopbarHeading displayName={displayName} greeting={greeting} />
    </div>
  );
}
