"use client";

import {
  BriefcaseIcon,
  CalendarBlankIcon,
  ClockIcon,
  MapPinIcon,
  PencilSimpleLineIcon,
  UserCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { EditAppointmentDialog } from "@/components/calendar/EditAppointmentDialog";
import { AppointmentStatusBadge } from "@/components/calendar/AppointmentStatusBadge";
import { EditJobDialog } from "@/components/jobs/EditJobDialog";
import { JobStatusBadge } from "@/components/jobs/JobStatusBadge";
import { Button } from "@/components/ui/Button";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { AppointmentListItem } from "./CalendarList";
import type { JobListItem } from "../jobs/JobsList";

type CalendarEventDetailsDialogProps = {
  canAssignJobs: boolean;
  canEditRecords: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  timezone: string;
};

function formatDateTime(
  value: string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
    ...options,
  }).format(new Date(value));
}

function getTimeRangeLabel(event: CalendarEvent, timezone: string) {
  const start = formatDateTime(event.starts_at, timezone, { timeStyle: "short" });

  if (!event.ends_at) {
    return start;
  }

  return `${start} - ${formatDateTime(event.ends_at, timezone, { timeStyle: "short" })}`;
}

export function CalendarEventDetailsDialog({
  canAssignJobs,
  canEditRecords,
  event,
  onClose,
  timezone,
}: CalendarEventDetailsDialogProps) {
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentListItem | null>(null);
  const [editingJob, setEditingJob] = useState<JobListItem | null>(null);

  const appointmentRecord = useMemo<AppointmentListItem | null>(() => {
    if (!event?.appointment) {
      return null;
    }

    return {
      client: event.appointment.client,
      client_id: event.appointment.client_id,
      created_at: event.appointment.created_at,
      ends_at: event.appointment.ends_at,
      id: event.appointment.id,
      job_id: event.appointment.job_id,
      location: event.appointment.location,
      notes: event.appointment.notes,
      starts_at: event.appointment.starts_at,
      status: event.appointment.status,
      title: event.appointment.title,
    };
  }, [event]);

  const jobRecord = useMemo<JobListItem | null>(() => {
    if (!event?.job) {
      return null;
    }

    return {
      assigned_member: event.job.assigned_member,
      assigned_member_id: event.job.assigned_member_id,
      client: event.job.client,
      client_id: event.job.client_id,
      created_at: event.job.created_at,
      estimated_value: event.job.estimated_value,
      id: event.job.id,
      location: event.job.location,
      payment_status: event.job.payment_status,
      scheduled_end: event.job.scheduled_end,
      scheduled_start: event.job.scheduled_start,
      service_type: event.job.service_type,
      status: event.job.status,
      title: event.job.title,
    };
  }, [event]);

  if (!event) {
    return null;
  }

  return (
    <>
      <div
        aria-labelledby="calendar-event-details-title"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:items-center"
        role="dialog"
      >
        <div className="w-full max-w-lg rounded-2xl border border-[var(--ops-border)] bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
                {event.type === "appointment" ? (
                  <CalendarBlankIcon aria-hidden="true" size={14} weight="duotone" />
                ) : (
                  <BriefcaseIcon aria-hidden="true" size={14} weight="duotone" />
                )}
                {event.type === "appointment" ? "Appointment" : "Scheduled job"}
              </div>
              <h2
                className="mt-2 text-xl font-semibold text-[var(--ops-text)]"
                id="calendar-event-details-title"
              >
                {event.title}
              </h2>
              <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                Opens the real source record already stored in this workspace.
              </p>
            </div>
            <button
              aria-label="Close event details"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
              onClick={onClose}
              type="button"
            >
              <XIcon aria-hidden="true" size={18} weight="regular" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="flex items-center gap-2">
              {event.type === "appointment" ? (
                <AppointmentStatusBadge status={event.status as AppointmentListItem["status"]} />
              ) : (
                <JobStatusBadge status={event.status as JobListItem["status"]} />
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--ops-card-soft)] px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <CalendarBlankIcon aria-hidden="true" size={14} weight="duotone" />
                  Date
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--ops-text)]">
                  {formatDateTime(event.starts_at, timezone, {
                    dateStyle: "full",
                    timeStyle: undefined,
                  })}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--ops-card-soft)] px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <ClockIcon aria-hidden="true" size={14} weight="duotone" />
                  Time
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--ops-text)]">
                  {getTimeRangeLabel(event, timezone)}
                </p>
              </div>
              <div className="rounded-xl bg-[var(--ops-card-soft)] px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <UserCircleIcon aria-hidden="true" size={14} weight="duotone" />
                  Customer
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--ops-text)]">
                  {event.client_name ?? "No client linked"}
                </p>
                {event.client_email ? (
                  <p className="mt-1 text-xs text-[var(--ops-text-soft)]">
                    {event.client_email}
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl bg-[var(--ops-card-soft)] px-3 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  <MapPinIcon aria-hidden="true" size={14} weight="duotone" />
                  Location
                </div>
                <p className="mt-2 text-sm font-medium text-[var(--ops-text)]">
                  {event.location ?? "Not set"}
                </p>
              </div>
            </div>

            {event.assigned_member_name ? (
              <div className="rounded-xl border border-[var(--ops-border)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Assigned person
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--ops-text)]">
                  {event.assigned_member_name}
                </p>
              </div>
            ) : null}

            {event.appointment?.notes ? (
              <div className="rounded-xl border border-[var(--ops-border)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  Notes
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
                  {event.appointment.notes}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-[var(--ops-border)] px-5 py-4 sm:flex-row sm:justify-end">
            <Button onClick={onClose} type="button" variant="secondary">
              Close
            </Button>
            {canEditRecords && appointmentRecord ? (
              <Button
                onClick={() => setEditingAppointment(appointmentRecord)}
                type="button"
              >
                <PencilSimpleLineIcon aria-hidden="true" size={16} weight="regular" />
                <span className="ml-2">Edit appointment</span>
              </Button>
            ) : null}
            {canEditRecords && jobRecord ? (
              <Button onClick={() => setEditingJob(jobRecord)} type="button">
                <PencilSimpleLineIcon aria-hidden="true" size={16} weight="regular" />
                <span className="ml-2">Open job</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {editingAppointment ? (
        <EditAppointmentDialog
          appointment={editingAppointment}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAppointment(null);
              onClose();
            }
          }}
          open
        />
      ) : null}

      {editingJob ? (
        <EditJobDialog
          canAssignRecords={canAssignJobs}
          hideTrigger
          job={editingJob}
          onOpenChange={(open) => {
            if (!open) {
              setEditingJob(null);
              onClose();
            }
          }}
          open
        />
      ) : null}
    </>
  );
}
