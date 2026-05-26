"use client";

import { CheckSquareIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { AssignmentMemberField } from "@/components/assignments/AssignmentMemberField";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { TaskListItem } from "./TasksList";

type AddTaskDialogProps = {
  canAssignRecords?: boolean;
  className?: string;
  onTaskCreated?: (task: TaskListItem) => void;
  variant?: "primary" | "secondary" | "ghost";
};

type CreatedTask = Pick<
  TaskListItem,
  | "assigned_member"
  | "assigned_member_id"
  | "completed_at"
  | "created_at"
  | "description"
  | "due_at"
  | "id"
  | "priority"
  | "related_id"
  | "related_type"
  | "status"
  | "title"
>;

export function AddTaskDialog({
  canAssignRecords = false,
  className = "",
  onTaskCreated,
  variant = "primary",
}: AddTaskDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [dueTime, setDueTime] = useState("");

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setDueDate(undefined);
    setDueTime("");
    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const dueDateValue = dueDate
      ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`
      : "";
    const dueAt =
      dueDateValue && dueTime ? `${dueDateValue}T${dueTime}` : "";

    const payload = {
      assigned_member_id: canAssignRecords
        ? String(formData.get("assigned_member_id") ?? "") || null
        : undefined,
      description: String(formData.get("description") ?? ""),
      due_at: dueAt ? new Date(dueAt).toISOString() : undefined,
      priority: String(formData.get("priority") ?? "normal"),
      related_type: String(formData.get("related_type") ?? "general"),
      status: String(formData.get("status") ?? "todo"),
      title: String(formData.get("title") ?? ""),
    };

    try {
      const response = await fetch("/api/tasks", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<CreatedTask>;

      if (!response.ok || !result.ok) {
        const errorMessage =
          result.ok
            ? "We could not create the task. Please try again."
            : result.error.message;
        setError(errorMessage);
        notify.error("Task could not be added", errorMessage);
        return;
      }

      const createdTask = result.data;

      formRef.current?.reset();
      setDueDate(undefined);
      setDueTime("");
      setIsOpen(false);
      onTaskCreated?.({
        assigned_member: createdTask.assigned_member ?? null,
        assigned_member_id: createdTask.assigned_member_id ?? null,
        completed_at: createdTask.completed_at,
        created_at: createdTask.created_at,
        description: createdTask.description,
        due_at: createdTask.due_at,
        id: createdTask.id,
        priority: createdTask.priority,
        related_id: createdTask.related_id,
        related_type: createdTask.related_type,
        status: createdTask.status,
        title: createdTask.title,
      });
      notify.success("Task added", "The task was added to your workspace.");
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not create the task. Please try again.";
      setError(errorMessage);
      notify.error("Task could not be added", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        className={`gap-2 ${className}`}
        onClick={() => setIsOpen(true)}
        type="button"
        variant={variant}
      >
        <PlusIcon aria-hidden="true" size={20} weight="regular" />
        Add Task
      </Button>

      {isOpen ? (
        <div
          aria-labelledby="add-task-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4 sm:px-6">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
                  <CheckSquareIcon
                    aria-hidden="true"
                    size={22}
                    weight="duotone"
                  />
                </div>
                <div>
                  <h2
                    className="text-lg font-semibold text-[var(--ops-text)]"
                    id="add-task-title"
                  >
                    Add Task
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                    Create follow-up or operational work for this workspace.
                  </p>
                </div>
              </div>
              <button
                aria-label="Close add task dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
                disabled={isSubmitting}
                onClick={closeDialog}
                type="button"
              >
                <XIcon aria-hidden="true" size={20} weight="regular" />
              </button>
            </div>

            <form
              className="space-y-5 p-5 sm:p-6"
              onSubmit={handleSubmit}
              ref={formRef}
            >
              {error ? (
                <div
                  className="rounded-lg border border-[var(--ops-danger-soft)] bg-[var(--ops-danger-soft)] p-3 text-sm leading-6 text-[var(--ops-danger)]"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <div>
                <label
                  className="text-sm font-medium text-[var(--ops-text)]"
                  htmlFor="task-title"
                >
                  Task title <span className="text-[var(--ops-danger)]">*</span>
                </label>
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                  disabled={isSubmitting}
                  id="task-title"
                  name="title"
                  placeholder="Follow up with client"
                  required
                  type="text"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="task-due-at-time"
                  >
                    Due date/time
                  </label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                    <DatePicker
                      aria-label="Task due date"
                      clearable
                      disabled={isSubmitting}
                      onChange={setDueDate}
                      value={dueDate}
                    />
                    <input
                      className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                      disabled={isSubmitting}
                      id="task-due-at-time"
                      onChange={(event) => setDueTime(event.target.value)}
                      step="900"
                      type="time"
                      value={dueTime}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="task-priority"
                  >
                    Priority
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    defaultValue="normal"
                    disabled={isSubmitting}
                    id="task-priority"
                    name="priority"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="task-status"
                  >
                    Status
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    defaultValue="todo"
                    disabled={isSubmitting}
                    id="task-status"
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
                    htmlFor="task-related-type"
                  >
                    Related type
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    defaultValue="general"
                    disabled={isSubmitting}
                    id="task-related-type"
                    name="related_type"
                  >
                    <option value="general">General</option>
                    <option value="lead">Lead</option>
                    <option value="job">Job</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                {canAssignRecords ? (
                  <AssignmentMemberField
                    canAssign={canAssignRecords}
                    disabled={isSubmitting}
                    id="task-assigned-member"
                  />
                ) : null}
              </div>

              <div>
                <label
                  className="text-sm font-medium text-[var(--ops-text)]"
                  htmlFor="task-description"
                >
                  Description
                </label>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                  disabled={isSubmitting}
                  id="task-description"
                  name="description"
                  placeholder="Add details, reminders, or next steps."
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
                  {isSubmitting ? "Adding..." : "Add task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
