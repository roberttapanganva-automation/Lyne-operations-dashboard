"use client";

import { XIcon } from "@phosphor-icons/react";
import { AutomationStatusBadge } from "@/components/automations/AutomationStatusBadge";
import type { AutomationLog } from "@/types/domain";

type AutomationRunDetailsDialogProps = {
  log: AutomationLog | null;
  onClose: () => void;
  open: boolean;
};

function formatEventName(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRelatedType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPayload(value: AutomationLog["payload"]) {
  if (!value) {
    return "No payload recorded.";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Payload could not be rendered.";
  }
}

export function AutomationRunDetailsDialog({
  log,
  onClose,
  open,
}: AutomationRunDetailsDialogProps) {
  if (!open || !log) {
    return null;
  }

  return (
    <div
      aria-labelledby="automation-run-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:items-center"
      role="dialog"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary))]">
              Automation run
            </p>
            <h2
              className="mt-1 text-lg font-semibold text-[var(--ops-text)]"
              id="automation-run-title"
            >
              {formatEventName(log.automation_type)}
            </h2>
          </div>
          <button
            aria-label="Close automation run details"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
            onClick={onClose}
            type="button"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Status
              </p>
              <div className="mt-2">
                <AutomationStatusBadge status={log.status} />
              </div>
            </div>
            <div className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Created
              </p>
              <p className="mt-2 text-sm text-[var(--ops-text)]">
                {formatDateTime(log.created_at)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Automation type
              </p>
              <p className="mt-2 text-sm text-[var(--ops-text)]">
                {formatEventName(log.automation_type)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Related type
              </p>
              <p className="mt-2 text-sm text-[var(--ops-text)]">
                {formatRelatedType(log.related_type)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Related id
              </p>
              <p className="mt-2 break-all text-sm text-[var(--ops-text)]">
                {log.related_id ?? "Not linked"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
              Message
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--ops-text)]">
              {log.message}
            </p>
          </div>

          {log.error_message ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-danger)]">
                Failure details
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--ops-danger)]">
                {log.error_message}
              </p>
            </div>
          ) : null}

          <details className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[var(--ops-text)]">
              Payload preview
            </summary>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">
              {formatPayload(log.payload)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
