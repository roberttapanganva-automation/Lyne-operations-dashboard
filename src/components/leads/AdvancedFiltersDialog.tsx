"use client";

import { FadersHorizontalIcon, XIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { LeadPipelineStageOption } from "@/lib/pipelines/queries";
import type { LeadPriority } from "./LeadPriorityBadge";
import type { LeadStatus } from "./LeadStatusBadge";

export type LeadAdvancedFilters = {
  createdFrom: string;
  createdTo: string;
  estimatedMax: string;
  estimatedMin: string;
  nextFollowUpFrom: string;
  nextFollowUpTo: string;
  pipelineStage: string;
  priority: LeadPriority | "all";
  source: string;
  status: LeadStatus | "all";
};

export type ContactAdvancedFilters = {
  createdFrom: string;
  createdTo: string;
  customerType: "all" | "saved" | "customer" | "repeat" | "lead_linked";
  hasCompany: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  source: string;
};

type LeadsAdvancedFiltersDialogProps = {
  activeCount: number;
  filters: LeadAdvancedFilters;
  onApply: (filters: LeadAdvancedFilters) => void;
  onReset: () => void;
  stageOptions: LeadPipelineStageOption[];
};

type ContactsAdvancedFiltersDialogProps = {
  activeCount: number;
  filters: ContactAdvancedFilters;
  onApply: (filters: ContactAdvancedFilters) => void;
  onReset: () => void;
};

function Shell({
  activeCount,
  children,
  onOpen,
  title,
}: {
  activeCount: number;
  children: (close: () => void) => ReactNode;
  onOpen?: () => void;
  title: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  function openDialog() {
    onOpen?.();
    setIsOpen(true);
  }

  return (
    <>
      <button
        className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3.5 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
        onClick={openDialog}
        type="button"
      >
        <FadersHorizontalIcon aria-hidden="true" className="mr-2" size={16} />
        Advanced filters
        {activeCount > 0 ? (
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--workspace-primary,var(--ops-primary))] px-1.5 text-xs text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          aria-labelledby={`${title}-filters-title`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
              <div>
                <h2
                  className="text-lg font-semibold text-[var(--ops-text)]"
                  id={`${title}-filters-title`}
                >
                  {title} Advanced Filters
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Narrow the table using real field values.
                </p>
              </div>
              <button
                aria-label="Close filters"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <XIcon aria-hidden="true" size={20} />
              </button>
            </div>
            {children(() => setIsOpen(false))}
          </div>
        </div>
      ) : null}
    </>
  );
}

const inputClass =
  "mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]";

export function LeadsAdvancedFiltersDialog({
  activeCount,
  filters,
  onApply,
  onReset,
  stageOptions,
}: LeadsAdvancedFiltersDialogProps) {
  const [draft, setDraft] = useState(filters);

  return (
    <Shell
      activeCount={activeCount}
      onOpen={() => setDraft(filters)}
      title="Leads"
    >
      {(close) => (
        <>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Status
              <select
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as LeadAdvancedFilters["status"],
                  }))
                }
                value={draft.status}
              >
                <option value="all">Any status</option>
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Priority
              <select
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priority: event.target.value as LeadAdvancedFilters["priority"],
                  }))
                }
                value={draft.priority}
              >
                <option value="all">Any priority</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Source
              <input
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, source: event.target.value }))
                }
                placeholder="manual, website, referral"
                value={draft.source}
              />
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Pipeline stage
              <select
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    pipelineStage: event.target.value,
                  }))
                }
                value={draft.pipelineStage}
              >
                <option value="all">Any stage</option>
                <option value="__none__">No stage</option>
                {stageOptions.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Estimated value min
              <input
                className={inputClass}
                min="0"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    estimatedMin: event.target.value,
                  }))
                }
                type="number"
                value={draft.estimatedMin}
              />
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Estimated value max
              <input
                className={inputClass}
                min="0"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    estimatedMax: event.target.value,
                  }))
                }
                type="number"
                value={draft.estimatedMax}
              />
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Follow-up from
              <input
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    nextFollowUpFrom: event.target.value,
                  }))
                }
                type="date"
                value={draft.nextFollowUpFrom}
              />
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Follow-up to
              <input
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    nextFollowUpTo: event.target.value,
                  }))
                }
                type="date"
                value={draft.nextFollowUpTo}
              />
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Created from
              <input
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    createdFrom: event.target.value,
                  }))
                }
                type="date"
                value={draft.createdFrom}
              />
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Created to
              <input
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    createdTo: event.target.value,
                  }))
                }
                type="date"
                value={draft.createdTo}
              />
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--ops-border)] p-5">
            <Button
              onClick={() => {
                onReset();
                close();
              }}
              type="button"
              variant="secondary"
            >
              Reset filters
            </Button>
            <Button
              onClick={() => {
                onApply(draft);
                close();
              }}
              type="button"
            >
              Apply filters
            </Button>
          </div>
        </>
      )}
    </Shell>
  );
}

export function ContactsAdvancedFiltersDialog({
  activeCount,
  filters,
  onApply,
  onReset,
}: ContactsAdvancedFiltersDialogProps) {
  const [draft, setDraft] = useState(filters);

  return (
    <Shell
      activeCount={activeCount}
      onOpen={() => setDraft(filters)}
      title="Contacts"
    >
      {(close) => (
        <>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Customer type
              <select
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    customerType: event.target.value as ContactAdvancedFilters["customerType"],
                  }))
                }
                value={draft.customerType}
              >
                <option value="all">Any type</option>
                <option value="saved">Saved contact</option>
                <option value="customer">Customer</option>
                <option value="repeat">Repeat customer</option>
                <option value="lead_linked">Lead-linked</option>
              </select>
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Source
              <input
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, source: event.target.value }))
                }
                placeholder="manual, appointment, csv"
                value={draft.source}
              />
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Created from
              <input
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    createdFrom: event.target.value,
                  }))
                }
                type="date"
                value={draft.createdFrom}
              />
            </label>
            <label className="text-sm font-medium text-[var(--ops-text)]">
              Created to
              <input
                className={inputClass}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    createdTo: event.target.value,
                  }))
                }
                type="date"
                value={draft.createdTo}
              />
            </label>
            {[
              ["hasEmail", "Has email"],
              ["hasPhone", "Has phone"],
              ["hasCompany", "Has business name"],
            ].map(([key, label]) => (
              <label
                className="flex items-center justify-between rounded-lg border border-[var(--ops-border)] px-3 py-2 text-sm font-medium text-[var(--ops-text)]"
                key={key}
              >
                {label}
                <input
                  checked={Boolean(draft[key as keyof ContactAdvancedFilters])}
                  className="h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 border-t border-[var(--ops-border)] p-5">
            <Button
              onClick={() => {
                onReset();
                close();
              }}
              type="button"
              variant="secondary"
            >
              Reset filters
            </Button>
            <Button
              onClick={() => {
                onApply(draft);
                close();
              }}
              type="button"
            >
              Apply filters
            </Button>
          </div>
        </>
      )}
    </Shell>
  );
}
