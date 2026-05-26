"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TaskHistoryList } from "./TaskHistoryList";
import { type TaskPageView, type TaskViewFilter, TasksPageHeader } from "./TasksPageHeader";
import { type TaskListItem, TasksList } from "./TasksList";

type TasksWorkspaceProps = {
  activeFilter: TaskViewFilter;
  activeView: TaskPageView;
  canAssignRecords: boolean;
  canCreateRecords: boolean;
  canDeleteRecords: boolean;
  canUpdateRecords: boolean;
  currentMemberId: string | null;
  tasks: TaskListItem[];
  timezone: string;
};

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
  tasks: TaskListItem[],
  activeFilter: TaskViewFilter,
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

export function TasksWorkspace({
  activeFilter,
  activeView,
  canAssignRecords,
  canCreateRecords,
  canDeleteRecords,
  canUpdateRecords,
  currentMemberId,
  tasks,
  timezone,
}: TasksWorkspaceProps) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [assignmentView, setAssignmentView] = useState<
    "all" | "assigned_to_me" | "overdue" | "unassigned"
  >("all");

  const activeTasks = useMemo(
    () =>
      localTasks.filter(
        (task) => task.status !== "done" && task.status !== "cancelled",
      ),
    [localTasks],
  );
  const historyTasks = useMemo(
    () => localTasks.filter((task) => task.status === "done"),
    [localTasks],
  );
  const filteredTasks = useMemo(
    () => {
      const bySchedule = filterTasks(localTasks, activeFilter, timezone);

      if (assignmentView === "assigned_to_me") {
        return bySchedule.filter(
          (task) =>
            currentMemberId && task.assigned_member_id === currentMemberId,
        );
      }

      if (assignmentView === "unassigned") {
        return bySchedule.filter((task) => !task.assigned_member_id);
      }

      if (assignmentView === "overdue") {
        const now = new Date().getTime();

        return bySchedule.filter(
          (task) =>
            task.due_at &&
            task.status !== "done" &&
            task.status !== "cancelled" &&
            new Date(task.due_at).getTime() < now,
        );
      }

      return bySchedule;
    },
    [activeFilter, assignmentView, currentMemberId, localTasks, timezone],
  );

  function prependTask(task: TaskListItem) {
    setLocalTasks((current) => [task, ...current]);
  }

  function updateTask(task: TaskListItem) {
    setLocalTasks((current) =>
      current.map((currentTask) =>
        currentTask.id === task.id ? task : currentTask,
      ),
    );
  }

  function applyTaskStatusOptimistic(
    task: TaskListItem,
    nextStatus: "done" | "todo",
  ) {
    const snapshot = localTasks;

    setLocalTasks((current) =>
      current.map((currentTask) =>
        currentTask.id === task.id
          ? {
              ...currentTask,
              completed_at:
                nextStatus === "done"
                  ? currentTask.completed_at ?? new Date().toISOString()
                  : null,
              status: nextStatus,
            }
          : currentTask,
      ),
    );

    return () => {
      setLocalTasks(snapshot);
    };
  }

  function removeDeletedTasks(taskIds: string[]) {
    const deletedIds = new Set(taskIds);
    setLocalTasks((current) =>
      current.filter((task) => !deletedIds.has(task.id)),
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <TasksPageHeader
        activeFilter={activeFilter}
        activeTaskCount={activeTasks.length}
        activeView={activeView}
        canAssignRecords={canAssignRecords}
        canCreateRecords={canCreateRecords}
        historyTaskCount={historyTasks.length}
        onTaskCreated={prependTask}
      />
      {activeView === "active" ? (
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "assigned_to_me", label: "Assigned to me" },
            { key: "unassigned", label: "Unassigned" },
            { key: "overdue", label: "Overdue" },
          ].map((view) => (
            <button
              className={`inline-flex h-8 items-center rounded-lg px-3 text-sm font-semibold transition ${
                assignmentView === view.key
                  ? "bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]"
                  : "text-[var(--ops-text-soft)] hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
              }`}
              key={view.key}
              onClick={() =>
                setAssignmentView(
                  view.key as
                    | "all"
                    | "assigned_to_me"
                    | "overdue"
                    | "unassigned",
                )
              }
              type="button"
            >
              {view.label}
            </button>
          ))}
        </div>
      ) : null}
      {activeView === "history" ? (
        <Card className="ops-density-surface overflow-hidden">
          <TaskHistoryList
            canRestoreTasks={canUpdateRecords}
            onTaskStatusOptimistic={applyTaskStatusOptimistic}
            tasks={historyTasks}
          />
        </Card>
      ) : localTasks.length === 0 ? (
        <TasksList
          canAssignRecords={canAssignRecords}
          canCreateRecords={canCreateRecords}
          canDeleteRecords={canDeleteRecords}
          canUpdateRecords={canUpdateRecords}
          emptyStateVariant="workspace"
          onTaskCreated={prependTask}
          onTaskStatusOptimistic={applyTaskStatusOptimistic}
          onTaskUpdated={updateTask}
          onTasksDeleted={removeDeletedTasks}
          tasks={localTasks}
        />
      ) : (
        <Card className="ops-density-surface overflow-hidden">
          <TasksList
            canAssignRecords={canAssignRecords}
            canCreateRecords={canCreateRecords}
            canDeleteRecords={canDeleteRecords}
            canUpdateRecords={canUpdateRecords}
            emptyStateVariant="filtered"
            onTaskStatusOptimistic={applyTaskStatusOptimistic}
            onTaskUpdated={updateTask}
            onTasksDeleted={removeDeletedTasks}
            tasks={filteredTasks}
          />
        </Card>
      )}
    </div>
  );
}
