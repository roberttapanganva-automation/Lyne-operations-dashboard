"use client";

import { AddressBookIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { Client } from "@/types/domain";

type AddContactDialogProps = {
  className?: string;
};

function getErrorMessage(response: ApiResponse<Client>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

export function AddContactDialog({ className = "" }: AddContactDialogProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const response = await fetch("/api/clients", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<Client>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const errorMessage =
          message ?? "We could not create the contact. Please try again.";
        setError(errorMessage);
        notify.error("Contact could not be added", errorMessage);
        return;
      }

      formRef.current?.reset();
      setIsOpen(false);
      notify.success("Contact added", "The contact was saved to your workspace.");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not create the contact. Please try again.";
      setError(errorMessage);
      notify.error("Contact could not be added", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button className={`gap-2 ${className}`} onClick={() => setIsOpen(true)} type="button">
        <PlusIcon aria-hidden="true" size={18} weight="regular" />
        Add Contact
      </Button>

      {isOpen ? (
        <div
          aria-labelledby="add-contact-title"
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
                    id="add-contact-title"
                  >
                    Add Contact
                  </h2>
                  <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                    Save a real contact so future leads can link to it directly.
                  </p>
                </div>
              </div>
              <button
                aria-label="Close add contact dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
                disabled={isSubmitting}
                onClick={closeDialog}
                type="button"
              >
                <XIcon aria-hidden="true" size={20} weight="regular" />
              </button>
            </div>

            <form className="space-y-5 p-5 sm:p-6" onSubmit={handleSubmit} ref={formRef}>
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
                  <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="contact-name">
                    Name <span className="text-[var(--ops-danger)]">*</span>
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id="contact-name"
                    name="name"
                    placeholder="Primary contact name"
                    required
                    type="text"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="contact-email">
                    Email
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id="contact-email"
                    name="email"
                    placeholder="client@example.com"
                    type="email"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="contact-phone">
                    Phone
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id="contact-phone"
                    name="phone"
                    placeholder="Phone number"
                    type="tel"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="contact-company-name">
                    Company
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id="contact-company-name"
                    name="company_name"
                    placeholder="Company name"
                    type="text"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="contact-source">
                    Source
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    defaultValue="manual"
                    disabled={isSubmitting}
                    id="contact-source"
                    name="source"
                    placeholder="manual"
                    type="text"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="contact-address">
                    Address
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id="contact-address"
                    name="address"
                    placeholder="Street, city, or service address"
                    type="text"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor="contact-notes">
                    Notes
                  </label>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id="contact-notes"
                    name="notes"
                    placeholder="Helpful context about the contact or company."
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[var(--ops-border)] pt-5 sm:flex-row sm:justify-end">
                <Button disabled={isSubmitting} onClick={closeDialog} type="button" variant="secondary">
                  Cancel
                </Button>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Saving..." : "Save contact"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
