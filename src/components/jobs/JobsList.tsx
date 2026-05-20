"use client";

import { useRouter } from "next/navigation";
import type { ApiResponse } from "@/types/api";
import { useEffect, useState } from "react";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DateTimeCell, DateTimeHeader } from "@/components/ui/DateTimeCell";
import { notify } from "@/lib/ui/toast";
import { EditJobDialog } from "./EditJobDialog";
import { JobStatusBadge, type JobStatus } from "./JobStatusBadge";
import { JobsEmptyState } from "./JobsEmptyState";
import {
  PaymentStatusBadge,
  type PaymentStatus,
} from "./PaymentStatusBadge";

export type JobListItem = {
  client: {
    email: string | null;
    name: string;
  } | null;
  client_id: string | null;
  created_at: string;
  estimated_value: number;
  id: string;
  location: string | null;
  payment_status: PaymentStatus;
  scheduled_end: string | null;
  scheduled_start: string | null;
  service_type: string | null;
  status: JobStatus;
  title: string;
};

type JobsListProps = {
  canCreateRecords: boolean;
  canDeleteRecords: boolean;
  jobs: JobListItem[];
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function JobsList({
  canCreateRecords,
  canDeleteRecords,
  jobs,
}: JobsListProps) {
  const router = useRouter();
  const [editingJob, setEditingJob] = useState<JobListItem | null>(null);
  const [visibleJobs, setVisibleJobs] = useState(jobs);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [bulkDeleteSuccess, setBulkDeleteSuccess] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    setVisibleJobs(jobs);
  }, [jobs]);

  if (visibleJobs.length === 0) {
    return <JobsEmptyState canCreateRecords={canCreateRecords} />;
  }

  const allSelected =
    visibleJobs.length > 0 &&
    visibleJobs.every((job) => selectedIds.includes(job.id));

  function openJobEditor(job: JobListItem) {
    if (!canCreateRecords) {
      return;
    }

    setEditingJob(job);
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(visibleJobs.map((job) => job.id));
  }

  function toggleJobSelection(jobId: string) {
    setSelectedIds((current) =>
      current.includes(jobId)
        ? current.filter((selectedId) => selectedId !== jobId)
        : [...current, jobId],
    );
  }

  function clearSelection() {
    setSelectedIds([]);
    setBulkDeleteError(null);
  }

  async function deleteSelectedJobs() {
    setBulkDeleteError(null);
    setBulkDeleteSuccess(null);
    setIsBulkDeleting(true);

    try {
      const response = await fetch("/api/jobs/bulk", {
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
        const errorMessage =
          result.ok
            ? "We could not delete the selected jobs."
            : result.error.message;
        setBulkDeleteError(errorMessage);
        notify.error("Job delete failed", errorMessage);
        return;
      }

      const deletedIds = new Set(result.data.deleted.map((job) => job.id));
      setVisibleJobs((current) =>
        current.filter((job) => !deletedIds.has(job.id)),
      );
      setBulkDeleteSuccess(
        result.data.deletedCount === 1
          ? "Job deleted successfully."
          : `${result.data.deletedCount} jobs deleted successfully.`,
      );
      notify.success(
        result.data.deletedCount === 1 ? "Job deleted" : "Jobs deleted",
        result.data.deletedCount === 1
          ? "The selected job was removed."
          : "The selected jobs were removed.",
      );
      clearSelection();
      setBulkDeleteOpen(false);
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "We could not delete the selected jobs.";
      setBulkDeleteError(errorMessage);
      notify.error("Job delete failed", errorMessage);
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <BulkActionBar
          canDelete={canDeleteRecords}
          canEdit={false}
          entityLabel="job"
          onClearSelection={clearSelection}
          onDelete={() => setBulkDeleteOpen(true)}
          selectedCount={selectedIds.length}
        />
        {bulkDeleteError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--ops-danger)]">
            {bulkDeleteError}
          </p>
        ) : null}
        {bulkDeleteSuccess ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {bulkDeleteSuccess}
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-x-auto xl:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--ops-card-soft)] text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
            <tr>
              <th className="px-5 py-3 sm:px-6" scope="col">
                <input
                  aria-label="Select all jobs"
                  checked={allSelected}
                  className="h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                  onChange={toggleSelectAll}
                  type="checkbox"
                />
              </th>
              <th className="px-5 py-3 sm:px-6" scope="col">
                Job
              </th>
              <th className="px-5 py-3" scope="col">
                Status
              </th>
              <th className="px-5 py-3" scope="col">
                <DateTimeHeader label="Schedule" />
              </th>
              <th className="px-5 py-3" scope="col">
                Location
              </th>
              <th className="px-5 py-3" scope="col">
                Est. value
              </th>
              <th className="px-5 py-3" scope="col">
                Payment
              </th>
              <th className="px-5 py-3" scope="col">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ops-border)] bg-white">
            {visibleJobs.map((job) => (
              <tr
                className={canCreateRecords ? "cursor-pointer transition hover:bg-[var(--ops-card-soft)]" : ""}
                key={job.id}
                onDoubleClick={() => openJobEditor(job)}
                title={canCreateRecords ? "Double-click to edit job" : undefined}
              >
                <td className="px-5 py-4 sm:px-6">
                  <input
                    aria-label={`Select ${job.title}`}
                    checked={selectedIds.includes(job.id)}
                    className="mt-1 h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                    onChange={() => toggleJobSelection(job.id)}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                </td>
                <td className="px-5 py-4 sm:px-6">
                  <p className="font-medium text-[var(--ops-text)]">
                    {job.title}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                    {job.service_type ?? "Service type not set"}
                    {job.client ? ` · ${job.client.name}` : ""}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <JobStatusBadge status={job.status} />
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  <DateTimeCell value={job.scheduled_start} />
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  {job.location ?? "Not set"}
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  {formatCurrency(job.estimated_value)}
                </td>
                <td className="px-5 py-4">
                  <PaymentStatusBadge status={job.payment_status} />
                </td>
                <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                  {formatCreatedDate(job.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[var(--ops-border)] xl:hidden">
        {visibleJobs.map((job) => (
          <article
            className={canCreateRecords ? "cursor-pointer p-5 transition hover:bg-[var(--ops-card-soft)]" : "p-5"}
            key={job.id}
            onDoubleClick={() => openJobEditor(job)}
            title={canCreateRecords ? "Double-click to edit job" : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold text-[var(--ops-text)]">
                  {job.title}
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  {job.service_type ?? "Service type not set"}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <JobStatusBadge status={job.status} />
                <input
                  aria-label={`Select ${job.title}`}
                  checked={selectedIds.includes(job.id)}
                  className="mt-1 h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                  onChange={() => toggleJobSelection(job.id)}
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  type="checkbox"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Schedule
                </p>
                <p className="mt-1 text-[var(--ops-text-soft)]">
                  <DateTimeCell value={job.scheduled_start} />
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Est. value
                </p>
                <p className="mt-1 text-[var(--ops-text-soft)]">
                  {formatCurrency(job.estimated_value)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Payment
                </p>
                <div className="mt-1">
                  <PaymentStatusBadge status={job.payment_status} />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  Location
                </p>
                <p className="mt-1 text-[var(--ops-text-soft)]">
                  {job.location ?? "Not set"}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
      {editingJob ? (
        <EditJobDialog
          hideTrigger
          job={editingJob}
          onOpenChange={(open) => {
            if (!open) {
              setEditingJob(null);
            }
          }}
          open
        />
      ) : null}
      <ConfirmDeleteDialog
        confirmLabel={selectedIds.length === 1 ? "Delete job" : "Delete jobs"}
        description="This will permanently remove the selected job records from this workspace. Use this only for accidental or unwanted job records."
        isSubmitting={isBulkDeleting}
        itemCount={selectedIds.length}
        onCancel={() => {
          if (!isBulkDeleting) {
            setBulkDeleteOpen(false);
          }
        }}
        onConfirm={deleteSelectedJobs}
        open={bulkDeleteOpen}
        title="Delete selected jobs?"
      />
    </>
  );
}
