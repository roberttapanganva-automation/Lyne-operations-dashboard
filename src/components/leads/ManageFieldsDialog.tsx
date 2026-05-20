"use client";

import { SlidersHorizontalIcon, XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export type FieldOption = {
  id: string;
  label: string;
  locked?: boolean;
};

type ManageFieldsDialogProps = {
  fields: FieldOption[];
  onChange: (fieldIds: string[]) => void;
  title: string;
  triggerId?: string;
  value: string[];
};

export function ManageFieldsDialog({
  fields,
  onChange,
  title,
  triggerId,
  value,
}: ManageFieldsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  function openDialog() {
    setDraft(value);
    setIsOpen(true);
  }

  function toggleField(fieldId: string) {
    const field = fields.find((item) => item.id === fieldId);

    if (field?.locked) {
      return;
    }

    setDraft((current) => {
      if (current.includes(fieldId)) {
        const next = current.filter((item) => item !== fieldId);
        return next.length > 0 ? next : current;
      }

      return [...current, fieldId];
    });
  }

  function applyFields() {
    onChange(draft);
    setIsOpen(false);
  }

  return (
    <>
      <button
        id={triggerId}
        className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3.5 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
        onClick={openDialog}
        type="button"
      >
        <SlidersHorizontalIcon aria-hidden="true" className="mr-2" size={16} />
        Manage fields
      </button>

      {isOpen ? (
        <div
          aria-labelledby={`${title}-fields-title`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
              <div>
                <h2
                  className="text-lg font-semibold text-[var(--ops-text)]"
                  id={`${title}-fields-title`}
                >
                  Manage {title} Fields
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Choose the desktop columns shown in this browser.
                </p>
              </div>
              <button
                aria-label="Close manage fields"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <XIcon aria-hidden="true" size={20} />
              </button>
            </div>

            <div className="space-y-2 p-5">
              {fields.map((field) => (
                <label
                  className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ops-border)] px-3 py-2 text-sm font-medium text-[var(--ops-text)]"
                  key={field.id}
                >
                  <span>{field.label}</span>
                  <input
                    checked={draft.includes(field.id)}
                    className="h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                    disabled={field.locked}
                    onChange={() => toggleField(field.id)}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 border-t border-[var(--ops-border)] p-5">
              <Button onClick={() => setIsOpen(false)} type="button" variant="secondary">
                Cancel
              </Button>
              <Button onClick={applyFields} type="button">
                Apply fields
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
