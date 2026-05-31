"use client";

import { PencilSimpleLineIcon, XIcon } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AssignmentMemberField } from "@/components/assignments/AssignmentMemberField";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { JobListItem } from "./JobsList";

type EditJobDialogProps = {
  canAssignRecords?: boolean;
  hideTrigger?: boolean;
  job: JobListItem;
  onOpenChange?: (open: boolean) => void;
  onJobUpdated?: (job: JobListItem) => void;
  open?: boolean;
};

type UpdatedJob = Pick<
  JobListItem,
  | "assigned_member"
  | "assigned_member_id"
  | "estimated_value"
  | "id"
  | "location"
  | "payment_status"
  | "service_type"
  | "status"
  | "title"
>;

export function EditJobDialog({
  canAssignRecords = false,
  hideTrigger = false,
  job,
  onOpenChange,
  onJobUpdated,
  open,
}: EditJobDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        body: JSON.stringify({
          assigned_member_id: canAssignRecords
            ? String(formData.get("assigned_member_id") ?? "") || null
            : undefined,
          estimated_value: Number(formData.get("estimated_value") ?? 0),
          location: String(formData.get("location") ?? ""),
          payment_status: String(
            formData.get("payment_status") ?? job.payment_status,
          ),
          service_type: String(formData.get("service_type") ?? ""),
          status: String(formData.get("status") ?? job.status),
          title: String(formData.get("title") ?? ""),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<UpdatedJob>;

      if (!response.ok || !result.ok) {
        const errorMessage =
          result.ok
            ? "We could not update the job. Please try again."
            : result.error.message;
        setError(errorMessage);
        notify.error("Job could not be updated", errorMessage);
        return;
      }

      const updatedJob = result.data;

      setDialogOpen(false);
      onJobUpdated?.({
        ...job,
        assigned_member:
          updatedJob.assigned_member === undefined
            ? job.assigned_member
            : updatedJob.assigned_member,
        assigned_member_id:
          updatedJob.assigned_member_id === undefined
            ? job.assigned_member_id
            : updatedJob.assigned_member_id,
        estimated_value:
          typeof updatedJob.estimated_value === "number"
            ? updatedJob.estimated_value
            : Number(updatedJob.estimated_value),
        location: updatedJob.location ?? null,
        payment_status: updatedJob.payment_status,
        service_type: updatedJob.service_type ?? null,
        status: updatedJob.status,
        title: updatedJob.title,
      });
      notify.success("Job updated", "The job details were saved.");
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update the job. Please try again.";
      setError(errorMessage);
      notify.error("Job could not be updated", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <button
          aria-label={`Edit job ${job.title}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white text-[var(--workspace-primary,var(--ops-primary-dark))] shadow-sm transition hover:bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
          onClick={() => setDialogOpen(true)}
          title="Edit job"
          type="button"
        >
          <PencilSimpleLineIcon aria-hidden="true" size={18} weight="regular" />
        </button>
      )}

      {isOpen ? (
        <div
          aria-labelledby={`edit-job-${job.id}`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
              <div>
                <h2
                  className="text-lg font-semibold text-[var(--ops-text)]"
                  id={`edit-job-${job.id}`}
                >
                  Edit Job
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Update scheduled work details.
                </p>
              </div>
              <button
                aria-label="Close edit job dialog"
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
                  htmlFor={`edit-job-title-${job.id}`}
                >
                  Job title <span className="text-[var(--ops-danger)]">*</span>
                </label>
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                  defaultValue={job.title}
                  disabled={isSubmitting}
                  id={`edit-job-title-${job.id}`}
                  name="title"
                  required
                  type="text"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-job-status-${job.id}`}
                  >
                    Status
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue={job.status}
                    disabled={isSubmitting}
                    id={`edit-job-status-${job.id}`}
                    name="status"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <AssignmentMemberField
                  assignedMember={job.assigned_member}
                  canAssign={canAssignRecords}
                  defaultValue={job.assigned_member_id}
                  disabled={isSubmitting}
                  id={`edit-job-assigned-member-${job.id}`}
                />
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-job-payment-${job.id}`}
                  >
                    Payment
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue={job.payment_status}
                    disabled={isSubmitting}
                    id={`edit-job-payment-${job.id}`}
                    name="payment_status"
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                    <option value="not_applicable">Not applicable</option>
                  </select>
                </div>
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-job-service-${job.id}`}
                  >
                    Service type
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue={job.service_type ?? ""}
                    disabled={isSubmitting}
                    id={`edit-job-service-${job.id}`}
                    name="service_type"
                    type="text"
                  />
                </div>
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-job-value-${job.id}`}
                  >
                    Estimated value
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue={job.estimated_value}
                    disabled={isSubmitting}
                    id={`edit-job-value-${job.id}`}
                    min="0"
                    name="estimated_value"
                    step="0.01"
                    type="number"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`edit-job-location-${job.id}`}
                  >
                    Location
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue={job.location ?? ""}
                    disabled={isSubmitting}
                    id={`edit-job-location-${job.id}`}
                    name="location"
                    type="text"
                  />
                </div>
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
                  {isSubmitting ? "Saving..." : "Save job"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
