"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DateTimeCell, DateTimeHeader } from "@/components/ui/DateTimeCell";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import { TaskStatusBadge } from "./TaskStatusBadge";
import type { TaskListItem, TaskRelatedType } from "./TasksList";

type TaskHistoryListProps = {
  canRestoreTasks: boolean;
  tasks: TaskListItem[];
};

type RestoredTask = {
  id: string;
};

function formatRelatedType(value: TaskRelatedType) {
  if (value === "general") {
    return "General";
  }

  return value[0].toUpperCase() + value.slice(1);
}

function formatAssignedUser(task: TaskListItem) {
  if (task.assigned_user?.full_name) {
    return task.assigned_user.full_name;
  }

  if (task.assigned_to) {
    return "Assigned user";
  }

  return "Unassigned";
}

export function TaskHistoryList({
  canRestoreTasks,
  tasks,
}: TaskHistoryListProps) {
  const router = useRouter();
  const [visibleTasks, setVisibleTasks] = useState(tasks);
  const [restoringTaskId, setRestoringTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVisibleTasks(tasks);
  }, [tasks]);

  async function restoreTask(task: TaskListItem) {
    setError(null);
    setRestoringTaskId(task.id);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        body: JSON.stringify({ status: "todo" }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<RestoredTask>;

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "We could not restore the task. Please try again."
          : result.error.message;
        setError(message);
        notify.error("Task restore failed", message);
        return;
      }

      setVisibleTasks((current) =>
        current.filter((currentTask) => currentTask.id !== task.id),
      );
      notify.success(
        "Task restored",
        "The task was moved back to active work.",
      );
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not restore the task. Please try again.";
      setError(message);
      notify.error("Task restore failed", message);
    } finally {
      setRestoringTaskId(null);
    }
  }

  if (visibleTasks.length === 0) {
    return (
      <div className="px-5 py-10 text-center sm:px-6">
        <h2 className="text-base font-semibold text-[var(--ops-text)]">
          No completed tasks yet.
        </h2>
        <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
          Finished tasks will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      {error ? (
        <div className="border-b border-[var(--ops-border)] px-5 py-3 sm:px-6">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--ops-danger)]">
            {error}
          </p>
        </div>
      ) : null}
      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--ops-card-soft)] text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
            <tr>
              <th className="px-5 py-3 sm:px-6" scope="col">
                Task
              </th>
              <th className="px-5 py-3" scope="col">
                Status
              </th>
              <th className="px-5 py-3" scope="col">
                Priority
              </th>
              <th className="px-5 py-3" scope="col">
                Related
              </th>
              <th className="px-5 py-3" scope="col">
                <DateTimeHeader label="Completed" />
              </th>
              <th className="px-5 py-3" scope="col">
                Assigned
              </th>
              <th className="px-5 py-3 text-right" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ops-border)] bg-white">
            {visibleTasks.map((task) => (
              <tr className="align-top" key={task.id}>
                <td className="px-5 py-4 sm:px-6">
                  <p className="font-medium text-[var(--ops-text)]">
                    {task.title}
                  </p>
                  {task.description ? (
                    <p className="mt-1 max-w-sm truncate text-xs text-[var(--ops-text-muted)]">
                      {task.description}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <TaskStatusBadge status={task.status} />
                </td>
                <td className="px-5 py-4">
                  <TaskPriorityBadge priority={task.priority} />
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  {formatRelatedType(task.related_type)}
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  <DateTimeCell
                    emptyLabel="Completion time unavailable"
                    value={task.completed_at}
                  />
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  {formatAssignedUser(task)}
                </td>
                <td className="px-5 py-4 text-right">
                  {canRestoreTasks ? (
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))] shadow-sm transition hover:bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))] disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={restoringTaskId === task.id}
                      onClick={() => restoreTask(task)}
                      type="button"
                    >
                      <ArrowCounterClockwiseIcon
                        aria-hidden="true"
                        size={16}
                        weight="regular"
                      />
                      {restoringTaskId === task.id ? "Restoring..." : "Restore"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--ops-border)] xl:hidden">
        {visibleTasks.map((task) => (
          <article className="p-5" key={task.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-[var(--ops-text)]">
                  {task.title}
                </h2>
                {task.description ? (
                  <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                    {task.description}
                  </p>
                ) : null}
              </div>
              <TaskStatusBadge status={task.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Priority
                </p>
                <div className="mt-1">
                  <TaskPriorityBadge priority={task.priority} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Completed
                </p>
                <div className="mt-1 text-[var(--ops-text-soft)]">
                  <DateTimeCell
                    emptyLabel="Completion time unavailable"
                    value={task.completed_at}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Related
                </p>
                <p className="mt-1 text-[var(--ops-text-soft)]">
                  {formatRelatedType(task.related_type)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Assigned
                </p>
                <p className="mt-1 text-[var(--ops-text-soft)]">
                  {formatAssignedUser(task)}
                </p>
              </div>
            </div>
            {canRestoreTasks ? (
              <div className="mt-4">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))] shadow-sm transition hover:bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={restoringTaskId === task.id}
                  onClick={() => restoreTask(task)}
                  type="button"
                >
                  <ArrowCounterClockwiseIcon
                    aria-hidden="true"
                    size={16}
                    weight="regular"
                  />
                  {restoringTaskId === task.id ? "Restoring..." : "Restore"}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </>
  );
}
