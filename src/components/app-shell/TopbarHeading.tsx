"use client";

import {
  BriefcaseIcon,
  CalendarBlankIcon,
  ChartBarIcon,
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
  {
    Icon: CrownIcon,
    match: /^\/owner\/branding/,
    subtitle:
      "Control workspace branding, roles, permissions, modules, and business-level configuration.",
    title: "Branding",
  },
  {
    Icon: CrownIcon,
    match: /^\/owner\/modules/,
    subtitle:
      "Control workspace branding, roles, permissions, modules, and business-level configuration.",
    title: "Modules",
  },
  {
    Icon: CrownIcon,
    match: /^\/owner\/pipeline/,
    subtitle:
      "Customize lead and job stages to match how your business tracks work from start to finish.",
    title: "Pipeline",
  },
  {
    Icon: CrownIcon,
    match: /^\/owner\/access-rules/,
    subtitle:
      "Control workspace branding, roles, permissions, modules, and business-level configuration.",
    title: "Access Rules",
  },
  {
    Icon: CrownIcon,
    match: /^\/owner\/audit-logs/,
    subtitle:
      "Control workspace branding, roles, permissions, modules, and business-level configuration.",
    title: "Audit Logs",
  },
  {
    Icon: CrownIcon,
    match: /^\/owner\/invitations/,
    subtitle:
      "Control workspace branding, roles, permissions, modules, and business-level configuration.",
    title: "Invitations",
  },
  {
    Icon: CrownIcon,
    match: /^\/owner\/team/,
    subtitle:
      "Control workspace branding, roles, permissions, modules, and business-level configuration.",
    title: "Team",
  },
  {
    Icon: CrownIcon,
    match: /^\/owner/,
    subtitle:
      "Control workspace branding, roles, permissions, modules, and business-level configuration.",
    title: "Owner Console",
  },
  {
    Icon: UsersThreeIcon,
    match: /^\/leads/,
    subtitle:
      "Manage contacts, leads, follow-ups, and pipeline activity across your workspace.",
    title: "CRM",
  },
  {
    Icon: BriefcaseIcon,
    match: /^\/jobs/,
    subtitle:
      "Schedule, manage, update, and review service jobs from creation to completion.",
    title: "Jobs",
  },
  {
    Icon: CheckSquareIcon,
    match: /^\/tasks/,
    subtitle:
      "Track assigned work, complete tasks, review task history, and restore items when needed.",
    title: "Tasks",
  },
  {
    Icon: CalendarBlankIcon,
    match: /^\/calendar/,
    subtitle:
      "View upcoming appointments, scheduled jobs, and time-sensitive work across the workspace.",
    title: "Calendar",
  },
  {
    Icon: RowsIcon,
    match: /^\/pipelines/,
    subtitle:
      "Customize lead and job stages to match how your business tracks work from start to finish.",
    title: "Pipelines",
  },
  {
    Icon: BriefcaseIcon,
    match: /^\/automations/,
    subtitle:
      "Monitor webhook activity, test n8n connections, and review automation runs across your workspace.",
    title: "Automations",
  },
  {
    Icon: ChartBarIcon,
    match: /^\/reports/,
    subtitle:
      "Review workspace trends, activity, performance, and operational insights over time.",
    title: "Reports",
  },
  {
    Icon: UserCircleIcon,
    match: /^\/account/,
    subtitle:
      "Update your profile, avatar, preferences, security options, and workspace access details.",
    title: "Account",
  },
  {
    Icon: GearSixIcon,
    match: /^\/settings/,
    subtitle:
      "Manage workspace details, branding, modules, templates, and system preferences.",
    title: "Settings",
  },
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
            className="text-[var(--workspace-primary,var(--ops-primary-dark))]"
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
