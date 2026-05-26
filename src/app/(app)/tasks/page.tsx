import { TasksWorkspace } from "@/components/tasks/TasksWorkspace";
import { getCurrentWorkspaceMemberId } from "@/lib/assignments/queries";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
  canAssignOperationalRecords,
  canCreateOperationalRecords,
  canDeleteOperationalRecords,
  canEditOperationalRecords,
} from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getTasksForActiveWorkspace } from "@/lib/tasks/queries";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";

type TasksPageProps = {
  searchParams: Promise<{
    filter?: string;
    view?: string;
  }>;
};

function getTaskFilter(value: string | undefined) {
  if (value === "today" || value === "upcoming") {
    return value;
  }

  return "whats-left";
}

function getTaskView(value: string | undefined) {
  if (value === "history") {
    return "history";
  }

  return "active";
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const activeFilter = getTaskFilter(params.filter);
  const activeView = getTaskView(params.view);
  const activeWorkspace = await getActiveWorkspace();
  const supabase = await createClient();
  const [tasks, currentMemberId] = await Promise.all([
    getTasksForActiveWorkspace(),
    getCurrentWorkspaceMemberId(),
  ]);
  const rolePermission =
    activeWorkspace.status === "ready"
      ? await getEffectiveRolePermission({
          role: activeWorkspace.context.role,
          supabase,
          workspaceId: activeWorkspace.context.workspace.id,
        })
      : null;
  const canCreateRecords =
    activeWorkspace.status === "ready" &&
    canCreateOperationalRecords(activeWorkspace.context.role) &&
    rolePermission?.can_create_tasks !== false;
  const canDeleteRecords =
    activeWorkspace.status === "ready" &&
    canDeleteOperationalRecords(activeWorkspace.context.role);
  const canUpdateRecords =
    activeWorkspace.status === "ready" &&
    canEditOperationalRecords(activeWorkspace.context.role);
  const canAssignRecords =
    activeWorkspace.status === "ready" &&
    canAssignOperationalRecords(activeWorkspace.context.role);
  const timezone =
    activeWorkspace.status === "ready"
      ? activeWorkspace.context.workspace.timezone
      : "UTC";

  return (
    <TasksWorkspace
      activeFilter={activeFilter}
      activeView={activeView}
      canAssignRecords={canAssignRecords}
      canCreateRecords={canCreateRecords}
      canDeleteRecords={canDeleteRecords}
      canUpdateRecords={canUpdateRecords}
      currentMemberId={currentMemberId}
      tasks={tasks}
      timezone={timezone}
    />
  );
}
