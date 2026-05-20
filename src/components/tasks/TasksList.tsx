"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DateTimeCell, DateTimeHeader } from "@/components/ui/DateTimeCell";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import { EditTaskDialog } from "./EditTaskDialog";
import { TaskActions } from "./TaskActions";
import { TaskPriorityBadge, type TaskPriority } from "./TaskPriorityBadge";
import { TaskStatusBadge, type TaskStatus } from "./TaskStatusBadge";
import { TasksEmptyState } from "./TasksEmptyState";

export type TaskRelatedType = "lead" | "job" | "client" | "general";

export type TaskListItem = {
  assigned_to: string | null;
  assigned_user: {
    full_name: string | null;
    id: string;
  } | null;
  completed_at: string | null;
  created_at: string;
  description: string | null;
  due_at: string | null;
  id: string;
  priority: TaskPriority;
  related_id: string | null;
  related_type: TaskRelatedType;
  status: TaskStatus;
  title: string;
};

type TasksListProps = {
  canCreateRecords: boolean;
  canDeleteRecords: boolean;
  canUpdateRecords: boolean;
  emptyStateVariant?: "filtered" | "workspace";
  tasks: TaskListItem[];
};

type BulkDeleteResponse = {
  deleted: Array<{
    id: string;
    title: string;
  }>;
  deletedCount: number;
};

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function isTaskOverdue(task: TaskListItem) {
  if (!task.due_at || task.status === "done" || task.status === "cancelled") {
    return false;
  }

  return new Date(task.due_at).getTime() < Date.now();
}

function formatRelatedType(value: TaskRelatedType) {
  if (value === "general") {
    return "General";
  }

  return value[0].toUpperCase() + value.slice(1);
}

