"use client";

import { CalendarCheckIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { AppointmentListItem } from "./CalendarList";

type EditAppointmentDialogProps = {
  appointment: AppointmentListItem;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

type UpdatedAppointment = {
  id: string;
};

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

function getErrorMessage(response: ApiResponse<UpdatedAppointment>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

export function EditAppointmentDialog({
  appointment,
  onOpenChange,
  open,
}: EditAppointmentDialogProps) {
  const router = useRouter();
  const initialStart = splitDateTime(appointment.starts_at);
  const initialEnd = splitDateTime(appointment.ends_at);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(
    initialStart.date,
  );
  const [startTime, setStartTime] = useState(initialStart.time);
  const [endTime, setEndTime] = useState(initialEnd.time);

  if (!open) {
    return null;
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const dateValue = formatLocalDate(appointmentDate);
    const startsAt =
      dateValue && startTime
        ? new Date(`${dateValue}T${startTime}`).toISOString()
        : "";
    const endsAt =
      dateValue && endTime ? new Date(`${dateValue}T${endTime}`).toISOString() : "";

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        body: JSON.stringify({
          ends_at: endsAt,
          location: String(formData.get("location") ?? ""),
          notes: String(formData.get("notes") ?? ""),
          starts_at: startsAt,
          status: String(formData.get("status") ?? appointment.status),
          title: String(formData.get("title") ?? ""),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<UpdatedAppointment>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const nextError =
          message ?? "We could not update the appointment. Please try again.";
        setError(nextError);
        notify.error("Appointment could not be updated", nextError);
        return;
      }

      onOpenChange(false);
      notify.success("Changes saved");
      router.refresh();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update the appointment. Please try again.";
      setError(nextError);
      notify.error("Appointment could not be updated", nextError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      aria-labelledby={`edit-appointment-${appointment.id}`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
      role="dialog"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
              <CalendarCheckIcon aria-hidden="true" size={20} weight="duotone" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold text-[var(--ops-text)]"
                id={`edit-appointment-${appointment.id}`}
              >
                Edit Appointment
              </h2>
              <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                Update schedule, status, and appointment notes.
              </p>
            </div>
          </div>
          <button
            aria-label="Close edit appointment dialog"
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
              htmlFor={`edit-appointment-title-${appointment.id}`}
            >
              Appointment title <span className="text-[var(--ops-danger)]">*</span>
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
              defaultValue={appointment.title}
              disabled={isSubmitting}
              id={`edit-appointment-title-${appointment.id}`}
              name="title"
              required
              type="text"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-appointment-status-${appointment.id}`}
              >
                Status
              </label>
              <select
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={appointment.status}
                disabled={isSubmitting}
                id={`edit-appointment-status-${appointment.id}`}
                name="status"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No show</option>
              </select>
            </div>
            <div>
              <DatePicker
                aria-label="Appointment date"
                disabled={isSubmitting}
                label="Appointment date"
                onChange={setAppointmentDate}
                value={appointmentDate}
              />
            </div>
            <div>
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-appointment-start-${appointment.id}`}
              >
                Start time
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                disabled={isSubmitting}
                id={`edit-appointment-start-${appointment.id}`}
                onChange={(event) => setStartTime(event.target.value)}
                required
                step="900"
                type="time"
                value={startTime}
              />
            </div>
            <div>
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-appointment-end-${appointment.id}`}
              >
                End time
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                disabled={isSubmitting}
                id={`edit-appointment-end-${appointment.id}`}
                onChange={(event) => setEndTime(event.target.value)}
                step="900"
                type="time"
                value={endTime}
              />
            </div>
            <div className="sm:col-span-2">
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-appointment-location-${appointment.id}`}
              >
                Location
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={appointment.location ?? ""}
                disabled={isSubmitting}
                id={`edit-appointment-location-${appointment.id}`}
                name="location"
                type="text"
              />
            </div>
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor={`edit-appointment-notes-${appointment.id}`}
            >
              Notes
            </label>
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
              defaultValue={appointment.notes ?? ""}
              disabled={isSubmitting}
              id={`edit-appointment-notes-${appointment.id}`}
              name="notes"
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
              {isSubmitting ? "Saving..." : "Save appointment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
