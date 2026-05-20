"use client";

import { PencilSimpleIcon, TrashIcon, XIcon } from "@phosphor-icons/react";

type BulkActionBarProps = {
  canDelete?: boolean;
  canEdit?: boolean;
  entityLabel: string;
  onClearSelection: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  selectedCount: number;
};

export function BulkActionBar({
  canDelete = false,
  canEdit = false,
  entityLabel,
  onClearSelection,
  onDelete,
  onEdit,
  selectedCount,
}: BulkActionBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[var(--workspace-primary,var(--ops-primary))]/25 bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] px-3 py-2 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--ops-text)]">
          {selectedCount} {selectedCount === 1 ? entityLabel : `${entityLabel}s`} selected
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {canEdit && onEdit ? (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:text-[var(--ops-text)]"
              onClick={onEdit}
              type="button"
            >
              <PencilSimpleIcon aria-hidden="true" size={16} weight="regular" />
              Edit
            </button>
          ) : null}
          <button
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
            onClick={onClearSelection}
            type="button"
          >
            <XIcon aria-hidden="true" size={16} weight="bold" />
            Clear
          </button>
          {canDelete && onDelete ? (
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--ops-danger)]/30 bg-[var(--ops-danger-soft)] px-3 text-sm font-semibold text-[var(--ops-danger)] shadow-sm transition hover:border-[var(--ops-danger)]/45 hover:bg-[var(--ops-danger)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-danger)]"
              onClick={onDelete}
              type="button"
            >
              <TrashIcon aria-hidden="true" size={16} weight="regular" />
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
