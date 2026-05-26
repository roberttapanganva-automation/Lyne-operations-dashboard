"use client";

import { XIcon, PlusIcon } from "@phosphor-icons/react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { AssignmentMemberField } from "@/components/assignments/AssignmentMemberField";
import { notify } from "@/lib/ui/toast";
import type { LeadPipelineStageOption } from "@/lib/pipelines/queries";
import type { ApiResponse } from "@/types/api";
import type { Client } from "@/types/domain";
import { ContactSelect } from "./ContactSelect";
import type { LeadListItem } from "./LeadsList";

type AddLeadDialogProps = {
  canAssignRecords?: boolean;
  className?: string;
  clients?: Client[];
  onLeadCreated?: (lead: LeadListItem) => void;
  stageOptions?: LeadPipelineStageOption[];
  variant?: "primary" | "secondary" | "ghost";
};

type CreatedLead = Omit<
  LeadListItem,
  "assigned_member" | "assigned_member_id" | "client" | "estimated_value"
> & {
  assigned_member?: LeadListItem["assigned_member"];
  assigned_member_id?: string | null;
  clients: LeadListItem["client"];
  estimated_value: number | string;
};

function getErrorMessage(response: ApiResponse<CreatedLead>) {
  if (response.ok) {
    return null;
  }

  return response.error.message;
}

function normalizeLead(lead: CreatedLead): LeadListItem {
  return {
    assigned_member: lead.assigned_member ?? null,
    assigned_member_id: lead.assigned_member_id ?? null,
    client: lead.clients,
    client_id: lead.client_id,
    created_at: lead.created_at,
    estimated_value:
      typeof lead.estimated_value === "number"
        ? lead.estimated_value
        : Number(lead.estimated_value),
    id: lead.id,
    next_follow_up_at: lead.next_follow_up_at,
    priority: lead.priority,
    source: lead.source,
    stage_id: lead.stage_id,
    status: lead.status,
    title: lead.title,
  };
}

