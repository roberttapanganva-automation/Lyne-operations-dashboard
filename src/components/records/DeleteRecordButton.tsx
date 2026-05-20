"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import type { ApiResponse } from "@/types/api";

type DeleteRecordButtonProps = {
  endpoint: string;
  label: string;
};

type DeletedRecord = {
  id: string;
};

function getErrorMessage(response: ApiResponse<DeletedRecord>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

export function DeleteRecordButton({
  endpoint,
  label,
}: DeleteRecordButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteRecord() {
    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse<DeletedRecord>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        setError(message ?? "We could not delete this record. Please try again.");
        return;
      }

      setIsConfirming(false);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "We could not delete this record. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        aria-label={label}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white text-[var(--ops-danger)] shadow-sm transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isDeleting}
        onClick={() => setIsConfirming(true)}
        title={label}
        type="button"
      >
        <TrashIcon aria-hidden="true" size={18} weight="regular" />
      </button>
      <ConfirmDeleteDialog
        confirmLabel="Delete"
        isSubmitting={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setIsConfirming(false);
          }
        }}
        onConfirm={deleteRecord}
        open={isConfirming}
        title={label}
      />
      {error ? (
        <p className="max-w-44 text-right text-xs leading-5 text-[var(--ops-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
