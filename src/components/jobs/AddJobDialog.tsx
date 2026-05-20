"use client";

import { BriefcaseIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  DateTimeRangePicker,
  getDateTimeRangeError,
  type DateTimeRangeValue,
} from "@/components/ui/DateTimeRangePicker";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";

type AddJobDialogProps = {
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

type CreatedJob = {
  id: string;
};

function getErrorMessage(response: ApiResponse<CreatedJob>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

export function AddJobDialog({
  className = "",
  variant = "primary",
}: AddJobDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<DateTimeRangeValue>({
    end: null,
    start: null,
  });

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setScheduleError(null);
    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setScheduleError(null);

    const nextScheduleError = getDateTimeRangeError(schedule, {});

    if (nextScheduleError) {
      setScheduleError(nextScheduleError);
      notify.warning("Check the job schedule", nextScheduleError);
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const estimatedValue = String(formData.get("estimated_value") ?? "");

    const payload = {
      client_email: String(formData.get("client_email") ?? ""),
      client_name: String(formData.get("client_name") ?? ""),
      client_phone: String(formData.get("client_phone") ?? ""),
      estimated_value: estimatedValue ? Number(estimatedValue) : undefined,
      location: String(formData.get("location") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      payment_status: String(formData.get("payment_status") ?? "unpaid"),
      scheduled_end: schedule.end ?? undefined,
      scheduled_start: schedule.start ?? undefined,
      service_type: String(formData.get("service_type") ?? ""),
      status: String(formData.get("status") ?? "scheduled"),
      title: String(formData.get("title") ?? ""),
    };

    try {
      const response = await fetch("/api/jobs", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<CreatedJob>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const errorMessage =
          message ?? "We could not create the job. Please try again.";
        setError(errorMessage);
        notify.error("Job could not be added", errorMessage);
        return;
      }

      formRef.current?.reset();
      setSchedule({ end: null, start: null });
      setIsOpen(false);
      notify.success("Job added", "The job was added to the board.");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not create the job. Please try again.";
      setError(errorMessage);
      notify.error("Job could not be added", errorMessage);
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
        Add Job
      </Button>

      {isOpen ? (
        <div
          aria-labelledby="add-job-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4 sm:px-6">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
                  <BriefcaseIcon aria-hidden="true" size={22} weight="duotone" />
                </div>
                <div>
                  <h2
                    className="text-lg font-semibold text-[var(--ops-text)]"
                    id="add-job-title"
                  >
                    Add Job
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                    Create scheduled work for the active workspace.
                  </p>
                </div>
              </div>
              <button
                aria-label="Close add job dialog"
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
                  htmlFor="job-title"
                >
                  Job title <span className="text-[var(--ops-danger)]">*</span>
                </label>
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                  disabled={isSubmitting}
                  id="job-title"
                  name="title"
                  placeholder="Service appointment"
                  required
                  type="text"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="job-client-name"
                  >
                    Client name
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="job-client-name"
                    name="client_name"
                    placeholder="Client name"
                    type="text"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="job-client-email"
                  >
                    Email
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="job-client-email"
                    name="client_email"
                    placeholder="client@example.com"
                    type="email"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="job-client-phone"
                  >
                    Phone
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="job-client-phone"
                    name="client_phone"
                    placeholder="Phone number"
                    type="tel"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="job-service-type"
                  >
                    Service type
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="job-service-type"
                    name="service_type"
                    placeholder="Service type"
                    type="text"
                  />
                </div>

                <div className="sm:col-span-2">
                  <DateTimeRangePicker
                    disabled={isSubmitting}
                    error={scheduleError}
                    label="Job schedule"
                    onChange={setSchedule}
                    value={schedule}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="job-location"
                  >
                    Location
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="job-location"
                    name="location"
                    placeholder="Service address or remote"
                    type="text"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="job-estimated-value"
                  >
                    Estimated value
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="job-estimated-value"
                    min="0"
                    name="estimated_value"
                    placeholder="0"
                    step="0.01"
                    type="number"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="job-payment-status"
                  >
                    Payment status
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    defaultValue="unpaid"
                    disabled={isSubmitting}
                    id="job-payment-status"
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
                    htmlFor="job-status"
                  >
                    Job status
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    defaultValue="scheduled"
                    disabled={isSubmitting}
                    id="job-status"
                    name="status"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  className="text-sm font-medium text-[var(--ops-text)]"
                  htmlFor="job-notes"
                >
                  Notes
                </label>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                  disabled={isSubmitting}
                  id="job-notes"
                  name="notes"
                  placeholder="Add service details, access notes, or next steps."
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
                  {isSubmitting ? "Creating..." : "Create job"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
