import {
  BriefcaseIcon,
  CalendarBlankIcon,
  ChartBarIcon,
  CheckSquareIcon,
  CrownIcon,
  GearSixIcon,
  KanbanIcon,
  RobotIcon,
  SquaresFourIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import {
  canAccessOwnerConsole,
  canManageWorkspaceSettings,
  canViewAutomations,
  canViewReports,
} from "@/lib/permissions/workspace";
import type { ActiveWorkspaceContext } from "@/types/domain";

type ShellIcon = typeof SquaresFourIcon;

export type NavSection = "menu" | "more" | "utility";

export type ShellNavItem = {
  href: string;
  Icon: ShellIcon;
  label: string;
  moduleKey?:
    | "automations_enabled"
    | "calendar_enabled"
    | "jobs_enabled"
    | "leads_enabled"
    | "reports_enabled"
    | "tasks_enabled";
  ownerOnly?: boolean;
  section: NavSection;
  settingsOnly?: boolean;
};

const navItems: readonly ShellNavItem[] = [
  {
    href: "/dashboard",
    Icon: SquaresFourIcon,
    label: "Overview",
    section: "menu",
  },
  {
    href: "/jobs",
    Icon: BriefcaseIcon,
    label: "Jobs",
    moduleKey: "jobs_enabled",
    section: "menu",
  },
  {
    href: "/tasks",
    Icon: CheckSquareIcon,
    label: "Tasks",
    moduleKey: "tasks_enabled",
    section: "menu",
  },
  {
    href: "/calendar",
    Icon: CalendarBlankIcon,
    label: "Calendar",
    moduleKey: "calendar_enabled",
    section: "menu",
  },
  {
    href: "/leads",
    Icon: UsersThreeIcon,
    label: "CRM",
    moduleKey: "leads_enabled",
    section: "menu",
  },
  {
    href: "/pipelines",
    Icon: KanbanIcon,
    label: "Pipelines",
    section: "menu",
  },
  {
    href: "/automations",
    Icon: RobotIcon,
    label: "Automations",
    moduleKey: "automations_enabled",
    section: "more",
  },
  {
    href: "/reports",
    Icon: ChartBarIcon,
    label: "Reports",
    moduleKey: "reports_enabled",
    section: "more",
  },
  {
    href: "/owner",
    Icon: CrownIcon,
    label: "Owner Console",
    ownerOnly: true,
    section: "more",
  },
  {
    href: "/settings",
    Icon: GearSixIcon,
    label: "Settings",
    section: "utility",
    settingsOnly: true,
  },
] as const;

const sidebarSectionOrder: Array<{
  id: Exclude<NavSection, "utility">;
  label: string;
}> = [
  { id: "menu", label: "Menu" },
  { id: "more", label: "More" },
];

export function getVisibleNavItems(workspaceContext: ActiveWorkspaceContext) {
  return navItems.filter((item) => {
    if (item.settingsOnly) {
      return (
        workspaceContext.role !== "owner" &&
        (canManageWorkspaceSettings(workspaceContext.role) ||
          workspaceContext.rolePermissions?.can_view_settings === true)
      );
    }

    if (item.ownerOnly) {
      return canAccessOwnerConsole(workspaceContext.role);
    }

    if (item.moduleKey) {
      if (
        item.href === "/automations" &&
        !canViewAutomations(
          workspaceContext.role,
          workspaceContext.rolePermissions,
        )
      ) {
        return false;
      }

      if (item.href === "/reports" && !canViewReports(workspaceContext.role)) {
        return false;
      }

      return workspaceContext.modules?.[item.moduleKey] !== false;
    }

    return true;
  });
}

export function getSidebarNavGroups(workspaceContext: ActiveWorkspaceContext) {
  const visibleItems = getVisibleNavItems(workspaceContext);

  return sidebarSectionOrder
    .map((section) => ({
      items: visibleItems.filter((item) => item.section === section.id),
      label: section.label,
    }))
    .filter((section) => section.items.length > 0);
}

export function getUtilityNavItems(workspaceContext: ActiveWorkspaceContext) {
  return getVisibleNavItems(workspaceContext).filter(
    (item) => item.section === "utility",
  );
}

export function getMobileNavData(workspaceContext: ActiveWorkspaceContext) {
  const visibleItems = getVisibleNavItems(workspaceContext);
  const priorityPaths = ["/dashboard", "/jobs", "/tasks", "/calendar"];
  const primaryItems = priorityPaths
    .map((href) => visibleItems.find((item) => item.href === href))
    .filter((item): item is ShellNavItem => Boolean(item));
  const fallbackItems = visibleItems.filter(
    (item) =>
      !primaryItems.some((primaryItem) => primaryItem.href === item.href) &&
      item.section !== "utility",
  );
  const items = [...primaryItems, ...fallbackItems];

  return {
    overflowItems: visibleItems.filter(
      (item) =>
        !items.slice(0, 4).some((primaryItem) => primaryItem.href === item.href),
    ),
    primaryItems: items.slice(0, 4),
  };
}
