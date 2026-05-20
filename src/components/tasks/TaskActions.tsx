"use client";

import { ArrowCounterClockwiseIcon, CheckIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { TaskListItem } from "./TasksList";

type TaskActionsProps = {
  canUpdateStatus: boolean;
  task: TaskListItem;
};

type UpdatedTask = {
  id: string;
};

function getErrorMessage(response: ApiResponse<UpdatedTask>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

export function TaskActions({ canUpdateStatus, task }: TaskActionsProps) {
  const router = useRouter();
  const status = task.status;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextStatus: "done" | "todo") {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        body: JSON.stringify({ status: nextStatus }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<UpdatedTask>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const errorMessage =
          message ?? "We could not update the task. Please try again.";
        setError(errorMessage);
        notify.error("Task update failed", errorMessage);
        return;
      }

      notify.success(
        nextStatus === "done" ? "Task completed" : "Task reopened",
        nextStatus === "done"
          ? "The task was moved to history."
          : "The task was moved back to active work.",
      );
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update the task. Please try again.";
      setError(errorMessage);
      notify.error("Task update failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  if (!canUpdateStatus) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Button
        aria-label={status === "done" ? "Reopen task" : "Mark task as done"}
        className={`h-9 min-w-24 rounded-lg px-3 text-sm font-semibold ${
          status === "done"
            ? "border-[var(--ops-success)] bg-[var(--ops-success-soft)] text-[var(--ops-success)]"
            : "border-[var(--ops-success)]/35 bg-[var(--ops-success-soft)] text-[var(--ops-success)] hover:border-[var(--ops-success)] hover:bg-[var(--ops-success)] hover:text-white"
        }`}
        disabled={isLoading}
        onClick={() => updateStatus(status === "done" ? "todo" : "done")}
        title={status === "done" ? "Reopen task" : "Mark task as done"}
        type="button"
        variant="secondary"
      >
        {status === "done" ? (
          <ArrowCounterClockwiseIcon
            aria-hidden="true"
            size={16}
            weight="bold"
          />
        ) : (
          <CheckIcon aria-hidden="true" size={16} weight="bold" />
        )}
        <span className="sr-only">
          {isLoading
            ? "Updating task"
            : status === "done"
              ? "Reopen task"
              : "Mark task as done"}
        </span>
        <span aria-hidden="true">
          {isLoading ? "Saving" : status === "done" ? "Reopen" : "Done"}
        </span>
      </Button>
      {error ? (
        <p className="max-w-48 text-xs leading-5 text-[var(--ops-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
