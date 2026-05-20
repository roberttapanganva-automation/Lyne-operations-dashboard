"use client";

import { XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, type ReactNode, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { PipelineBoardCard } from "@/types/domain";

type EditPipelineLeadDialogProps = {
  lead: PipelineBoardCard;
  onOpenChange?: (isOpen: boolean) => void;
  trigger?: ReactNode;
};

type UpdatedLead = {
  id: string;
};

function splitDateTime(value: string | null) {
  if (!value) {
    return { date: undefined, time: "" };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { date: undefined, time: "" };
  }

  return {
    date,
    time: `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`,
  };
}

function formatLocalDate(value: Date | undefined) {
  if (!value) {
    return "";
  }

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function getErrorMessage(response: ApiResponse<UpdatedLead>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

export function EditPipelineLeadDialog({
  lead,
  onOpenChange,
  trigger,
}: EditPipelineLeadDialogProps) {
  const router = useRouter();
  const initialFollowUp = splitDateTime(lead.next_follow_up_at);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    initialFollowUp.date,
  );
  const [followUpTime, setFollowUpTime] = useState(initialFollowUp.time);

  function setDialogOpen(nextOpen: boolean) {
    setIsOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setDialogOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const followUpDateValue = formatLocalDate(followUpDate);
    const nextFollowUp =
      followUpDateValue && followUpTime
        ? new Date(`${followUpDateValue}T${followUpTime}`).toISOString()
        : undefined;

    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        body: JSON.stringify({
          estimated_value: Number(formData.get("estimated_value") ?? 0),
          next_follow_up_at: nextFollowUp,
          priority: String(formData.get("priority") ?? lead.priority ?? "normal"),
          source: String(formData.get("source") ?? lead.source ?? ""),
          status: String(formData.get("status") ?? lead.status),
          title: String(formData.get("title") ?? lead.title),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<UpdatedLead>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const nextError =
          message ?? "We could not update the lead. Please try again.";
        setError(nextError);
        notify.error("Lead could not be updated", nextError);
        return;
      }

      notify.success("Lead updated", "The lead details were saved.");
      setDialogOpen(false);
      router.refresh();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update the lead. Please try again.";
      setError(nextError);
      notify.error("Lead could not be updated", nextError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {trigger ? (
        <div
          className="contents"
          onDoubleClick={() => setDialogOpen(true)}
        >
          {trigger}
        </div>
      ) : null}

      {isOpen ? (
        <div
          aria-labelledby={`edit-pipeline-lead-${lead.id}`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-6 py-5">
              <div>
                <h2
                  className="text-xl font-semibold text-[var(--ops-text)]"
                  id={`edit-pipeline-lead-${lead.id}`}
                >
                  Edit &quot;{lead.title}&quot;
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Review the current opportunity details and update the fields that drive the pipeline.
                </p>
              </div>
              <button
                aria-label="Close edit lead dialog"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
                disabled={isSubmitting}
                onClick={closeDialog}
                type="button"
              >
                <XIcon aria-hidden="true" size={20} weight="regular" />
              </button>
            </div>

            <form className="space-y-6 p-6" onSubmit={handleSubmit}>
              {error ? (
                <div
                  className="rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <aside className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-3">
                  <nav className="space-y-1 text-sm">
                    <div className="rounded-lg bg-white px-3 py-2 font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))] shadow-sm">
                      Opportunity Details
                    </div>
                    <div className="px-3 py-2 text-[var(--ops-text-soft)]">
                      Contact Details
                    </div>
                    <div className="px-3 py-2 text-[var(--ops-text-soft)]">
                      Follow-up
                    </div>
                  </nav>
                </aside>

                <div className="space-y-6">
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-[var(--ops-text)]">
                        Contact details
                      </h3>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium text-[var(--ops-text)]">
                          Primary contact
                        </p>
                        <div className="mt-2 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 py-2 text-sm text-[var(--ops-text)]">
                          {lead.client?.name ?? "Not set"}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--ops-text)]">
                          Primary email
                        </p>
                        <div className="mt-2 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 py-2 text-sm text-[var(--ops-text)]">
                          {lead.client?.email ?? "Not set"}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-[var(--ops-border)] pt-5">
                    <h3 className="text-lg font-semibold text-[var(--ops-text)]">
                      Opportunity details
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label
                          className="text-sm font-medium text-[var(--ops-text)]"
                          htmlFor={`edit-pipeline-lead-title-${lead.id}`}
                        >
                          Opportunity name <span className="text-[var(--ops-danger)]">*</span>
                        </label>
                        <input
                          className="mt-2 h-11 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                          defaultValue={lead.title}
                          disabled={isSubmitting}
                          id={`edit-pipeline-lead-title-${lead.id}`}
                          name="title"
                          required
                          type="text"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor={`edit-pipeline-lead-status-${lead.id}`}>
                          Status
                        </label>
                        <select
                          className="mt-2 h-11 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                          defaultValue={lead.status}
                          disabled={isSubmitting}
                          id={`edit-pipeline-lead-status-${lead.id}`}
                          name="status"
                        >
                          <option value="open">Open</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor={`edit-pipeline-lead-value-${lead.id}`}>
                          Value
                        </label>
                        <input
                          className="mt-2 h-11 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                          defaultValue={lead.estimated_value ?? 0}
                          disabled={isSubmitting}
                          id={`edit-pipeline-lead-value-${lead.id}`}
                          min="0"
                          name="estimated_value"
                          step="0.01"
                          type="number"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor={`edit-pipeline-lead-priority-${lead.id}`}>
                          Priority
                        </label>
                        <select
                          className="mt-2 h-11 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                          defaultValue={lead.priority ?? "normal"}
                          disabled={isSubmitting}
                          id={`edit-pipeline-lead-priority-${lead.id}`}
                          name="priority"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor={`edit-pipeline-lead-source-${lead.id}`}>
                          Source
                        </label>
                        <input
                          className="mt-2 h-11 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                          defaultValue={lead.source ?? ""}
                          disabled={isSubmitting}
                          id={`edit-pipeline-lead-source-${lead.id}`}
                          name="source"
                          type="text"
                        />
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4 border-t border-[var(--ops-border)] pt-5">
                    <h3 className="text-lg font-semibold text-[var(--ops-text)]">
                      Follow-up
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <DatePicker
                        aria-label="Lead follow-up date"
                        clearable
                        disabled={isSubmitting}
                        label="Follow-up date"
                        onChange={setFollowUpDate}
                        value={followUpDate}
                      />
                      <div>
                        <label
                          className="text-sm font-medium text-[var(--ops-text)]"
                          htmlFor={`edit-pipeline-lead-time-${lead.id}`}
                        >
                          Follow-up time
                        </label>
                        <input
                          className="mt-2 h-11 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                          disabled={isSubmitting}
                          id={`edit-pipeline-lead-time-${lead.id}`}
                          onChange={(event) => setFollowUpTime(event.target.value)}
                          step="900"
                          type="time"
                          value={followUpTime}
                        />
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[var(--ops-border)] pt-5 sm:flex-row sm:justify-end">
                <Button
                  disabled={isSubmitting}
                  onClick={closeDialog}
                  type="button"
                  variant="secondary"
                >
                  Cancel
                </Button>
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Saving..." : "Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