export function AddLeadDialog({
  canAssignRecords = false,
  className = "",
  clients = [],
  onLeadCreated,
  stageOptions = [],
  variant = "primary",
}: AddLeadDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date | undefined>(
    undefined,
  );
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setError(null);
    setNextFollowUpDate(undefined);
    setSelectedClientId("");
    setIsOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const nextFollowUpDateValue = nextFollowUpDate
      ? `${nextFollowUpDate.getFullYear()}-${String(nextFollowUpDate.getMonth() + 1).padStart(2, "0")}-${String(nextFollowUpDate.getDate()).padStart(2, "0")}`
      : "";
    const nextFollowUpTime = String(formData.get("next_follow_up_time") ?? "");
    const estimatedValue = String(formData.get("estimated_value") ?? "");
    const stageId = String(formData.get("stage_id") ?? "");
    const nextFollowUp =
      nextFollowUpDateValue && nextFollowUpTime
        ? `${nextFollowUpDateValue}T${nextFollowUpTime}`
        : "";

    const payload = {
      assigned_member_id: canAssignRecords
        ? String(formData.get("assigned_member_id") ?? "") || null
        : undefined,
      client_id: selectedClientId || undefined,
      client_email: String(formData.get("client_email") ?? ""),
      client_name: String(formData.get("client_name") ?? ""),
      client_phone: String(formData.get("client_phone") ?? ""),
      estimated_value: estimatedValue ? Number(estimatedValue) : undefined,
      next_follow_up_at: nextFollowUp
        ? new Date(nextFollowUp).toISOString()
        : undefined,
      notes: String(formData.get("notes") ?? ""),
      priority: String(formData.get("priority") ?? "normal"),
      source: String(formData.get("source") ?? ""),
      stage_id: stageId || undefined,
      status: "open",
      title: String(formData.get("title") ?? ""),
    };

    try {
      const response = await fetch("/api/leads", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<CreatedLead>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const errorMessage =
          message ?? "We could not create the lead. Please try again.";
        setError(errorMessage);
        notify.error("Lead could not be added", errorMessage);
        return;
      }
      if (!result.ok) {
        const errorMessage = "We could not create the lead. Please try again.";
        setError(errorMessage);
        notify.error("Lead could not be added", errorMessage);
        return;
      }

      formRef.current?.reset();
      setNextFollowUpDate(undefined);
      setSelectedClientId("");
      setIsOpen(false);
      onLeadCreated?.(normalizeLead(result.data));
      notify.success("Lead added", "The lead was added to your CRM.");
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not create the lead. Please try again.";
      setError(errorMessage);
      notify.error("Lead could not be added", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button
        className={`gap-2 ${className}`}
        onClick={() => setIsOpen(true)}
        type="button"
        variant={variant}
      >
        <PlusIcon aria-hidden="true" size={20} weight="regular" />
        Add Lead
      </Button>

      {isOpen ? (
        <div
          aria-labelledby="add-lead-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--ops-border)] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ops-border)] px-5 py-4 sm:px-6">
              <div>
                <h2
                  className="text-lg font-semibold text-[var(--ops-text)]"
                  id="add-lead-title"
                >
                  Add Lead
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Create a lead for the active workspace.
                </p>
              </div>
              <button
                aria-label="Close add lead dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
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

              <div>
                <label
                  className="text-sm font-medium text-[var(--ops-text)]"
                  htmlFor="lead-title"
                >
                  Lead title <span className="text-[var(--ops-danger)]">*</span>
                </label>
                <input
                  className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                  disabled={isSubmitting}
                  id="lead-title"
                  name="title"
                  placeholder="New service inquiry"
                  required
                  type="text"
                />
              </div>

              {stageOptions.length > 0 ? (
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="lead-stage-id"
                  >
                    Pipeline stage
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                    disabled={isSubmitting}
                    id="lead-stage-id"
                    name="stage_id"
                    defaultValue=""
                  >
                    <option value="">No stage selected</option>
                    {stageOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.groupName} - {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {canAssignRecords ? (
                <AssignmentMemberField
                  canAssign={canAssignRecords}
                  disabled={isSubmitting}
                  id="lead-assigned-member"
                />
              ) : null}

              <div className="space-y-5 rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ops-text)]">
                    Contact
                  </p>
                  <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                    Link an existing contact or add quick contact details for a new one.
                  </p>
                </div>

                <ContactSelect
                  clients={clients}
                  disabled={isSubmitting}
                  onSelectedClientIdChange={setSelectedClientId}
                  selectedClientId={selectedClientId}
                />

                {selectedClient ? (
                  <div className="rounded-lg border border-[var(--ops-border)] bg-white p-3 text-sm text-[var(--ops-text-soft)]">
                    <p className="font-medium text-[var(--ops-text)]">
                      {selectedClient.name}
                    </p>
                    <p className="mt-1">
                      {selectedClient.email ?? selectedClient.phone ?? "No email or phone on file"}
                    </p>
                    {selectedClient.company_name ? (
                      <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                        {selectedClient.company_name}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      className="text-sm font-medium text-[var(--ops-text)]"
                      htmlFor="lead-client-name"
                    >
                      Contact name
                    </label>
                    <input
                      className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                      disabled={isSubmitting || Boolean(selectedClient)}
                      id="lead-client-name"
                      name="client_name"
                      placeholder="Client name"
                      type="text"
                    />
                  </div>

                  <div>
                    <label
                      className="text-sm font-medium text-[var(--ops-text)]"
                      htmlFor="lead-client-email"
                    >
                      Email
                    </label>
                    <input
                      className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                      disabled={isSubmitting || Boolean(selectedClient)}
                      id="lead-client-email"
                      name="client_email"
                      placeholder="client@example.com"
                      type="email"
                    />
                  </div>

                  <div>
                    <label
                      className="text-sm font-medium text-[var(--ops-text)]"
                      htmlFor="lead-client-phone"
                    >
                      Phone
                    </label>
                    <input
                      className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                      disabled={isSubmitting || Boolean(selectedClient)}
                      id="lead-client-phone"
                      name="client_phone"
                      placeholder="Phone number"
                      type="tel"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="lead-source"
                  >
                    Source
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="lead-source"
                    name="source"
                    placeholder="manual"
                    type="text"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="lead-estimated-value"
                  >
                    Estimated value
                  </label>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    disabled={isSubmitting}
                    id="lead-estimated-value"
                    min="0"
                    name="estimated_value"
                    placeholder="0"
                    step="0.01"
                    type="number"
                  />
                </div>

                <div>
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="lead-priority"
                  >
                    Priority
                  </label>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                    defaultValue="normal"
                    disabled={isSubmitting}
                    id="lead-priority"
                    name="priority"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    className="text-sm font-medium text-[var(--ops-text)]"
                    htmlFor="lead-next-follow-up-date"
                  >
                    Next follow-up
                  </label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                    <div>
                      <label
                        className="text-[11px] font-semibold uppercase tracking-normal text-[var(--ops-text-muted)]"
                        htmlFor="lead-next-follow-up-date-hidden"
                      >
                        Date
                      </label>
                      <input
                        id="lead-next-follow-up-date-hidden"
                        name="next_follow_up_date"
                        readOnly
                        type="hidden"
                        value={
                          nextFollowUpDate
                            ? `${nextFollowUpDate.getFullYear()}-${String(nextFollowUpDate.getMonth() + 1).padStart(2, "0")}-${String(nextFollowUpDate.getDate()).padStart(2, "0")}`
                            : ""
                        }
                      />
                      <DatePicker
                        aria-label="Next follow-up date"
                        clearable
                        disabled={isSubmitting}
                        onChange={setNextFollowUpDate}
                        showTodayAction
                        value={nextFollowUpDate}
                      />
                    </div>
                    <div>
                      <label
                        className="text-[11px] font-semibold uppercase tracking-normal text-[var(--ops-text-muted)]"
                        htmlFor="lead-next-follow-up-time"
                      >
                        Time
                      </label>
                      <input
                        className="mt-1 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                        disabled={isSubmitting}
                        id="lead-next-follow-up-time"
                        name="next_follow_up_time"
                        step="900"
                        type="time"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label
                  className="text-sm font-medium text-[var(--ops-text)]"
                  htmlFor="lead-notes"
                >
                  Notes
                </label>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                  disabled={isSubmitting}
                  id="lead-notes"
                  name="notes"
                  placeholder="Add qualification notes or next steps."
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
                  {isSubmitting ? "Adding..." : "Add lead"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
