"use client";

import { TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useId, useState } from "react";

type ConfirmDeleteDialogProps = {
  confirmLabel?: string;
  description?: string;
  isSubmitting?: boolean;
  itemCount?: number;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  requiredText?: string;
  title: string;
};

const defaultDeleteDescription =
  "This will permanently remove this lead and its related activity from your workspace.";

export function ConfirmDeleteDialog({
  confirmLabel = "Delete",
  description,
  isSubmitting = false,
  itemCount,
  onCancel,
  onConfirm,
  open,
  requiredText = "Delete",
  title,
}: ConfirmDeleteDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const inputId = useId();
  const canConfirm = confirmationText === requiredText && !isSubmitting;
  const finalDescription =
    description ??
    (typeof itemCount === "number" && itemCount > 1
      ? `${defaultDeleteDescription} You are about to delete ${itemCount} records.`
      : defaultDeleteDescription);

  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby={`${inputId}-title`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:items-center"
      role="dialog"
    >
      <form
        className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();

          if (canConfirm) {
            setConfirmationText("");
            onConfirm();
          }
        }}
      >
        <div className="border-b border-[var(--ops-border)] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-danger-soft)] text-[var(--ops-danger)]">
              <WarningCircleIcon aria-hidden="true" size={22} weight="duotone" />
            </span>
            <div>
              <h2
                className="text-base font-semibold text-[var(--ops-text)]"
                id={`${inputId}-title`}
              >
                {title}
              </h2>
              <p className="mt-1 text-sm leading-6 text-[var(--ops-text-soft)]">
                {finalDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label
            className="block text-sm font-semibold text-[var(--ops-text)]"
            htmlFor={inputId}
          >
            Type &quot;{requiredText}&quot; to confirm.
          </label>
          <input
            autoComplete="off"
            className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-danger)] focus:ring-2 focus:ring-red-100"
            disabled={isSubmitting}
            id={inputId}
            onChange={(event) => setConfirmationText(event.target.value)}
            value={confirmationText}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-5 py-4">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white px-4 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:text-[var(--ops-text)] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => {
              setConfirmationText("");
              onCancel();
            }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--ops-danger)] px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canConfirm}
            type="submit"
          >
            <TrashIcon aria-hidden="true" size={16} weight="bold" />
            {isSubmitting ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
