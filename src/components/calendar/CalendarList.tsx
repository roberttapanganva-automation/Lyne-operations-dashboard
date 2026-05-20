"use client";

import { PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DateTimeCell, DateTimeHeader } from "@/components/ui/DateTimeCell";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import {
  AppointmentStatusBadge,
  type AppointmentStatus,
} from "./AppointmentStatusBadge";
import { CalendarEmptyState } from "./CalendarEmptyState";
import { EditAppointmentDialog } from "./EditAppointmentDialog";

export type AppointmentListItem = {
  client: {
    email: string | null;
    name: string;
  } | null;
  client_id: string | null;
  created_at: string;
  ends_at: string | null;
  id: string;
  job_id: string | null;
  location: string | null;
  notes: string | null;
  starts_at: string;
  status: AppointmentStatus;
  title: string;
};

type CalendarListProps = {
  appointments: AppointmentListItem[];
  canCreateRecords: boolean;
  canDeleteRecords: boolean;
};

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatClient(appointment: AppointmentListItem) {
  if (!appointment.client) {
    return "No client linked";
  }

  if (!appointment.client.email) {
    return appointment.client.name;
  }

  return `${appointment.client.name} - ${appointment.client.email}`;
}

export function CalendarList({
  appointments,
  canCreateRecords,
  canDeleteRecords,
}: CalendarListProps) {
  const router = useRouter();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentListItem | null>(null);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  if (appointments.length === 0) {
    return <CalendarEmptyState canCreateRecords={canCreateRecords} />;
  }

  function toggleAppointment(appointmentId: string) {
    setSelectedIds((current) =>
      current.includes(appointmentId)
        ? current.filter((id) => id !== appointmentId)
        : [...current, appointmentId],
    );
  }

  function toggleAllAppointments() {
    setSelectedIds((current) =>
      current.length === appointments.length
        ? []
        : appointments.map((appointment) => appointment.id),
    );
  }

  function toggleSelectionMode() {
    setSelectionMode((current) => {
      if (current) {
        setSelectedIds([]);
      }

      return !current;
    });
  }

  function openAppointmentEditor(appointment: AppointmentListItem) {
    if (!canCreateRecords) {
      return;
    }

    setEditingAppointment(appointment);
  }

  async function deleteSelectedAppointments() {
    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch("/api/appointments", {
        body: JSON.stringify({ ids: selectedIds }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse<{ ids: string[] }>;

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "We could not delete the selected appointments. Please try again."
          : result.error.message;
        setError(message);
        notify.error("Appointments could not be deleted", message);
        return;
      }

      setSelectedIds([]);
      notify.success("Deleted successfully");
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not delete the selected appointments. Please try again.";
      setError(message);
      notify.error("Appointments could not be deleted", message);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-[var(--ops-border)] px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-base font-semibold text-[var(--ops-text)]">
          Appointment list
        </h2>
        {canDeleteRecords ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
              onClick={toggleSelectionMode}
              type="button"
            >
              <PlusCircleIcon aria-hidden="true" size={18} weight="regular" />
              {selectionMode ? "Cancel selection" : "Select"}
            </button>
            {selectionMode ? (
              <>
                <button
                  className="inline-flex h-9 items-center rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
                  onClick={toggleAllAppointments}
                  type="button"
                >
                  {selectedIds.length === appointments.length
                    ? "Clear all"
                    : "Select visible"}
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 text-sm font-semibold text-[var(--ops-danger)] shadow-sm transition hover:border-red-200 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={selectedIds.length === 0 || isDeleting}
                  onClick={deleteSelectedAppointments}
                  type="button"
                >
                  <TrashIcon aria-hidden="true" size={18} weight="regular" />
                  {isDeleting
                    ? "Deleting..."
                    : `Delete selected (${selectedIds.length})`}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--ops-danger)]">{error}</p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--ops-card-soft)] text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
            <tr>
              {canDeleteRecords && selectionMode ? (
                <th
                  aria-label="Select appointments"
                  className="w-12 px-5 py-3 sm:px-6"
                  scope="col"
                />
              ) : null}
              <th className="px-5 py-3 sm:px-6" scope="col">
                Appointment
              </th>
              <th className="px-5 py-3" scope="col">
                Status
              </th>
              <th className="px-5 py-3" scope="col">
                <DateTimeHeader label="Starts" />
              </th>
              <th className="px-5 py-3" scope="col">
                <DateTimeHeader label="Ends" />
              </th>
              <th className="px-5 py-3" scope="col">
                Location
              </th>
              <th className="px-5 py-3" scope="col">
                Client
              </th>
              <th className="px-5 py-3" scope="col">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ops-border)] bg-white">
            {appointments.map((appointment) => (
              <tr
                className={
                  canCreateRecords
                    ? "cursor-pointer transition hover:bg-[var(--ops-card-soft)]"
                    : undefined
                }
                key={appointment.id}
                onDoubleClick={() => openAppointmentEditor(appointment)}
                title={
                  canCreateRecords
                    ? "Double-click to edit this appointment"
                    : undefined
                }
              >
                {canDeleteRecords && selectionMode ? (
                  <td className="px-5 py-4 sm:px-6">
                    <input
                      aria-label={`Select appointment ${appointment.title}`}
                      checked={selectedIdSet.has(appointment.id)}
                      className="h-4 w-4 rounded border-[var(--ops-border)] accent-[var(--ops-primary)]"
                      onChange={() => toggleAppointment(appointment.id)}
                      onDoubleClick={(event) => event.stopPropagation()}
                      type="checkbox"
                    />
                  </td>
                ) : null}
                <td className="px-5 py-4 sm:px-6">
                  <p className="font-medium text-[var(--ops-text)]">
                    {appointment.title}
                  </p>
                  <p className="mt-1 max-w-xs truncate text-xs text-[var(--ops-text-muted)]">
                    {appointment.notes ?? "No notes added"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <AppointmentStatusBadge status={appointment.status} />
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  <DateTimeCell value={appointment.starts_at} />
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  <DateTimeCell emptyLabel="Not set" value={appointment.ends_at} />
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  {appointment.location ?? "Not set"}
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  {formatClient(appointment)}
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  {formatCreatedDate(appointment.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--ops-border)] xl:hidden">
        {appointments.map((appointment) => (
          <article
            className={
              canCreateRecords
                ? "cursor-pointer p-5 transition hover:bg-[var(--ops-card-soft)]"
                : "p-5"
            }
            key={appointment.id}
            onDoubleClick={() => openAppointmentEditor(appointment)}
            title={
              canCreateRecords
                ? "Double-click to edit this appointment"
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-[var(--ops-text)]">
                  {appointment.title}
                </h2>
                <div className="mt-1">
                  <DateTimeCell value={appointment.starts_at} />
                </div>
              </div>
              <AppointmentStatusBadge status={appointment.status} />
            </div>
            {canDeleteRecords && selectionMode ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ops-text-soft)]">
                  <input
                    checked={selectedIdSet.has(appointment.id)}
                    className="h-4 w-4 rounded border-[var(--ops-border)] accent-[var(--ops-primary)]"
                    onChange={() => toggleAppointment(appointment.id)}
                    onDoubleClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                  Select
                </label>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Ends
                </p>
                <div className="mt-1">
                  <DateTimeCell emptyLabel="Not set" value={appointment.ends_at} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Location
                </p>
                <p className="mt-1 text-[var(--ops-text-soft)]">
                  {appointment.location ?? "Not set"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Client
                </p>
                <p className="mt-1 text-[var(--ops-text-soft)]">
                  {formatClient(appointment)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Created
                </p>
                <p className="mt-1 text-[var(--ops-text-soft)]">
                  {formatCreatedDate(appointment.created_at)}
                </p>
              </div>
            </div>

            {appointment.notes ? (
              <p className="mt-4 rounded-lg bg-[var(--ops-card-soft)] p-3 text-sm leading-6 text-[var(--ops-text-soft)]">
                {appointment.notes}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {editingAppointment ? (
        <EditAppointmentDialog
          appointment={editingAppointment}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAppointment(null);
            }
          }}
          open
        />
      ) : null}
    </>
  );
}
