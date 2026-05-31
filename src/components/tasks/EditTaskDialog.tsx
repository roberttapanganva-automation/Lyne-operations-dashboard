"use client";

import { PencilSimpleLineIcon, XIcon } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { AssignmentMemberField } from "@/components/assignments/AssignmentMemberField";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { TaskListItem } from "./TasksList";

type EditTaskDialogProps = {
  canAssignRecords?: boolean;
  hideTrigger?: boolean;
  onOpenChange?: (open: boolean) => void;
  onTaskUpdated?: (task: TaskListItem) => void;
  open?: boolean;
  task: TaskListItem;
};

type UpdatedTask = Pick<
  TaskListItem,
  | "assigned_member"
  | "assigned_member_id"
  | "completed_at"
  | "description"
  | "due_at"
  | "id"
  | "priority"
  | "related_type"
  | "status"
  | "title"
>;

function splitDateTime(value: string | null) {
  if (!value) {
    return { date: undefined, time: "" };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: undefined, time: "" };
  }

  return {
    date,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`,
  };
}

function formatLocalDate(value: Date | undefined) {
  if (!value) {
    return "";
  }

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function EditTaskDialog({
  canAssignRecords = false,
  hideTrigger = false,
  onOpenChange,
  onTaskUpdated,
  open,
  task,
}: EditTaskDialogProps) {
  const initialDue = splitDateTime(task.due_at);
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDue.date);
  const [dueTime, setDueTime] = useState(initialDue.time);
  const isOpen = open ?? internalOpen;

  function setDialogOpen(nextOpen: boolean) {
    if (onOpenChange) {
      onOpenChange(nextOpen);
      return;
    }

    setInternalOpen(nextOpen);
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setDialogOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const dueDateValue = formatLocalDate(dueDate);
    const dueAt =
      dueDateValue && dueTime
        ? new Date(`${dueDateValue}T${dueTime}`).toISOString()
        : undefined;

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        body: JSON.stringify({
          assigned_member_id: canAssignRecords
            ? String(formData.get("assigned_member_id") ?? "") || null
            : undefined,
          description: String(formData.get("description") ?? ""),
          due_at: dueAt,
          priority: String(formData.get("priority") ?? task.priority),
          related_type: String(formData.get("related_type") ?? task.related_type),
          status: String(formData.get("status") ?? task.status),
          title: String(formData.get("title") ?? ""),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<UpdatedTask>;

      if (!response.ok || !result.ok) {
        const errorMessage =
          result.ok
            ? "We could not update the task. Please try again."
            : result.error.message;
        setError(errorMessage);
        notify.error("Task could not be updated", errorMessage);
        return;
      }

      const updatedTask = result.data;

      setDialogOpen(false);
      onTaskUpdated?.({
        ...task,
        assigned_member:
          updatedTask.assigned_member === undefined
            ? task.assigned_member
            : updatedTask.assigned_member,
        assigned_member_id:
          updatedTask.assigned_member_id === undefined
            ? task.assigned_member_id
            : updatedTask.assigned_member_id,
        completed_at: updatedTask.completed_at,
        description: updatedTask.description ?? null,
        due_at: updatedTask.due_at ?? null,
        priority: updatedTask.priority ?? task.priority,
        related_type: updatedTask.related_type ?? task.related_type,
        status: updatedTask.status,
        title: updatedTask.title,
      });
      notify.success("Task updated", "The task details were saved.");
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update the task. Please try again.";
      setError(errorMessage);
      notify.error("Task could not be updated", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <button
          aria-label={`Edit task ${task.title}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white text-[var(--workspace-primary,var(--ops-primary-dark))] shadow-sm transition hover:bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
          onClick={() => setDialogOpen(true)}
          title="Edit task"
          type="button"
        >
          <PencilSimpleLineIcon aria-hidden="true" size={18} weight="regular" />
        </button>
      )}

      {isOpen ? (
        <div
          aria-labelledby={`edit-task-${task.id}`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
              <div>
                <h2
                  className="text-lg font-semibold text-[var(--ops-text)]"
                  id={`edit-task-${task.id}`}
                >
                  Edit Task
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Update task details and due timing.
                </p>
              </div>
              <button
                aria-label="Close edit task dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
                disabled={isSubmitting}
                onClick={closeDialog}
                type="button"
              >
                <XIcon aria-hidden="true" size={20} weight="regular" />
              </button>
            </div>

            <form className="space-y-5 p-5" onSubmit={handleSubmit}>
              {error ? (
                <div
                  className="rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <div>
                <label
                  className="text-sm font-medium text-[var(--ops-text)]"
                  htmlFor={`edit-task-title-${task.id}`}
                >
                  Task title <span className="text-[var(--ops-danger)]">*</span>
                </label>
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                  defaultValue={task.title}
                  disabled={isSubmitting}
                  id={`edit-task-title-${task.id}`}
                  name="title"
                  required
                  type="text"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-task-status-${task.id}`}
                  >
                    Status
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue={task.status}
                    disabled={isSubmitting}
                    id={`edit-task-status-${task.id}`}
                    name="status"
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-task-priority-${task.id}`}
                  >
                    Priority
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue={task.priority}
                    disabled={isSubmitting}
                    id={`edit-task-priority-${task.id}`}
                    name="priority"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <DatePicker
                    aria-label="Task due date"
                    clearable
                    disabled={isSubmitting}
                    label="Due date"
                    onChange={setDueDate}
                    value={dueDate}
                  />
                </div>
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-task-time-${task.id}`}
                  >
                    Due time
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id={`edit-task-time-${task.id}`}
                    onChange={(event) => setDueTime(event.target.value)}
                    step="900"
                    type="time"
                    value={dueTime}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-task-related-${task.id}`}
                  >
                    Related type
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue={task.related_type}
                    disabled={isSubmitting}
                    id={`edit-task-related-${task.id}`}
                    name="related_type"
                  >
                    <option value="general">General</option>
                    <option value="lead">Lead</option>
                    <option value="job">Job</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <AssignmentMemberField
                  assignedMember={task.assigned_member}
                  canAssign={canAssignRecords}
                  defaultValue={task.assigned_member_id}
                  disabled={isSubmitting}
                  id={`edit-task-assigned-member-${task.id}`}
                />
              </div>

              <div>
                <label
                  className="text-sm font-medium text-[var(--ops-text)]"
                  htmlFor={`edit-task-description-${task.id}`}
                >
                  Description
                </label>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                  defaultValue={task.description ?? ""}
                  disabled={isSubmitting}
                  id={`edit-task-description-${task.id}`}
                  name="description"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[var(--ops-border)] pt-5 sm:flex-row sm:justify-end">
                <Button
                  disabled={isSubmitting}
                  onClick={closeDialog}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Saving..." : "Save task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
