"use client";

import { CalendarPlusIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
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

type AddAppointmentDialogProps = {
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
};

type CreatedAppointment = {
  id: string;
};

function getErrorMessage(response: ApiResponse<CreatedAppointment>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

export function AddAppointmentDialog({
  className = "",
  variant = "primary",
}: AddAppointmentDialogProps) {
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

    const nextScheduleError = getDateTimeRangeError(schedule, {
      requiredStart: true,
    });

    if (nextScheduleError) {
      setScheduleError(nextScheduleError);
      notify.warning("Check the appointment schedule", nextScheduleError);
      return;
    }

    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    const payload = {
      client_email: String(formData.get("client_email") ?? ""),
      client_name: String(formData.get("client_name") ?? ""),
      client_phone: String(formData.get("client_phone") ?? ""),
      ends_at: schedule.end ?? undefined,
      location: String(formData.get("location") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      starts_at: schedule.start ?? "",
      status: String(formData.get("status") ?? "pending"),
      title: String(formData.get("title") ?? ""),
    };

    try {
      const response = await fetch("/api/appointments", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<CreatedAppointment>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const nextError =
          message ?? "We could not create the appointment. Please try again.";
        setError(nextError);
        notify.error("Appointment could not be created", nextError);
        return;
      }

      formRef.current?.reset();
      setSchedule({ end: null, start: null });
      setIsOpen(false);
      notify.success("Created successfully");
      router.refresh();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not create the appointment. Please try again.";
      setError(nextError);
      notify.error("Appointment could not be created", nextError);
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
        Add Appointment
      </Button>

      {isOpen ? (
        <div
          aria-labelledby="add-appointment-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--ops-border)] bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
                  <CalendarPlusIcon
                    aria-hidden="true"
                    size={22}
                    weight="duotone"
                  />
                </div>
                <div>
                  <h2
                    className="text-lg font-semibold text-[var(--ops-text)]"
                    id="add-appointment-title"
                  >
                    Add Appointment
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                    Schedule work or a client commitment for this workspace.
                  </p>
                </div>
              </div>
              <button
                aria-label="Close add appointment dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--ops-danger-soft)] bg-[var(--ops-danger-soft)]/45 text-[var(--ops-danger)] transition hover:bg-[var(--ops-danger-soft)] hover:text-[var(--ops-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-danger)]"
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
                  htmlFor="appointment-title"
                >
                  Appointment title{" "}
                  <span className="text-[var(--ops-danger)]">*</span>
                </label>
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                  disabled={isSubmitting}
                  id="appointment-title"
                  name="title"
                  placeholder="Client visit"
                  required
                  type="text"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="appointment-client-name"
                  >
                    Client name
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="appointment-client-name"
                    name="client_name"
                    placeholder="Client name"
                    type="text"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="appointment-email"
                  >
                    Email
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="appointment-email"
                    name="client_email"
                    placeholder="client@example.com"
                    type="email"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="appointment-phone"
                  >
                    Phone
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="appointment-phone"
                    name="client_phone"
                    placeholder="Phone number"
                    type="tel"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="appointment-status"
                  >
                    Status
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    defaultValue="pending"
                    disabled={isSubmitting}
                    id="appointment-status"
                    name="status"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No show</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <DateTimeRangePicker
                    disabled={isSubmitting}
                    error={scheduleError}
                    label="Appointment date"
                    onChange={setSchedule}
                    requiredStart
                    value={schedule}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="appointment-location"
                  >
                    Location
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="appointment-location"
                    name="location"
                    placeholder="Service address, branch, or remote"
                    type="text"
                  />
                </div>
              </div>

              <div>
                <label
                  className="text-sm font-medium text-[var(--ops-text)]"
                  htmlFor="appointment-notes"
                >
                  Notes
                </label>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                  disabled={isSubmitting}
                  id="appointment-notes"
                  name="notes"
                  placeholder="Add access notes, prep details, or follow-up context."
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
                  {isSubmitting ? "Creating..." : "Create appointment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
