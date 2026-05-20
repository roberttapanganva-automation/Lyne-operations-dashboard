import { TasksList } from "@/components/tasks/TasksList";
import { TaskHistoryList } from "@/components/tasks/TaskHistoryList";
import { TasksPageHeader } from "@/components/tasks/TasksPageHeader";
import { Card } from "@/components/ui/Card";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
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

function getDateKey(value: string, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: timezone,
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  }
}

function filterTasks(
  tasks: Awaited<ReturnType<typeof getTasksForActiveWorkspace>>,
  activeFilter: "today" | "upcoming" | "whats-left",
  timezone: string,
) {
  const now = new Date();
  const todayKey = getDateKey(now.toISOString(), timezone);

  if (activeFilter === "today") {
    return tasks.filter(
      (task) =>
        task.status !== "done" &&
        task.status !== "cancelled" &&
        task.due_at &&
        getDateKey(task.due_at, timezone) === todayKey,
    );
  }

  if (activeFilter === "upcoming") {
    return tasks.filter(
      (task) =>
        task.status !== "done" &&
        task.status !== "cancelled" &&
        task.due_at &&
        new Date(task.due_at).getTime() > now.getTime() &&
        getDateKey(task.due_at, timezone) !== todayKey,
    );
  }

  return tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const activeFilter = getTaskFilter(params.filter);
  const activeView = getTaskView(params.view);
  const activeWorkspace = await getActiveWorkspace();
  const supabase = await createClient();
  const tasks = await getTasksForActiveWorkspace();
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
  const timezone =
    activeWorkspace.status === "ready"
      ? activeWorkspace.context.workspace.timezone
      : "UTC";
  const activeTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled",
  );
  const historyTasks = tasks.filter((task) => task.status === "done");
  const filteredTasks = filterTasks(tasks, activeFilter, timezone);

  return (
    <div className="space-y-5 sm:space-y-6">
      <TasksPageHeader
        activeFilter={activeFilter}
        activeTaskCount={activeTasks.length}
        activeView={activeView}
        canCreateRecords={canCreateRecords}
        historyTaskCount={historyTasks.length}
      />
      {activeView === "history" ? (
        <Card className="overflow-hidden">
          <TaskHistoryList
            canRestoreTasks={canUpdateRecords}
            tasks={historyTasks}
          />
        </Card>
      ) : tasks.length === 0 ? (
        <TasksList
          canCreateRecords={canCreateRecords}
          canDeleteRecords={canDeleteRecords}
          canUpdateRecords={canUpdateRecords}
          emptyStateVariant="workspace"
          tasks={tasks}
        />
      ) : (
        <Card className="overflow-hidden">
          <TasksList
            canCreateRecords={canCreateRecords}
            canDeleteRecords={canDeleteRecords}
            canUpdateRecords={canUpdateRecords}
            emptyStateVariant="filtered"
            tasks={filteredTasks}
          />
        </Card>
      )}
    </div>
  );
}
