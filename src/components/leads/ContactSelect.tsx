"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import type { Client } from "@/types/domain";

type ContactSelectProps = {
  clients: Client[];
  disabled?: boolean;
  onSelectedClientIdChange: (value: string) => void;
  selectedClientId: string;
};

export function ContactSelect({
  clients,
  disabled = false,
  onSelectedClientIdChange,
  selectedClientId,
}: ContactSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return clients;
    }

    return clients.filter((client) => {
      const haystack = [
        client.name,
        client.email,
        client.phone,
        client.company_name,
        client.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [clients, searchTerm]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="sr-only" htmlFor="lead-client-search">
          Search contacts
        </label>
        <MagnifyingGlassIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ops-text-muted)]"
          size={18}
          weight="regular"
        />
        <input
          className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 pl-9 text-sm text-[var(--ops-text)] shadow-sm outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
          disabled={disabled}
          id="lead-client-search"
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search existing contacts"
          type="search"
          value={searchTerm}
        />
      </div>

      <div>
        <label
          className="text-sm font-medium text-[var(--ops-text)]"
          htmlFor="lead-client-id"
        >
          Existing contact
        </label>
        <select
          className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
          disabled={disabled}
          id="lead-client-id"
          name="client_id"
          onChange={(event) => onSelectedClientIdChange(event.target.value)}
          value={selectedClientId}
        >
          <option value="">No contact selected</option>
          {filteredClients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
              {client.email ? ` - ${client.email}` : ""}
              {!client.email && client.phone ? ` - ${client.phone}` : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
