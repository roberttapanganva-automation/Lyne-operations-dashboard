"use client";

import {
  ArrowsDownUpIcon,
  CaretDownIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AssignmentSelect } from "@/components/assignments/AssignmentSelect";
import { Card } from "@/components/ui/Card";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { DateTimeCell, DateTimeHeader } from "@/components/ui/DateTimeCell";
import { downloadCsv, getDatedCsvFilename } from "@/lib/csv/client";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { LeadPipelineStageOption } from "@/lib/pipelines/queries";
import type {
  AssignableWorkspaceMember,
  Client,
  ClientSummary,
} from "@/types/domain";
import {
  LeadsAdvancedFiltersDialog,
  type LeadAdvancedFilters,
} from "./AdvancedFiltersDialog";
import { AddLeadDialog } from "./AddLeadDialog";
import { CrmActionsMenu } from "./CrmActionsMenu";
import { EditLeadDialog } from "./EditLeadDialog";
import { ImportCsvDialog } from "./ImportCsvDialog";
import { LeadPriorityBadge, type LeadPriority } from "./LeadPriorityBadge";
import { LeadsEmptyState } from "./LeadsEmptyState";
import { LeadStatusBadge, type LeadStatus } from "./LeadStatusBadge";
import { ManageFieldsDialog, type FieldOption } from "./ManageFieldsDialog";

export type LeadListItem = {
  assigned_member: AssignableWorkspaceMember | null;
  assigned_member_id: string | null;
  client: ClientSummary | null;
  client_id: string | null;
  created_at: string;
  estimated_value: number;
  id: string;
  next_follow_up_at: string | null;
  priority: LeadPriority;
  source: string | null;
  stage_id: string | null;
  status: LeadStatus;
  title: string;
};

type LeadView =
  | "all"
  | "assigned_to_me"
  | "follow_up_due"
  | "lost"
  | "open"
  | "unassigned"
  | "won";
type LeadSort =
  | "newest"
  | "oldest"
  | "value_high"
  | "follow_up_soonest";

type LeadsListProps = {
  activeTab: "leads" | "contacts";
  canAssignRecords: boolean;
  canCreateRecords: boolean;
  canDeleteRecords: boolean;
  clients: Client[];
  currentMemberId: string | null;
  leads: LeadListItem[];
  stageOptions: LeadPipelineStageOption[];
};

type BulkDeleteResponse = {
  deletedCount: number;
};

function formatCreatedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

