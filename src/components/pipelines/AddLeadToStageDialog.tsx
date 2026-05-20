"use client";

import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import { Input } from "@/components/ui/Input";

type AddLeadToStageDialogProps = {
  buttonClassName?: string;
  buttonLabel?: string;
  canCreate: boolean;
  iconOnly?: boolean;
  stageId: string;
  stageName: string;
};

type CreatedLead = {
  id: string;
};

type ExistingLead = {
  clients: {
    email: string | null;
    name: string | null;
  } | null;
  estimated_value: number;
  id: string;
  stage_id: string | null;
  status: "open" | "won" | "lost";
  title: string;
};

const initialFormState = {
  clientEmail: "",
  clientName: "",
  clientPhone: "",
  estimatedValue: "",
  nextFollowUpTime: "",
  notes: "",
  priority: "normal",
  title: "",
};

function getErrorMessage(response: ApiResponse<CreatedLead>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

function formatLocalDate(value: Date | undefined) {
  if (!value) {
    return "";
  }

  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function AddLeadToStageDialog({
  buttonClassName,
  buttonLabel = "Add opportunity",
  canCreate,
  iconOnly = false,
  stageId,
  stageName,
}: AddLeadToStageDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [existingLeads, setExistingLeads] = useState<ExistingLead[]>([]);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [existingLeadSearch, setExistingLeadSearch] = useState("");
  const [selectedExistingLeadId, setSelectedExistingLeadId] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date | undefined>();
  const [form, setForm] = useState(initialFormState);

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsOpen(false);
  }

  function resetForm() {
    setForm(initialFormState);
    setNextFollowUpDate(undefined);
    setExistingLeadSearch("");
    setSelectedExistingLeadId("");
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isActive = true;

    async function loadExistingLeads() {
      setIsLoadingExisting(true);

      try {
        const response = await fetch("/api/leads", {
          method: "GET",
        });
        const result = (await response.json()) as ApiResponse<ExistingLead[]>;

        if (!response.ok || !result.ok) {
          if (isActive) {
            setError(
              result.ok
                ? "We could not load current leads."
                : result.error.message,
            );
          }
          return;
        }

        if (isActive) {
          const availableLeads = (result.data ?? []).filter(
            (lead) => lead.stage_id !== stageId && lead.status !== "won" && lead.status !== "lost",
          );
          setExistingLeads(availableLeads);
          setMode(availableLeads.length > 0 ? "existing" : "new");
        }
      } catch (caughtError) {
        if (isActive) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "We could not load current leads.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoadingExisting(false);
        }
      }
    }

    void loadExistingLeads();

    return () => {
      isActive = false;
    };
  }, [isOpen, stageId]);

  async function handleAddExistingLead() {
    if (!selectedExistingLeadId) {
      setError("Choose a lead from the active workspace first.");
      notify.warning(
        "Choose a lead first",
        "Select an active lead before adding it to this stage.",
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pipelines/cards/move", {
        body: JSON.stringify({
          entity_type: "lead",
          record_id: selectedExistingLeadId,
          target_stage_id: stageId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<CreatedLead>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const nextError =
          message ?? "We could not add the selected lead to this stage.";
        setError(nextError);
        notify.error("Pipeline update failed", nextError);
        return;
      }

      resetForm();
      setIsOpen(false);
      notify.success(
        "Pipeline updated",
        "The lead was moved to the selected stage.",
      );
      router.refresh();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not add the selected lead to this stage.";
      setError(nextError);
      notify.error("Pipeline update failed", nextError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const nextFollowUpDateValue = formatLocalDate(nextFollowUpDate);
    const nextFollowUp =
      nextFollowUpDateValue && form.nextFollowUpTime
        ? new Date(`${nextFollowUpDateValue}T${form.nextFollowUpTime}`).toISOString()
        : undefined;

    try {
      const response = await fetch("/api/leads", {
        body: JSON.stringify({
          client_email: form.clientEmail,
          client_name: form.clientName,
          client_phone: form.clientPhone,
          estimated_value: form.estimatedValue ? Number(form.estimatedValue) : undefined,
          next_follow_up_at: nextFollowUp,
          notes: form.notes,
          priority: form.priority,
          source: "pipeline",
          stage_id: stageId,
          status: "open",
          title: form.title,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<CreatedLead>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const nextError =
          message ?? "We could not create the lead. Please try again.";
        setError(nextError);
        notify.error("Lead could not be added", nextError);
        return;
      }

      resetForm();
      setIsOpen(false);
      notify.success("Lead added", "The lead was added to your CRM.");
      router.refresh();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not create the lead. Please try again.";
      setError(nextError);
      notify.error("Lead could not be added", nextError);
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredExistingLeads = existingLeads.filter((lead) => {
    const haystack = `${lead.title} ${lead.clients?.name ?? ""} ${lead.clients?.email ?? ""}`.toLowerCase();
    return haystack.includes(existingLeadSearch.trim().toLowerCase());
  });

  if (!canCreate) {
    return null;
  }

  return (
    <>
      <button
        aria-label={`Add lead to ${stageName}`}
        className={
          buttonClassName ??
          `inline-flex ${iconOnly ? "h-8 w-8 px-0" : "h-10 px-4"} shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--ops-border)] bg-white text-[var(--workspace-primary,var(--ops-primary-dark))] shadow-sm transition hover:bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]`
        }
        onClick={() => setIsOpen(true)}
        title={`Add lead to ${stageName}`}
        type="button"
      >
        <PlusIcon aria-hidden="true" size={17} weight="bold" />
        {iconOnly ? null : <span className="text-sm font-semibold">{buttonLabel}</span>}
      </button>

      {isOpen ? (
        <div
          aria-labelledby={`add-lead-to-stage-${stageId}`}
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4">
              <div>
                <h2
                  className="text-lg font-semibold text-[var(--ops-text)]"
                  id={`add-lead-to-stage-${stageId}`}
                >
                  Add lead card
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Create a real lead in {stageName}.
                </p>
              </div>
              <button
                aria-label="Close add lead card dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-primary,var(--ops-primary))]"
                disabled={isSubmitting}
                onClick={closeDialog}
                type="button"
              >
                <XIcon aria-hidden="true" size={20} weight="regular" />
              </button>
            </div>

            <form className="space-y-5 p-5" onSubmit={handleSubmit}>
              {error ? (
                <div
                  className="rounded-lg border border-[var(--ops-danger-soft)] bg-[var(--ops-danger-soft)] p-3 text-sm leading-6 text-[var(--ops-danger)]"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-1">
                <button
                  className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
                    mode === "existing"
                      ? "bg-white text-[var(--workspace-primary,var(--ops-primary-dark))] shadow-sm"
                      : "text-[var(--ops-text-soft)]"
                  }`}
                  onClick={() => setMode("existing")}
                  type="button"
                >
                  Existing lead
                </button>
                <button
                  className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
                    mode === "new"
                      ? "bg-white text-[var(--workspace-primary,var(--ops-primary-dark))] shadow-sm"
                      : "text-[var(--ops-text-soft)]"
                  }`}
                  onClick={() => setMode("new")}
                  type="button"
                >
                  New lead
                </button>
              </div>

              {mode === "existing" ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--ops-text)]">
                      Add a current workspace lead
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                      Choose from active leads already in the workspace to avoid creating the wrong client.
                    </p>
                  </div>
                  <Input
                    className="sm:w-full"
                    disabled={isSubmitting || isLoadingExisting}
                    id={`existing-stage-lead-search-${stageId}`}
                    label="Search current leads"
                    onChange={(event) => setExistingLeadSearch(event.target.value)}
                    placeholder="Search by opportunity, client, or email"
                    type="search"
                    value={existingLeadSearch}
                  />
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-2">
                    {isLoadingExisting ? (
                      <p className="px-2 py-3 text-sm text-[var(--ops-text-soft)]">
                        Loading current leads...
                      </p>
                    ) : filteredExistingLeads.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-[var(--ops-text-soft)]">
                        No active leads are available to add to this stage.
                      </p>
                    ) : (
                      filteredExistingLeads.map((lead) => {
                        const isSelected = selectedExistingLeadId === lead.id;

                        return (
                          <button
                            className={`flex w-full items-start justify-between rounded-lg border px-3 py-3 text-left transition ${
                              isSelected
                                ? "border-[var(--workspace-primary,var(--ops-primary))] bg-white shadow-sm"
                                : "border-transparent bg-white/70 hover:border-[var(--ops-border)]"
                            }`}
                            key={lead.id}
                            onClick={() => setSelectedExistingLeadId(lead.id)}
                            type="button"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
                                {lead.title}
                              </p>
                              <p className="mt-1 truncate text-xs text-[var(--ops-text-soft)]">
                                {lead.clients?.name ?? "No client name"}
                                {lead.clients?.email ? ` - ${lead.clients.email}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[var(--ops-card-soft)] px-2 py-1 text-xs font-semibold text-[var(--ops-text-muted)]">
                              {lead.status}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="flex justify-end border-t border-[var(--ops-border)] pt-4">
                    <Button
                      disabled={isSubmitting || isLoadingExisting || !selectedExistingLeadId}
                      onClick={handleAddExistingLead}
                      type="button"
                    >
                      {isSubmitting ? "Adding..." : "Add selected lead"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      className="text-sm font-medium text-[var(--ops-text)]"
                      htmlFor={`stage-lead-title-${stageId}`}
                    >
                      Lead title <span className="text-[var(--ops-danger)]">*</span>
                    </label>
                    <input
                      className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                      disabled={isSubmitting}
                      id={`stage-lead-title-${stageId}`}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, title: event.target.value }))
                      }
                      placeholder="New service inquiry"
                      required
                      type="text"
                      value={form.title}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`stage-lead-client-${stageId}`}
                  >
                    Contact name
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id={`stage-lead-client-${stageId}`}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clientName: event.target.value,
                      }))
                    }
                    placeholder="Client name"
                    type="text"
                    value={form.clientName}
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`stage-lead-email-${stageId}`}
                  >
                    Email
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id={`stage-lead-email-${stageId}`}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clientEmail: event.target.value,
                      }))
                    }
                    placeholder="client@example.com"
                    type="email"
                    value={form.clientEmail}
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`stage-lead-phone-${stageId}`}
                  >
                    Phone
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id={`stage-lead-phone-${stageId}`}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        clientPhone: event.target.value,
                      }))
                    }
                    placeholder="Phone number"
                    type="tel"
                    value={form.clientPhone}
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`stage-lead-estimate-${stageId}`}
                  >
                    Estimated value
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id={`stage-lead-estimate-${stageId}`}
                    min="0"
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        estimatedValue: event.target.value,
                      }))
                    }
                    placeholder="0"
                    step="0.01"
                    type="number"
                    value={form.estimatedValue}
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`stage-lead-priority-${stageId}`}
                  >
                    Priority
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id={`stage-lead-priority-${stageId}`}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                    value={form.priority}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor={`stage-lead-time-${stageId}`}
                  >
                    Follow-up time
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id={`stage-lead-time-${stageId}`}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nextFollowUpTime: event.target.value,
                      }))
                    }
                    step="900"
                    type="time"
                    value={form.nextFollowUpTime}
                  />
                </div>

                <div className="sm:col-span-2">
                  <DatePicker
                    aria-label="Next follow-up date"
                    clearable
                    disabled={isSubmitting}
                    label="Next follow-up date"
                    onChange={setNextFollowUpDate}
                    value={nextFollowUpDate}
                  />
                </div>
                  </div>

                  <div>
                    <label
                      className="text-sm font-medium text-[var(--ops-text)]"
                      htmlFor={`stage-lead-notes-${stageId}`}
                    >
                      Notes
                    </label>
                    <textarea
                      className="mt-2 min-h-24 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                      disabled={isSubmitting}
                      id={`stage-lead-notes-${stageId}`}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      placeholder="Add qualification notes or next steps."
                      value={form.notes}
                    />
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
                      {isSubmitting ? "Creating..." : "Create lead card"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