export function TasksList({
  canCreateRecords,
  canDeleteRecords,
  canUpdateRecords,
  emptyStateVariant = "workspace",
  tasks,
}: TasksListProps) {
  const router = useRouter();
  const [editingTask, setEditingTask] = useState<TaskListItem | null>(null);
  const [visibleTasks, setVisibleTasks] = useState(tasks);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    setVisibleTasks(tasks);
    setSelectedIds((current) =>
      current.filter((id) => tasks.some((task) => task.id === id)),
    );
  }, [tasks]);

  if (visibleTasks.length === 0) {
    if (emptyStateVariant === "filtered") {
      return (
        <div className="px-5 py-10 text-center sm:px-6">
          <h2 className="text-base font-semibold text-[var(--ops-text)]">
            No active tasks yet.
          </h2>
          <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
            Try another task view, or add a new task for this workspace.
          </p>
        </div>
      );
    }

    return <TasksEmptyState canCreateRecords={canCreateRecords} />;
  }

  function openTaskEditor(task: TaskListItem) {
    if (!canCreateRecords) {
      return;
    }

    setEditingTask(task);
  }

  const allSelected =
    visibleTasks.length > 0 &&
    visibleTasks.every((task) => selectedIds.includes(task.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(visibleTasks.map((task) => task.id));
  }

  function toggleTaskSelection(taskId: string) {
    setSelectedIds((current) =>
      current.includes(taskId)
        ? current.filter((selectedId) => selectedId !== taskId)
        : [...current, taskId],
    );
  }

  function clearSelection() {
    setSelectedIds([]);
    setBulkDeleteError(null);
  }

  async function deleteSelectedTasks() {
    setBulkDeleteError(null);
    setIsBulkDeleting(true);

    try {
      const response = await fetch("/api/tasks/bulk", {
        body: JSON.stringify({
          action: "delete",
          ids: selectedIds,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<BulkDeleteResponse>;

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "We could not delete the selected tasks."
          : result.error.message;
        setBulkDeleteError(message);
        notify.error("Task delete failed", message);
        return;
      }

      const deletedIds = new Set(result.data.deleted.map((task) => task.id));
      setVisibleTasks((current) =>
        current.filter((task) => !deletedIds.has(task.id)),
      );
      notify.success(
        result.data.deletedCount === 1 ? "Task deleted" : "Tasks deleted",
        result.data.deletedCount === 1
          ? "The selected task was removed."
          : "The selected tasks were removed.",
      );
      clearSelection();
      setBulkDeleteOpen(false);
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not delete the selected tasks.";
      setBulkDeleteError(message);
      notify.error("Task delete failed", message);
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <>
      {canDeleteRecords && selectedIds.length > 0 ? (
        <div className="border-b border-[var(--ops-border)] px-5 py-3 sm:px-6">
          <BulkActionBar
            canDelete
            canEdit={false}
            entityLabel="task"
            onClearSelection={clearSelection}
            onDelete={() => setBulkDeleteOpen(true)}
            selectedCount={selectedIds.length}
          />
          {bulkDeleteError ? (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--ops-danger)]">
              {bulkDeleteError}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--ops-card-soft)] text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
            <tr>
              {canDeleteRecords ? (
                <th className="w-12 px-5 py-3 sm:px-6" scope="col">
                  <input
                    aria-label="Select all visible tasks"
                    checked={allSelected}
                    className="h-4 w-4 rounded border-[var(--ops-border)] accent-[var(--ops-primary)]"
                    onChange={toggleSelectAll}
                    type="checkbox"
                  />
                </th>
              ) : null}
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
                <DateTimeHeader label="Due" />
              </th>
              <th className="px-5 py-3" scope="col">
                Related
              </th>
              <th className="px-5 py-3" scope="col">
                Created
              </th>
              <th className="px-5 py-3" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ops-border)] bg-white">
            {visibleTasks.map((task) => {
              const overdue = isTaskOverdue(task);

              return (
                <tr
                  className={canCreateRecords ? "cursor-pointer transition hover:bg-[var(--ops-card-soft)]" : ""}
                  key={task.id}
                  onDoubleClick={() => openTaskEditor(task)}
                  title={canCreateRecords ? "Double-click to edit task" : undefined}
                >
                  {canDeleteRecords ? (
                    <td className="px-5 py-4 sm:px-6">
                      <input
                        aria-label={`Select task ${task.title}`}
                        checked={selectedIds.includes(task.id)}
                        className="h-4 w-4 rounded border-[var(--ops-border)] accent-[var(--ops-primary)]"
                        onChange={() => toggleTaskSelection(task.id)}
                        onDoubleClick={(event) => event.stopPropagation()}
                        type="checkbox"
                      />
                    </td>
                  ) : null}
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
                    <div className="space-y-1">
                      <DateTimeCell emptyLabel="No due date" value={task.due_at} />
                      {overdue ? <Badge variant="danger">Overdue</Badge> : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                    {formatRelatedType(task.related_type)}
                  </td>
                  <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                    {formatCreatedDate(task.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <div onDoubleClick={(event) => event.stopPropagation()}>
                      <TaskActions
                        canUpdateStatus={canUpdateRecords}
                        task={task}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--ops-border)] xl:hidden">
        {visibleTasks.map((task) => {
          const overdue = isTaskOverdue(task);

          return (
            <article
              className={canCreateRecords ? "cursor-pointer p-5 transition hover:bg-[var(--ops-card-soft)]" : "p-5"}
              key={task.id}
              onDoubleClick={() => openTaskEditor(task)}
              title={canCreateRecords ? "Double-click to edit task" : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                {canDeleteRecords ? (
                  <input
                    aria-label={`Select task ${task.title}`}
                    checked={selectedIds.includes(task.id)}
                    className="mt-1 h-4 w-4 rounded border-[var(--ops-border)] accent-[var(--ops-primary)]"
                    onChange={() => toggleTaskSelection(task.id)}
                    onDoubleClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                ) : null}
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
                    Due
                  </p>
                  <div className="mt-1 space-y-1 text-[var(--ops-text-soft)]">
                    <DateTimeCell emptyLabel="No due date" value={task.due_at} />
                    {overdue ? <Badge variant="danger">Overdue</Badge> : null}
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
                    Created
                  </p>
                  <p className="mt-1 text-[var(--ops-text-soft)]">
                    {formatCreatedDate(task.created_at)}
                  </p>
                </div>
              </div>

              <div
                className="mt-4"
                onDoubleClick={(event) => event.stopPropagation()}
              >
                <TaskActions
                  canUpdateStatus={canUpdateRecords}
                  task={task}
                />
              </div>
            </article>
          );
        })}
      </div>
      {editingTask ? (
        <EditTaskDialog
          hideTrigger
          onOpenChange={(open) => {
            if (!open) {
              setEditingTask(null);
            }
          }}
          open
          task={editingTask}
        />
      ) : null}
      <ConfirmDeleteDialog
        confirmLabel={
          selectedIds.length === 1 ? "Delete task" : "Delete tasks"
        }
        description="This will permanently remove the selected task records from this workspace. Use this only for abandoned, cancelled, duplicate, or incorrectly added tasks."
        isSubmitting={isBulkDeleting}
        itemCount={selectedIds.length}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={deleteSelectedTasks}
        open={bulkDeleteOpen}
        title="Delete selected tasks?"
      />
    </>
  );
}