function getInitials(lead: LeadListItem) {
  const sourceName = lead.client?.name?.trim() || lead.title.trim();
  const parts = sourceName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "L";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function getFollowUpTimestamp(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function isFollowUpDue(lead: LeadListItem) {
  if (lead.status !== "open" || !lead.next_follow_up_at) {
    return false;
  }

  return getFollowUpTimestamp(lead.next_follow_up_at) <= Date.now();
}

function getContactSecondaryLine(lead: LeadListItem) {
  if (!lead.client) {
    return "No contact linked";
  }

  return lead.client.email ?? lead.client.phone ?? lead.client.company_name ?? "";
}

const leadAdvancedFilterDefaults: LeadAdvancedFilters = {
  createdFrom: "",
  createdTo: "",
  estimatedMax: "",
  estimatedMin: "",
  nextFollowUpFrom: "",
  nextFollowUpTo: "",
  pipelineStage: "all",
  priority: "all",
  source: "",
  status: "all",
};

const leadFieldOptions: FieldOption[] = [
  { id: "name", label: "Lead name", locked: true },
  { id: "status", label: "Status" },
  { id: "priority", label: "Priority" },
  { id: "estimated_value", label: "Estimated value" },
  { id: "source", label: "Source" },
  { id: "stage", label: "Pipeline stage" },
  { id: "next_follow_up", label: "Next follow-up" },
  { id: "created", label: "Created" },
];

const defaultLeadFields = leadFieldOptions.map((field) => field.id);
const leadImportHeaders = [
  "title",
  "contact_name",
  "email",
  "phone",
  "source",
  "estimated_value",
  "priority",
  "status",
  "notes",
  "next_follow_up_at",
];

function getDateTimestamp(value: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getDayEndTimestamp(value: string) {
  const timestamp = new Date(`${value}T23:59:59`).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function countLeadAdvancedFilters(filters: LeadAdvancedFilters) {
  return [
    filters.status !== "all",
    filters.priority !== "all",
    filters.pipelineStage !== "all",
    Boolean(filters.source.trim()),
    Boolean(filters.estimatedMin),
    Boolean(filters.estimatedMax),
    Boolean(filters.nextFollowUpFrom),
    Boolean(filters.nextFollowUpTo),
    Boolean(filters.createdFrom),
    Boolean(filters.createdTo),
  ].filter(Boolean).length;
}

function getInitialVisibleFields() {
  if (typeof window === "undefined") {
    return defaultLeadFields;
  }

  try {
    const savedFields = window.localStorage.getItem("opspilot:crm:lead-fields");
    if (!savedFields) {
      return defaultLeadFields;
    }

    const parsedFields = JSON.parse(savedFields) as string[];
    const supportedFields = parsedFields.filter((field) =>
      leadFieldOptions.some((option) => option.id === field),
    );

    return supportedFields.includes("name")
      ? [...new Set(["name", ...supportedFields])]
      : defaultLeadFields;
  } catch {
    return defaultLeadFields;
  }
}

export function LeadsList({
  activeTab,
  canAssignRecords,
  canCreateRecords,
  canDeleteRecords,
  clients,
  currentMemberId,
  leads,
  stageOptions,
}: LeadsListProps) {
  const router = useRouter();
  const [localLeads, setLocalLeads] = useState(leads);
  const [activeView, setActiveView] = useState<LeadView>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "all">("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<LeadSort>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<LeadAdvancedFilters>(
    leadAdvancedFilterDefaults,
  );
  const [visibleFields, setVisibleFields] = useState(getInitialVisibleFields);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadListItem | null>(null);

  function updateVisibleFields(nextFields: string[]) {
    const withRequiredName = [...new Set(["name", ...nextFields])];
    setVisibleFields(withRequiredName);

    try {
      window.localStorage.setItem(
        "opspilot:crm:lead-fields",
        JSON.stringify(withRequiredName),
      );
    } catch {
      // Keep in-memory fields even when storage is unavailable.
    }
  }

  const stageMap = useMemo(
    () =>
      new Map(
        stageOptions.map((stage) => [
          stage.id,
          { name: stage.name },
        ]),
      ),
    [stageOptions],
  );

  const viewCounts = useMemo(
    () => ({
      all: localLeads.length,
      assigned_to_me: currentMemberId
        ? localLeads.filter((lead) => lead.assigned_member_id === currentMemberId)
            .length
        : 0,
      follow_up_due: localLeads.filter(isFollowUpDue).length,
      lost: localLeads.filter((lead) => lead.status === "lost").length,
      open: localLeads.filter((lead) => lead.status === "open").length,
      unassigned: localLeads.filter((lead) => !lead.assigned_member_id).length,
      won: localLeads.filter((lead) => lead.status === "won").length,
    }),
    [currentMemberId, localLeads],
  );

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let nextLeads = localLeads.filter((lead) => {
      if (activeView === "open" && lead.status !== "open") {
        return false;
      }

      if (activeView === "won" && lead.status !== "won") {
        return false;
      }

      if (activeView === "lost" && lead.status !== "lost") {
        return false;
      }

      if (activeView === "follow_up_due" && !isFollowUpDue(lead)) {
        return false;
      }

      if (
        activeView === "assigned_to_me" &&
        (!currentMemberId || lead.assigned_member_id !== currentMemberId)
      ) {
        return false;
      }

      if (activeView === "unassigned" && lead.assigned_member_id) {
        return false;
      }

      if (statusFilter !== "all" && lead.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "all" && lead.priority !== priorityFilter) {
        return false;
      }

      if (stageFilter !== "all") {
        if (stageFilter === "__none__") {
          if (lead.stage_id) {
            return false;
          }
        } else if (lead.stage_id !== stageFilter) {
          return false;
        }
      }

      if (advancedFilters.status !== "all" && lead.status !== advancedFilters.status) {
        return false;
      }

      if (
        advancedFilters.priority !== "all" &&
        lead.priority !== advancedFilters.priority
      ) {
        return false;
      }

      if (advancedFilters.pipelineStage !== "all") {
        if (advancedFilters.pipelineStage === "__none__") {
          if (lead.stage_id) {
            return false;
          }
        } else if (lead.stage_id !== advancedFilters.pipelineStage) {
          return false;
        }
      }

      if (
        advancedFilters.source.trim() &&
        !(lead.source ?? "")
          .toLowerCase()
          .includes(advancedFilters.source.trim().toLowerCase())
      ) {
        return false;
      }

      const minimumValue = advancedFilters.estimatedMin
        ? Number(advancedFilters.estimatedMin)
        : null;
      const maximumValue = advancedFilters.estimatedMax
        ? Number(advancedFilters.estimatedMax)
        : null;

      if (minimumValue !== null && lead.estimated_value < minimumValue) {
        return false;
      }

      if (maximumValue !== null && lead.estimated_value > maximumValue) {
        return false;
      }

      const followUpTimestamp = getDateTimestamp(lead.next_follow_up_at);
      const createdTimestamp = getDateTimestamp(lead.created_at);
      const followUpFrom = advancedFilters.nextFollowUpFrom
        ? getDateTimestamp(advancedFilters.nextFollowUpFrom)
        : null;
      const followUpTo = advancedFilters.nextFollowUpTo
        ? getDayEndTimestamp(advancedFilters.nextFollowUpTo)
        : null;
      const createdFrom = advancedFilters.createdFrom
        ? getDateTimestamp(advancedFilters.createdFrom)
        : null;
      const createdTo = advancedFilters.createdTo
        ? getDayEndTimestamp(advancedFilters.createdTo)
        : null;

      if (followUpFrom !== null && (followUpTimestamp ?? 0) < followUpFrom) {
        return false;
      }

      if (followUpTo !== null && (followUpTimestamp ?? Infinity) > followUpTo) {
        return false;
      }

      if (createdFrom !== null && (createdTimestamp ?? 0) < createdFrom) {
        return false;
      }

      if (createdTo !== null && (createdTimestamp ?? Infinity) > createdTo) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        lead.title,
        lead.client?.name,
        lead.client?.email,
        lead.client?.phone,
        lead.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    nextLeads = [...nextLeads];

    if (sortBy === "oldest") {
      nextLeads.sort(
        (left, right) =>
          new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      );
    } else if (sortBy === "value_high") {
      nextLeads.sort((left, right) => right.estimated_value - left.estimated_value);
    } else if (sortBy === "follow_up_soonest") {
      nextLeads.sort(
        (left, right) =>
          getFollowUpTimestamp(left.next_follow_up_at) -
          getFollowUpTimestamp(right.next_follow_up_at),
      );
    } else {
      nextLeads.sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );
    }

    return nextLeads;
  }, [
    activeView,
    advancedFilters,
    currentMemberId,
    localLeads,
    priorityFilter,
    searchQuery,
    sortBy,
    stageFilter,
    statusFilter,
  ]);

  const allFilteredSelected =
    filteredLeads.length > 0 &&
    filteredLeads.every((lead) => selectedIds.includes(lead.id));
  const visibleSelectedIds = selectedIds.filter((selectedId) =>
    filteredLeads.some((lead) => lead.id === selectedId),
  );

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((current) =>
        current.filter(
          (selectedId) => !filteredLeads.some((lead) => lead.id === selectedId),
        ),
      );
      return;
    }

    setSelectedIds((current) => [
      ...new Set([...current, ...filteredLeads.map((lead) => lead.id)]),
    ]);
  }

  function toggleLeadSelection(leadId: string) {
    setSelectedIds((current) =>
      current.includes(leadId)
        ? current.filter((selectedId) => selectedId !== leadId)
        : [...current, leadId],
    );
  }

  function openLeadEditor(lead: LeadListItem) {
    if (!canCreateRecords) {
      return;
    }

    setEditingLead(lead);
  }

  function clearFilters() {
    setActiveView("all");
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setStageFilter("all");
    setAdvancedFilters(leadAdvancedFilterDefaults);
  }

  function clearSelection() {
    setSelectedIds([]);
    setBulkDeleteError(null);
  }

  async function deleteSelectedLeads() {
    setBulkDeleteError(null);
    setIsBulkDeleting(true);

    try {
      const response = await fetch("/api/leads/bulk", {
        body: JSON.stringify({
          action: "delete",
          ids: visibleSelectedIds,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as ApiResponse<BulkDeleteResponse>;

      if (!response.ok || !result.ok) {
        const errorMessage =
          result.ok
            ? "We could not delete the selected leads."
            : result.error.message;
        setBulkDeleteError(errorMessage);
        notify.error("Lead delete failed", errorMessage);
        return;
      }

      notify.success(
        result.data.deletedCount === 1 ? "Lead deleted" : "Leads deleted",
        result.data.deletedCount === 1
          ? "The selected lead was removed."
          : "The selected leads were removed.",
      );
      const deletedIds = new Set(visibleSelectedIds);
      setLocalLeads((current) =>
        current.filter((lead) => !deletedIds.has(lead.id)),
      );
      clearSelection();
      setBulkDeleteOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "We could not delete the selected leads.";
      setBulkDeleteError(errorMessage);
      notify.error("Lead delete failed", errorMessage);
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function exportVisibleLeads() {
    downloadCsv({
      filename: getDatedCsvFilename("opspilot-leads"),
      headers: [
        "title",
        "contact",
        "email",
        "phone",
        "status",
        "priority",
        "estimated_value",
        "source",
        "pipeline_stage",
        "next_follow_up_at",
        "created_at",
      ],
      rows: filteredLeads.map((lead) => ({
        contact: lead.client?.name ?? "",
        created_at: lead.created_at,
        email: lead.client?.email ?? "",
        estimated_value: lead.estimated_value,
        next_follow_up_at: lead.next_follow_up_at ?? "",
        phone: lead.client?.phone ?? "",
        pipeline_stage: lead.stage_id
          ? stageMap.get(lead.stage_id)?.name ?? ""
          : "",
        priority: lead.priority,
        source: lead.source ?? "",
        status: lead.status,
        title: lead.title,
      })),
    });
  }

  function handleLeadCreated(lead: LeadListItem) {
    setLocalLeads((current) => [lead, ...current]);
  }

  function handleLeadUpdated(lead: LeadListItem) {
    setLocalLeads((current) =>
      current.map((currentLead) =>
        currentLead.id === lead.id ? lead : currentLead,
      ),
    );
    setEditingLead((current) => (current?.id === lead.id ? lead : current));
  }

  if (localLeads.length === 0) {
    return (
      <LeadsEmptyState
        canAssignRecords={canAssignRecords}
        canCreateRecords={canCreateRecords}
        clients={clients}
        onLeadCreated={handleLeadCreated}
        stageOptions={stageOptions}
      />
    );
  }

  const advancedFilterCount = countLeadAdvancedFilters(advancedFilters);
  const fieldVisible = (fieldId: string) => visibleFields.includes(fieldId);
  const viewOptions: Array<{ key: LeadView; label: string; count: number }> = [
    { key: "all", label: "All", count: viewCounts.all },
    {
      key: "assigned_to_me",
      label: "Assigned to me",
      count: viewCounts.assigned_to_me,
    },
    { key: "unassigned", label: "Unassigned", count: viewCounts.unassigned },
    { key: "open", label: "Open", count: viewCounts.open },
    { key: "won", label: "Won", count: viewCounts.won },
    { key: "lost", label: "Lost", count: viewCounts.lost },
    {
      key: "follow_up_due",
      label: "Follow-up due",
      count: viewCounts.follow_up_due,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div
                aria-label="CRM sections"
                className="flex flex-wrap gap-2"
                role="tablist"
              >
                <Link
                  aria-selected={activeTab === "leads"}
                  className={`inline-flex h-8 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition ${
                    activeTab === "leads"
                      ? "bg-[var(--workspace-primary,var(--ops-primary))] text-white shadow-[0_10px_24px_var(--workspace-primary-glow,var(--ops-primary-glow))]"
                      : "bg-[var(--ops-card-soft)] text-[var(--ops-text-soft)] hover:text-[var(--ops-text)]"
                  }`}
                  href="/leads?tab=leads"
                  role="tab"
                >
                  Leads
                </Link>
                <Link
                  aria-selected={activeTab === "contacts"}
                  className={`inline-flex h-8 items-center justify-center rounded-full px-3 text-[13px] font-semibold transition ${
                    activeTab === "contacts"
                      ? "bg-[var(--workspace-primary,var(--ops-primary))] text-white shadow-[0_10px_24px_var(--workspace-primary-glow,var(--ops-primary-glow))]"
                      : "bg-[var(--ops-card-soft)] text-[var(--ops-text-soft)] hover:text-[var(--ops-text)]"
                  }`}
                  href="/leads?tab=contacts"
                  role="tab"
                >
                  Contacts
                </Link>
              </div>
              <span className="inline-flex items-center rounded-full bg-[var(--ops-card-soft)] px-3 py-1 text-sm font-semibold text-[var(--ops-text-soft)]">
                {localLeads.length} {localLeads.length === 1 ? "Lead" : "Leads"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canCreateRecords ? (
              <ImportCsvDialog
                endpoint="/api/leads/import"
                label="leads"
                requiredField="title"
                templateHeaders={leadImportHeaders}
                triggerId="leads-import-trigger"
              />
            ) : null}
            {canCreateRecords ? (
              <AddLeadDialog
                canAssignRecords={canAssignRecords}
                className="h-9"
                clients={clients}
                onLeadCreated={handleLeadCreated}
                stageOptions={stageOptions}
                variant="primary"
              />
            ) : null}
            <CrmActionsMenu
              ariaLabel="More lead list actions"
              items={[
                ...(canCreateRecords
                  ? [
                      {
                        label: "Import leads",
                        onClick: () =>
                          document.getElementById("leads-import-trigger")?.click(),
                      },
                    ]
                  : []),
                { label: "Export leads", onClick: exportVisibleLeads },
                {
                  label: "Manage fields",
                  onClick: () =>
                    document.getElementById("leads-fields-trigger")?.click(),
                },
                { label: "Clear filters", onClick: clearFilters },
                { href: "/pipelines", label: "View pipeline board" },
                { label: "Refresh list", onClick: () => router.refresh() },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {viewOptions.map((view) => (
              <button
                className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
                  activeView === view.key
                    ? "bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-[var(--workspace-primary,var(--ops-primary-dark))]"
                    : "bg-[var(--ops-card-soft)] text-[var(--ops-text-soft)] hover:text-[var(--ops-text)]"
                }`}
                key={view.key}
                onClick={() => setActiveView(view.key)}
                type="button"
              >
                <span>{view.label}</span>
                <span className="text-xs opacity-80">{view.count}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_160px_160px_170px_150px_auto_auto]">
            <div className="relative min-w-0 xl:col-span-1">
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
                size={16}
                weight="regular"
              />
              <input
                aria-label="Search leads"
                className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 pl-8 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search leads"
                type="search"
                value={searchQuery}
              />
            </div>

            <div className="relative min-w-0">
              <FunnelSimpleIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
                size={16}
                weight="regular"
              />
              <select
                aria-label="Filter leads by status"
                className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 pl-8 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                onChange={(event) =>
                  setStatusFilter(event.target.value as LeadStatus | "all")
                }
                value={statusFilter}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div className="relative min-w-0">
              <FunnelSimpleIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
                size={16}
                weight="regular"
              />
              <select
                aria-label="Filter leads by priority"
                className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 pl-8 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                onChange={(event) =>
                  setPriorityFilter(event.target.value as LeadPriority | "all")
                }
                value={priorityFilter}
              >
                <option value="all">All priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="relative min-w-0">
              <CaretDownIcon
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
                size={14}
                weight="bold"
              />
              <select
                aria-label="Filter leads by stage"
                className="h-9 w-full appearance-none rounded-lg border border-[var(--ops-border)] bg-white px-3 pr-8 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                onChange={(event) => setStageFilter(event.target.value)}
                value={stageFilter}
              >
                <option value="all">All stages</option>
                <option value="__none__">No stage</option>
                {stageOptions.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-0">
              <ArrowsDownUpIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
                size={16}
                weight="regular"
              />
              <select
                aria-label="Sort leads"
                className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 pl-8 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                onChange={(event) => setSortBy(event.target.value as LeadSort)}
                value={sortBy}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="value_high">Estimated value high to low</option>
                <option value="follow_up_soonest">Next follow-up soonest</option>
              </select>
            </div>

            <LeadsAdvancedFiltersDialog
              activeCount={advancedFilterCount}
              filters={advancedFilters}
              onApply={setAdvancedFilters}
              onReset={() => setAdvancedFilters(leadAdvancedFilterDefaults)}
              stageOptions={stageOptions}
            />

            <ManageFieldsDialog
              fields={leadFieldOptions}
              onChange={updateVisibleFields}
              title="Lead"
              triggerId="leads-fields-trigger"
              value={visibleFields}
            />
          </div>

          {canDeleteRecords ? (
            <BulkActionBar
              canDelete
              canEdit={false}
              entityLabel="lead"
              onClearSelection={clearSelection}
              onDelete={() => setBulkDeleteOpen(true)}
              selectedCount={visibleSelectedIds.length}
            />
          ) : null}
          {bulkDeleteError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--ops-danger)]">
              {bulkDeleteError}
            </p>
          ) : null}
        </div>
      </div>

        <Card className="ops-density-surface overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--ops-text-soft)] sm:px-6">
            No leads match the current view.
          </div>
        ) : (
          <>
            <div className="hidden max-h-[min(68vh,44rem)] overflow-auto lg:block">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-0 bg-[var(--ops-card-soft)] text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                  <tr>
                    {canDeleteRecords ? (
                      <th className="px-5 py-3 sm:px-6" scope="col">
                        <input
                          aria-label="Select all leads"
                          checked={allFilteredSelected}
                          className="h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                          onChange={toggleSelectAll}
                          type="checkbox"
                        />
                      </th>
                    ) : null}
                    <th className="px-5 py-3 sm:px-6" scope="col">
                      Lead name
                    </th>
                    <th className="px-5 py-3" scope="col">
                      Assigned to
                    </th>
                    {fieldVisible("status") ? (
                      <th className="px-5 py-3" scope="col">
                        Status
                      </th>
                    ) : null}
                    {fieldVisible("priority") ? (
                      <th className="px-5 py-3" scope="col">
                        Priority
                      </th>
                    ) : null}
                    {fieldVisible("estimated_value") ? (
                      <th className="px-5 py-3" scope="col">
                        Estimated value
                      </th>
                    ) : null}
                    {fieldVisible("source") ? (
                      <th className="px-5 py-3" scope="col">
                        Source
                      </th>
                    ) : null}
                    {fieldVisible("stage") ? (
                      <th className="px-5 py-3" scope="col">
                        Pipeline stage
                      </th>
                    ) : null}
                    {fieldVisible("next_follow_up") ? (
                      <th className="px-5 py-3" scope="col">
                        <DateTimeHeader label="Next follow-up" />
                      </th>
                    ) : null}
                    {fieldVisible("created") ? (
                      <th className="px-5 py-3" scope="col">
                        Created
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ops-border)] bg-white">
                  {filteredLeads.map((lead) => (
                    <tr
                      className={`align-top ${canCreateRecords ? "cursor-pointer transition hover:bg-[var(--ops-card-soft)]" : ""}`}
                      key={lead.id}
                      onDoubleClick={() => openLeadEditor(lead)}
                      title={canCreateRecords ? "Double-click to edit lead" : undefined}
                    >
                      {canDeleteRecords ? (
                        <td className="px-5 py-4 sm:px-6">
                          <input
                            aria-label={`Select ${lead.title}`}
                            checked={selectedIds.includes(lead.id)}
                            className="mt-1 h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                            onChange={() => toggleLeadSelection(lead.id)}
                            onClick={(event) => event.stopPropagation()}
                            onDoubleClick={(event) => event.stopPropagation()}
                            type="checkbox"
                          />
                        </td>
                      ) : null}
                      <td className="px-5 py-4 sm:px-6">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))]">
                            {lead.client ? (
                              getInitials(lead)
                            ) : (
                              <UserCircleIcon aria-hidden="true" size={20} weight="duotone" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--ops-text)]">
                              {lead.title}
                            </p>
                            <div className="mt-1 space-y-1 text-xs text-[var(--ops-text-muted)]">
                              <p>{lead.client?.name ?? "No contact linked"}</p>
                              {getContactSecondaryLine(lead) ? (
                                <p>{getContactSecondaryLine(lead)}</p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <AssignmentSelect
                          assignedMember={lead.assigned_member}
                          assignedMemberId={lead.assigned_member_id}
                          canAssign={canAssignRecords}
                          recordId={lead.id}
                          targetType="lead"
                        />
                      </td>
                      {fieldVisible("status") ? (
                        <td className="px-5 py-4">
                          <LeadStatusBadge status={lead.status} />
                        </td>
                      ) : null}
                      {fieldVisible("priority") ? (
                        <td className="px-5 py-4">
                          <LeadPriorityBadge priority={lead.priority} />
                        </td>
                      ) : null}
                      {fieldVisible("estimated_value") ? (
                        <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                          {formatCurrency(lead.estimated_value)}
                        </td>
                      ) : null}
                      {fieldVisible("source") ? (
                        <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                          {lead.source ?? "Not set"}
                        </td>
                      ) : null}
                      {fieldVisible("stage") ? (
                        <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                          {lead.stage_id
                            ? stageMap.get(lead.stage_id)?.name ?? "Assigned"
                            : "No stage"}
                        </td>
                      ) : null}
                      {fieldVisible("next_follow_up") ? (
                        <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                          <DateTimeCell value={lead.next_follow_up_at} />
                        </td>
                      ) : null}
                      {fieldVisible("created") ? (
                        <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                          {formatCreatedDate(lead.created_at)}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--ops-border)] lg:hidden">
              {filteredLeads.map((lead) => (
                <article
                  className={`ops-density-card space-y-4 p-5 ${canCreateRecords ? "cursor-pointer transition hover:bg-[var(--ops-card-soft)]" : ""}`}
                  key={lead.id}
                  onDoubleClick={() => openLeadEditor(lead)}
                  title={canCreateRecords ? "Double-click to edit lead" : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))]">
                        {lead.client ? (
                          getInitials(lead)
                        ) : (
                          <UserCircleIcon aria-hidden="true" size={20} weight="duotone" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--ops-text)]">
                          {lead.title}
                        </p>
                        <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                          {lead.client?.name ?? "No contact linked"}
                        </p>
                        {getContactSecondaryLine(lead) ? (
                          <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                            {getContactSecondaryLine(lead)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {canDeleteRecords ? (
                      <input
                        aria-label={`Select ${lead.title}`}
                        checked={selectedIds.includes(lead.id)}
                        className="mt-1 h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                        onChange={() => toggleLeadSelection(lead.id)}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        type="checkbox"
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <LeadStatusBadge status={lead.status} />
                    <LeadPriorityBadge priority={lead.priority} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                      Assigned to
                    </p>
                    <div className="mt-2">
                      <AssignmentSelect
                        assignedMember={lead.assigned_member}
                        assignedMemberId={lead.assigned_member_id}
                        canAssign={canAssignRecords}
                        recordId={lead.id}
                        targetType="lead"
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                        Estimated value
                      </p>
                      <p className="mt-1 text-[var(--ops-text-soft)]">
                        {formatCurrency(lead.estimated_value)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                        Source
                      </p>
                      <p className="mt-1 text-[var(--ops-text-soft)]">
                        {lead.source ?? "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                        Pipeline stage
                      </p>
                      <p className="mt-1 text-[var(--ops-text-soft)]">
                        {lead.stage_id
                          ? stageMap.get(lead.stage_id)?.name ?? "Assigned"
                          : "No stage"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                        Created
                      </p>
                      <p className="mt-1 text-[var(--ops-text-soft)]">
                        {formatCreatedDate(lead.created_at)}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                        Next follow-up
                      </p>
                      <p className="mt-1 text-[var(--ops-text-soft)]">
                        <DateTimeCell value={lead.next_follow_up_at} />
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </Card>
      <ConfirmDeleteDialog
        confirmLabel="Delete leads"
        isSubmitting={isBulkDeleting}
        itemCount={visibleSelectedIds.length}
        onCancel={() => {
          if (!isBulkDeleting) {
            setBulkDeleteOpen(false);
          }
        }}
        onConfirm={deleteSelectedLeads}
        open={bulkDeleteOpen && visibleSelectedIds.length > 0}
        title="Delete selected leads?"
      />
      {editingLead ? (
      <EditLeadDialog
        canAssignRecords={canAssignRecords}
        hideTrigger
        lead={editingLead}
        onLeadUpdated={handleLeadUpdated}
        onOpenChange={(open) => {
          if (!open) {
            setEditingLead(null);
            }
          }}
          open
        />
      ) : null}
    </div>
  );
}
