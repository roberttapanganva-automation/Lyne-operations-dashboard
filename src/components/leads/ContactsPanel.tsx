"use client";

import {
  AddressBookIcon,
  ArrowsDownUpIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { BulkActionBar } from "@/components/ui/BulkActionBar";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { downloadCsv } from "@/lib/csv/client";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { ClientListItem } from "@/types/domain";
import { AddContactDialog } from "./AddContactDialog";
import {
  ContactsAdvancedFiltersDialog,
  type ContactAdvancedFilters,
} from "./AdvancedFiltersDialog";
import { CrmActionsMenu } from "./CrmActionsMenu";
import { EditContactDialog } from "./EditContactDialog";
import { ImportCsvDialog } from "./ImportCsvDialog";
import { ManageFieldsDialog, type FieldOption } from "./ManageFieldsDialog";

type ContactsPanelProps = {
  activeTab: "leads" | "contacts";
  canCreateRecords: boolean;
  canDeleteRecords: boolean;
  clients: ClientListItem[];
};

type ContactView = "all" | "customers" | "repeat" | "saved";
type ContactSort = "newest" | "name" | "activity";

type BulkDeleteResponse = {
  deletedCount: number;
};

const contactAdvancedFilterDefaults: ContactAdvancedFilters = {
  createdFrom: "",
  createdTo: "",
  customerType: "all",
  hasCompany: false,
  hasEmail: false,
  hasPhone: false,
  source: "",
};

const contactFieldOptions: FieldOption[] = [
  { id: "name", label: "Contact name", locked: true },
  { id: "phone", label: "Phone" },
  { id: "email", label: "Email" },
  { id: "business", label: "Business name" },
  { id: "created", label: "Created" },
  { id: "activity", label: "Last activity" },
  { id: "tags", label: "Type / Tags" },
];

const defaultContactFields = contactFieldOptions.map((field) => field.id);
const contactImportHeaders = [
  "name",
  "email",
  "phone",
  "company_name",
  "address",
  "source",
  "notes",
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatLastActivity(value: string | null) {
  if (!value) {
    return "No activity yet";
  }

  return formatDate(value);
}

function getInitials(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "C";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function getTypeTags(client: ClientListItem) {
  const tags: string[] = [client.relationship_label];

  if (client.linked_lead_count > 0) {
    tags.push("Lead-linked");
  }

  return tags;
}

function compareByActivity(left: ClientListItem, right: ClientListItem) {
  const leftTimestamp = left.last_activity_at
    ? new Date(left.last_activity_at).getTime()
    : 0;
  const rightTimestamp = right.last_activity_at
    ? new Date(right.last_activity_at).getTime()
    : 0;

  if (rightTimestamp !== leftTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
}

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

function countContactAdvancedFilters(filters: ContactAdvancedFilters) {
  return [
    filters.customerType !== "all",
    Boolean(filters.source.trim()),
    Boolean(filters.createdFrom),
    Boolean(filters.createdTo),
    filters.hasEmail,
    filters.hasPhone,
    filters.hasCompany,
  ].filter(Boolean).length;
}

function getInitialVisibleFields() {
  if (typeof window === "undefined") {
    return defaultContactFields;
  }

  try {
    const savedFields = window.localStorage.getItem("opspilot:crm:contact-fields");
    if (!savedFields) {
      return defaultContactFields;
    }

    const parsedFields = JSON.parse(savedFields) as string[];
    const supportedFields = parsedFields.filter((field) =>
      contactFieldOptions.some((option) => option.id === field),
    );

    return supportedFields.includes("name")
      ? [...new Set(["name", ...supportedFields])]
      : defaultContactFields;
  } catch {
    return defaultContactFields;
  }
}

export function ContactsPanel({
  activeTab,
  canCreateRecords,
  canDeleteRecords,
  clients,
}: ContactsPanelProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<ContactView>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<ContactSort>("newest");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] =
    useState<ContactAdvancedFilters>(contactAdvancedFilterDefaults);
  const [visibleFields, setVisibleFields] = useState(getInitialVisibleFields);
  const [notice, setNotice] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientListItem | null>(null);

  function updateVisibleFields(nextFields: string[]) {
    const withRequiredName = [...new Set(["name", ...nextFields])];
    setVisibleFields(withRequiredName);

    try {
      window.localStorage.setItem(
        "opspilot:crm:contact-fields",
        JSON.stringify(withRequiredName),
      );
    } catch {
      // Keep in-memory fields even when storage is unavailable.
    }
  }

  const counts = useMemo(
    () => ({
      all: clients.length,
      customers: clients.filter((client) => client.relationship_label === "Customer")
        .length,
      repeat: clients.filter(
        (client) => client.relationship_label === "Repeat customer",
      ).length,
      saved: clients.filter((client) => client.relationship_label === "Saved contact")
        .length,
    }),
    [clients],
  );

  const filteredClients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    let nextClients = clients.filter((client) => {
      if (activeView === "customers") {
        return client.relationship_label === "Customer";
      }

      if (activeView === "repeat") {
        return client.relationship_label === "Repeat customer";
      }

      if (activeView === "saved") {
        return client.relationship_label === "Saved contact";
      }

      return true;
    });

    nextClients = nextClients.filter((client) => {
      if (
        advancedFilters.customerType === "saved" &&
        client.relationship_label !== "Saved contact"
      ) {
        return false;
      }

      if (
        advancedFilters.customerType === "customer" &&
        client.relationship_label !== "Customer"
      ) {
        return false;
      }

      if (
        advancedFilters.customerType === "repeat" &&
        client.relationship_label !== "Repeat customer"
      ) {
        return false;
      }

      if (
        advancedFilters.customerType === "lead_linked" &&
        client.linked_lead_count <= 0
      ) {
        return false;
      }

      if (
        advancedFilters.source.trim() &&
        !(client.source ?? "")
          .toLowerCase()
          .includes(advancedFilters.source.trim().toLowerCase())
      ) {
        return false;
      }

      if (advancedFilters.hasEmail && !client.email) {
        return false;
      }

      if (advancedFilters.hasPhone && !client.phone) {
        return false;
      }

      if (advancedFilters.hasCompany && !client.company_name) {
        return false;
      }

      const createdTimestamp = getDateTimestamp(client.created_at);
      const createdFrom = advancedFilters.createdFrom
        ? getDateTimestamp(advancedFilters.createdFrom)
        : null;
      const createdTo = advancedFilters.createdTo
        ? getDayEndTimestamp(advancedFilters.createdTo)
        : null;

      if (createdFrom !== null && (createdTimestamp ?? 0) < createdFrom) {
        return false;
      }

      if (createdTo !== null && (createdTimestamp ?? Infinity) > createdTo) {
        return false;
      }

      return true;
    });

    if (query) {
      nextClients = nextClients.filter((client) =>
        [
          client.name,
          client.email,
          client.phone,
          client.company_name,
          client.source,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    const sortedClients = [...nextClients];

    if (sortBy === "name") {
      sortedClients.sort((left, right) => left.name.localeCompare(right.name));
    } else if (sortBy === "activity") {
      sortedClients.sort(compareByActivity);
    } else {
      sortedClients.sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );
    }

    return sortedClients;
  }, [activeView, advancedFilters, clients, searchQuery, sortBy]);

  const allFilteredSelected =
    filteredClients.length > 0 &&
    filteredClients.every((client) => selectedIds.includes(client.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((current) =>
        current.filter(
          (selectedId) =>
            !filteredClients.some((client) => client.id === selectedId),
        ),
      );
      return;
    }

    setSelectedIds((current) => [
      ...new Set([...current, ...filteredClients.map((client) => client.id)]),
    ]);
  }

  function toggleClientSelection(clientId: string) {
    setSelectedIds((current) =>
      current.includes(clientId)
        ? current.filter((selectedId) => selectedId !== clientId)
        : [...current, clientId],
    );
  }

  function openContactEditor(client: ClientListItem) {
    if (!canCreateRecords) {
      return;
    }

    setEditingClient(client);
  }

  function clearFilters() {
    setActiveView("all");
    setSearchQuery("");
    setSortBy("newest");
    setAdvancedFilters(contactAdvancedFilterDefaults);
  }

  function clearSelection() {
    setSelectedIds([]);
    setBulkDeleteError(null);
  }

  async function deleteSelectedContacts() {
    setBulkDeleteError(null);
    setIsBulkDeleting(true);

    try {
      const response = await fetch("/api/clients/bulk", {
        body: JSON.stringify({
          action: "delete",
          ids: selectedIds,
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
            ? "We could not delete the selected contacts."
            : result.error.message;
        setBulkDeleteError(errorMessage);
        notify.error("Contact delete failed", errorMessage);
        return;
      }

      notify.success(
        result.data.deletedCount === 1 ? "Contact deleted" : "Contacts deleted",
        result.data.deletedCount === 1
          ? "The selected contact was removed."
          : "The selected contacts were removed.",
      );
      clearSelection();
      setBulkDeleteOpen(false);
      router.refresh();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "We could not delete the selected contacts.";
      setBulkDeleteError(errorMessage);
      notify.error("Contact delete failed", errorMessage);
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function exportVisibleContacts() {
    downloadCsv({
      filename: "opspilot-contacts.csv",
      headers: [
        "name",
        "phone",
        "email",
        "company_name",
        "source",
        "created_at",
        "last_activity_at",
        "relationship_label",
        "linked_lead_count",
        "completed_job_count",
      ],
      rows: filteredClients.map((client) => ({
        company_name: client.company_name ?? "",
        completed_job_count: client.completed_job_count,
        created_at: client.created_at,
        email: client.email ?? "",
        last_activity_at: client.last_activity_at ?? "",
        linked_lead_count: client.linked_lead_count,
        name: client.name,
        phone: client.phone ?? "",
        relationship_label: client.relationship_label,
        source: client.source ?? "",
      })),
    });
  }

  const advancedFilterCount = countContactAdvancedFilters(advancedFilters);
  const fieldVisible = (fieldId: string) => visibleFields.includes(fieldId);

  const viewOptions: Array<{
    count: number;
    key: ContactView;
    label: string;
  }> = [
    { count: counts.all, key: "all", label: "All" },
    { count: counts.customers, key: "customers", label: "Customers" },
    { count: counts.repeat, key: "repeat", label: "Repeat Customers" },
    { count: counts.saved, key: "saved", label: "Saved Contacts" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
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
                {counts.all} {counts.all === 1 ? "Contact" : "Contacts"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canCreateRecords ? (
              <ImportCsvDialog
                endpoint="/api/clients/import"
                label="contacts"
                requiredField="name"
                templateHeaders={contactImportHeaders}
                triggerId="contacts-import-trigger"
              />
            ) : null}
            {canCreateRecords ? <AddContactDialog /> : null}
            <CrmActionsMenu
              ariaLabel="More contact actions"
              items={[
                ...(canCreateRecords
                  ? [
                      {
                        label: "Import contacts",
                        onClick: () =>
                          document.getElementById("contacts-import-trigger")?.click(),
                      },
                    ]
                  : []),
                { label: "Export contacts", onClick: exportVisibleContacts },
                {
                  label: "Manage fields",
                  onClick: () =>
                    document.getElementById("contacts-fields-trigger")?.click(),
                },
                { label: "Clear filters", onClick: clearFilters },
                {
                  label: "Add smart list",
                  onClick: () =>
                    setNotice("Smart lists will be added later."),
                },
                { label: "Refresh list", onClick: () => router.refresh() },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
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
            <button
              className="inline-flex h-9 items-center rounded-full border border-dashed border-[var(--ops-border)] px-3 text-sm font-semibold text-[var(--ops-text-muted)] transition hover:border-[var(--workspace-primary,var(--ops-primary))] hover:text-[var(--ops-text)]"
              onClick={() => setNotice("Smart lists will be added later.")}
              type="button"
            >
              + Add smart list
            </button>
          </div>

          {notice ? (
            <div className="flex items-center justify-between rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 py-2 text-sm text-[var(--ops-text-soft)]">
              <span>{notice}</span>
              <button
                className="font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))]"
                onClick={() => setNotice(null)}
                type="button"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          <div className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_auto_auto_180px_auto]">
            <div className="relative min-w-0">
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
                size={16}
                weight="regular"
              />
              <input
                aria-label="Search contacts"
                className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 pl-8 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search contacts"
                type="search"
                value={searchQuery}
              />
            </div>

            <ContactsAdvancedFiltersDialog
              activeCount={advancedFilterCount}
              filters={advancedFilters}
              onApply={setAdvancedFilters}
              onReset={() => setAdvancedFilters(contactAdvancedFilterDefaults)}
            />

            <ManageFieldsDialog
              fields={contactFieldOptions}
              onChange={updateVisibleFields}
              title="Contact"
              triggerId="contacts-fields-trigger"
              value={visibleFields}
            />

            <div className="relative min-w-0">
              <ArrowsDownUpIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
                size={16}
                weight="regular"
              />
              <select
                aria-label="Sort contacts"
                className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 pl-8 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                onChange={(event) => setSortBy(event.target.value as ContactSort)}
                value={sortBy}
              >
                <option value="newest">Newest first</option>
                <option value="name">Name A-Z</option>
                <option value="activity">Latest activity</option>
              </select>
            </div>

            <div className="flex items-center justify-end text-sm text-[var(--ops-text-muted)]">
              {filteredClients.length} shown
            </div>
          </div>

          <BulkActionBar
            canDelete={canDeleteRecords}
            canEdit={false}
            entityLabel="contact"
            onClearSelection={clearSelection}
            onDelete={() => setBulkDeleteOpen(true)}
            selectedCount={selectedIds.length}
          />
          {bulkDeleteError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--ops-danger)]">
              {bulkDeleteError}
            </p>
          ) : null}
        </div>
      </div>

      {clients.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="px-5 py-10 sm:px-6">
            <div className="rounded-xl border border-dashed border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-6 py-10 text-center">
              <p className="text-base font-semibold text-[var(--ops-text)]">
                No contacts yet.
              </p>
              <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
                Customers will appear here after jobs are completed or when you add
                a contact manually.
              </p>
              {canCreateRecords ? (
                <div className="mt-5 flex justify-center">
                  <AddContactDialog />
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card className="overflow-hidden">
          <div className="px-5 py-10 text-center text-sm text-[var(--ops-text-soft)] sm:px-6">
            No contacts match the current view.
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden max-h-[min(68vh,44rem)] overflow-auto lg:block">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-0 bg-[var(--ops-card-soft)] text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
                <tr>
                  <th className="px-5 py-3 sm:px-6" scope="col">
                    <input
                      aria-label="Select all contacts"
                      checked={allFilteredSelected}
                      className="h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                      onChange={toggleSelectAll}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-5 py-3" scope="col">
                    Contact name
                  </th>
                  {fieldVisible("phone") ? (
                    <th className="px-5 py-3" scope="col">
                      Phone
                    </th>
                  ) : null}
                  {fieldVisible("email") ? (
                    <th className="px-5 py-3" scope="col">
                      Email
                    </th>
                  ) : null}
                  {fieldVisible("business") ? (
                    <th className="px-5 py-3" scope="col">
                      Business name
                    </th>
                  ) : null}
                  {fieldVisible("created") ? (
                    <th className="px-5 py-3" scope="col">
                      Created
                    </th>
                  ) : null}
                  {fieldVisible("activity") ? (
                    <th className="px-5 py-3" scope="col">
                      Last activity
                    </th>
                  ) : null}
                  {fieldVisible("tags") ? (
                    <th className="px-5 py-3" scope="col">
                      Type / Tags
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border)] bg-white">
                {filteredClients.map((client) => (
                  <tr
                    className={`align-top ${canCreateRecords ? "cursor-pointer transition hover:bg-[var(--ops-card-soft)]" : ""}`}
                    key={client.id}
                    onDoubleClick={() => openContactEditor(client)}
                    title={canCreateRecords ? "Double-click to edit contact" : undefined}
                  >
                    <td className="px-5 py-4 sm:px-6">
                      <input
                        aria-label={`Select ${client.name}`}
                        checked={selectedIds.includes(client.id)}
                        className="mt-1 h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                        onChange={() => toggleClientSelection(client.id)}
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))]">
                          {getInitials(client.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--ops-text)]">{client.name}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[var(--ops-text-muted)]">
                            <AddressBookIcon aria-hidden="true" size={13} weight="regular" />
                            <span>{client.linked_lead_count} linked leads</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {fieldVisible("phone") ? (
                      <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                        {client.phone ?? "Not set"}
                      </td>
                    ) : null}
                    {fieldVisible("email") ? (
                      <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                        {client.email ?? "Not set"}
                      </td>
                    ) : null}
                    {fieldVisible("business") ? (
                      <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                        {client.company_name ?? "Not set"}
                      </td>
                    ) : null}
                    {fieldVisible("created") ? (
                      <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                        {formatDate(client.created_at)}
                      </td>
                    ) : null}
                    {fieldVisible("activity") ? (
                      <td className="px-5 py-4 text-[var(--ops-text-soft)]">
                        {formatLastActivity(client.last_activity_at)}
                      </td>
                    ) : null}
                    {fieldVisible("tags") ? (
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {getTypeTags(client).map((tag) => (
                            <span
                              className="inline-flex items-center rounded-full bg-[var(--ops-card-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ops-text-soft)]"
                              key={`${client.id}-${tag}`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[var(--ops-border)] lg:hidden">
            {filteredClients.map((client) => (
              <article
                className={`space-y-4 p-5 ${canCreateRecords ? "cursor-pointer transition hover:bg-[var(--ops-card-soft)]" : ""}`}
                key={client.id}
                onDoubleClick={() => openContactEditor(client)}
                title={canCreateRecords ? "Double-click to edit contact" : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))]">
                      {getInitials(client.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--ops-text)]">{client.name}</p>
                      <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                        {client.email ?? "No email"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                        {client.phone ?? "No phone"}
                      </p>
                    </div>
                  </div>
                  <input
                    aria-label={`Select ${client.name}`}
                    checked={selectedIds.includes(client.id)}
                    className="mt-1 h-4 w-4 rounded border-[var(--ops-border)] text-[var(--workspace-primary,var(--ops-primary))] focus:ring-[var(--workspace-primary,var(--ops-primary))]"
                    onChange={() => toggleClientSelection(client.id)}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    type="checkbox"
                  />
                </div>

                <div className="grid gap-3 text-sm text-[var(--ops-text-soft)]">
                  <div className="flex justify-between gap-4">
                    <span>Business</span>
                    <span className="text-right text-[var(--ops-text)]">
                      {client.company_name ?? "Not set"}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Created</span>
                    <span className="text-right text-[var(--ops-text)]">
                      {formatDate(client.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Last activity</span>
                    <span className="text-right text-[var(--ops-text)]">
                      {formatLastActivity(client.last_activity_at)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {getTypeTags(client).map((tag) => (
                    <span
                      className="inline-flex items-center rounded-full bg-[var(--ops-card-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ops-text-soft)]"
                      key={`${client.id}-mobile-${tag}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
              ))}
            </div>
        </Card>
      )}
      <ConfirmDeleteDialog
        confirmLabel="Delete contacts"
        isSubmitting={isBulkDeleting}
        itemCount={selectedIds.length}
        onCancel={() => {
          if (!isBulkDeleting) {
            setBulkDeleteOpen(false);
          }
        }}
        onConfirm={deleteSelectedContacts}
        open={bulkDeleteOpen}
        title="Delete selected contacts?"
      />
      <EditContactDialog
        client={editingClient}
        onClose={() => setEditingClient(null)}
        open={Boolean(editingClient)}
      />
    </div>
  );
}
