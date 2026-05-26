"use client";

import { usePathname } from "next/navigation";
import { TopbarHeading } from "@/components/app-shell/TopbarHeading";

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
  const showAppName = pathname === "/dashboard";

  return (
    <div>
      {showAppName ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)] drop-shadow-[0_1px_1px_rgba(148,163,184,0.28)]">
          {appName}
        </p>
      ) : null}
      <TopbarHeading displayName={displayName} greeting={greeting} />
    </div>
  );
}
