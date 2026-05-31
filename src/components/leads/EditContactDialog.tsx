"use client";

import { AddressBookIcon, XIcon } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { Client, ClientListItem } from "@/types/domain";

type EditContactDialogProps = {
  client: ClientListItem | null;
  onClose: () => void;
  onContactUpdated?: (client: ClientListItem) => void;
  open: boolean;
};

function getErrorMessage(response: ApiResponse<Client>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

export function EditContactDialog({
  client,
  onClose,
  onContactUpdated,
  open,
}: EditContactDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !client) {
    return null;
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!client) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      address: String(formData.get("address") ?? ""),
      company_name: String(formData.get("company_name") ?? ""),
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      source: String(formData.get("source") ?? ""),
    };

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<Client>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const errorMessage =
          message ?? "We could not update the contact. Please try again.";
        setError(errorMessage);
        notify.error("Contact could not be updated", errorMessage);
        return;
      }
      if (!result.ok) {
        const errorMessage = "We could not update the contact. Please try again.";
        setError(errorMessage);
        notify.error("Contact could not be updated", errorMessage);
        return;
      }

      onContactUpdated?.({
        ...client,
        ...result.data,
      });
      onClose();
      notify.success("Contact updated", "The contact details were saved.");
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update the contact. Please try again.";
      setError(errorMessage);
      notify.error("Contact could not be updated", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      aria-labelledby={`edit-contact-${client.id}`}
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
      role="dialog"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]">
              <AddressBookIcon aria-hidden="true" size={20} weight="duotone" />
            </div>
            <div>
              <h2
                className="text-lg font-semibold text-[var(--ops-text)]"
                id={`edit-contact-${client.id}`}
              >
                Edit Contact
              </h2>
              <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                Update contact details linked to CRM records.
              </p>
            </div>
          </div>
          <button
            aria-label="Close edit contact dialog"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
            disabled={isSubmitting}
            onClick={closeDialog}
            type="button"
          >
            <XIcon aria-hidden="true" size={20} weight="regular" />
          </button>
        </div>

        <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit}>
          {error ? (
            <div
              className="rounded-lg border border-[var(--ops-danger-soft)] bg-[var(--ops-danger-soft)] p-3 text-sm leading-6 text-[var(--ops-danger)]"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-contact-name-${client.id}`}
              >
                Name <span className="text-[var(--ops-danger)]">*</span>
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={client.name}
                disabled={isSubmitting}
                id={`edit-contact-name-${client.id}`}
                name="name"
                required
                type="text"
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-contact-email-${client.id}`}
              >
                Email
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={client.email ?? ""}
                disabled={isSubmitting}
                id={`edit-contact-email-${client.id}`}
                name="email"
                placeholder="client@example.com"
                type="email"
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-contact-phone-${client.id}`}
              >
                Phone
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={client.phone ?? ""}
                disabled={isSubmitting}
                id={`edit-contact-phone-${client.id}`}
                name="phone"
                placeholder="Phone number"
                type="tel"
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-contact-company-${client.id}`}
              >
                Company
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={client.company_name ?? ""}
                disabled={isSubmitting}
                id={`edit-contact-company-${client.id}`}
                name="company_name"
                placeholder="Company name"
                type="text"
              />
            </div>

            <div>
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-contact-source-${client.id}`}
              >
                Source
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={client.source ?? ""}
                disabled={isSubmitting}
                id={`edit-contact-source-${client.id}`}
                name="source"
                placeholder="manual"
                type="text"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-contact-address-${client.id}`}
              >
                Address
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={client.address ?? ""}
                disabled={isSubmitting}
                id={`edit-contact-address-${client.id}`}
                name="address"
                placeholder="Street, city, or service address"
                type="text"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor={`edit-contact-notes-${client.id}`}
              >
                Notes
              </label>
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                defaultValue={client.notes ?? ""}
                disabled={isSubmitting}
                id={`edit-contact-notes-${client.id}`}
                name="notes"
                placeholder="Important client notes, preferences, or context."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--ops-border)] pt-5">
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white px-4 text-sm font-semibold text-[var(--ops-text-soft)] shadow-sm transition hover:text-[var(--ops-text)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={closeDialog}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--workspace-primary,var(--ops-primary))] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_var(--workspace-primary-glow,var(--ops-primary-glow))] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Saving..." : "Save contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
