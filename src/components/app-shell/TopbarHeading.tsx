"use client";

import {
  BriefcaseIcon,
  CalendarBlankIcon,
  CheckSquareIcon,
  CrownIcon,
  GearSixIcon,
  RowsIcon,
  UserCircleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";

type TopbarHeadingProps = {
  displayName: string;
  greeting: string;
};

export const routeTitles: Array<{
  Icon: typeof UsersThreeIcon;
  match: RegExp;
  subtitle?: string;
  title: string;
}> = [
  { Icon: CrownIcon, match: /^\/owner\/branding/, title: "Branding" },
  { Icon: CrownIcon, match: /^\/owner\/modules/, title: "Modules" },
  { Icon: CrownIcon, match: /^\/owner\/pipeline/, title: "Pipeline" },
  { Icon: CrownIcon, match: /^\/owner\/access-rules/, title: "Access Rules" },
  { Icon: CrownIcon, match: /^\/owner\/audit-logs/, title: "Audit Logs" },
  { Icon: CrownIcon, match: /^\/owner\/invitations/, title: "Invitations" },
  { Icon: CrownIcon, match: /^\/owner\/team/, title: "Team" },
  { Icon: CrownIcon, match: /^\/owner/, title: "Owner Console" },
  {
    Icon: UsersThreeIcon,
    match: /^\/leads/,
    subtitle:
      "Keep the team focused on live opportunities, response timing, and the next best follow-up across the active workspace.",
    title: "CRM",
  },
  {
    Icon: BriefcaseIcon,
    match: /^\/jobs/,
    subtitle:
      "Coordinate scheduled work, service progress, and the revenue tied to every job on the board.",
    title: "Jobs",
  },
  {
    Icon: CheckSquareIcon,
    match: /^\/tasks/,
    subtitle:
      "Keep follow-ups, reminders, and operational tasks moving so nothing critical slips through the day.",
    title: "Tasks",
  },
  {
    Icon: CalendarBlankIcon,
    match: /^\/calendar/,
    subtitle:
      "Track appointments, scheduled work, and service commitments across the active workspace.",
    title: "Calendar",
  },
  {
    Icon: RowsIcon,
    match: /^\/pipelines/,
    subtitle:
      "Work every stage from one board so the team can spot movement, bottlenecks, and next actions faster.",
    title: "Pipelines",
  },
  { Icon: BriefcaseIcon, match: /^\/automations/, title: "Automations" },
  { Icon: UserCircleIcon, match: /^\/account/, title: "Account" },
  { Icon: GearSixIcon, match: /^\/settings/, title: "Settings" },
];

export function getTopbarRouteMatch(pathname: string) {
  return routeTitles.find((item) => item.match.test(pathname)) ?? null;
}

export function TopbarHeading({
  displayName,
  greeting,
}: TopbarHeadingProps) {
  const pathname = usePathname();

  if (pathname === "/dashboard") {
    return (
      <h1 className="mt-1 text-xl font-semibold text-[var(--ops-text)]">
        {greeting}, {displayName}
      </h1>
    );
  }

  const routeMatch = getTopbarRouteMatch(pathname);
  const routeTitle = routeMatch?.title ?? "Workspace";
  const RouteIcon = routeMatch?.Icon;
  const routeSubtitle = routeMatch?.subtitle ?? null;
  const hasStrongTitleTreatment = Boolean(routeSubtitle);

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3">
        {RouteIcon ? (
          <RouteIcon
            aria-hidden="true"
            className={`text-[var(--ops-primary-dark)] ${
              hasStrongTitleTreatment
                ? "drop-shadow-[0_3px_10px_rgba(37,99,235,0.18)]"
                : ""
            }`}
            size={hasStrongTitleTreatment ? 26 : 22}
            weight="duotone"
          />
        ) : null}
        <h1
          className={`font-semibold text-[var(--ops-text)] ${
            hasStrongTitleTreatment
              ? "text-2xl drop-shadow-[0_1px_1px_rgba(15,23,42,0.10)]"
              : "text-xl"
          }`}
        >
          {routeTitle}
        </h1>
      </div>
      {routeSubtitle ? (
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ops-text-soft)]">
          {routeSubtitle}
        </p>
      ) : null}
    </div>
  );
}
