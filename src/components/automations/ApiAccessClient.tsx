"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  KeyIcon,
  PencilSimpleIcon,
  ShieldCheckIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { copyTextToClipboard } from "@/lib/client/clipboard";
import { notify } from "@/lib/ui/toast";
import {
  workspaceApiKeyScopeLabels,
  workspaceApiKeyScopes,
  type WorkspaceApiKeyScope,
} from "@/lib/validation/apiKeys";
import type { ApiResponse } from "@/types/api";
import type {
  WorkspaceApiKey,
  WorkspaceApiKeyCreateResult,
} from "@/types/domain";

type DialogMode = "create" | "edit";

type ApiAccessClientProps = {
  initialApiKeys: WorkspaceApiKey[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLastUsedDate(value: string | null) {
  if (!value) {
    return "Never used";
  }

  return formatDate(value);
}

function keyLabel(apiKey: WorkspaceApiKey) {
  return `${apiKey.key_prefix}••••${apiKey.key_suffix}`;
}

function statusVariant(status: WorkspaceApiKey["status"]) {
  if (status === "active") {
    return "success";
  }

  if (status === "revoked") {
    return "danger";
  }

  return "warning";
}

function CopyKeyIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polyline
        points="168 168 216 168 216 40 88 40 88 88"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <rect
        height="128"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
        width="128"
        x="40"
        y="88"
      />
    </svg>
  );
}

export function ApiAccessClient({ initialApiKeys }: ApiAccessClientProps) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [appOrigin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingKey, setEditingKey] = useState<WorkspaceApiKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formScopes, setFormScopes] = useState<WorkspaceApiKeyScope[]>([
    "lead:create",
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [oneTimeKey, setOneTimeKey] = useState<{
    label: string;
    rawKey: string;
  } | null>(null);

  const verifyUrl = useMemo(
    () => `${appOrigin || ""}/api/inbound/auth/verify`,
    [appOrigin],
  );
  const createLeadUrl = useMemo(
    () => `${appOrigin || ""}/api/inbound/leads`,
    [appOrigin],
  );
  const sampleLeadPayload = useMemo(
    () =>
      JSON.stringify(
        {
          email: "john@example.com",
          estimated_value: 250,
          message: "Needs a cleaning service quote",
          name: "John Smith",
          phone: "+123456789",
          source: "Website form",
        },
        null,
        2,
      ),
    [],
  );
  const verifyCurlCommand = useMemo(
    () =>
      `curl -X POST ${verifyUrl || "/api/inbound/auth/verify"} -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' -d '{}'`,
    [verifyUrl],
  );
  const createLeadCurlCommand = useMemo(
    () =>
      `curl -X POST ${createLeadUrl || "/api/inbound/leads"} -H 'Authorization: Bearer YOUR_API_KEY' -H 'Content-Type: application/json' -d '${sampleLeadPayload.replace(/\n/g, "")}'`,
    [createLeadUrl, sampleLeadPayload],
  );

  function openCreateDialog() {
    setDialogMode("create");
    setEditingKey(null);
    setError(null);
    setFormName("");
    setFormScopes(["lead:create"]);
    setIsDialogOpen(true);
  }

  function openEditDialog(apiKey: WorkspaceApiKey) {
    setDialogMode("edit");
    setEditingKey(apiKey);
    setError(null);
    setFormName(apiKey.name);
    setFormScopes(apiKey.scopes);
    setIsDialogOpen(true);
  }

  function toggleScope(scope: WorkspaceApiKeyScope) {
    setFormScopes((current) =>
      current.includes(scope)
        ? current.filter((value) => value !== scope)
        : [...current, scope],
    );
  }

  async function copyText(value: string, label = "Copied") {
    const result = await copyTextToClipboard(value);

    if (result.ok) {
      notify.simpleSuccess(label);
      return;
    }

    notify.error(
      "Copy blocked",
      "Copy blocked by browser. Select the text and copy manually.",
    );
  }

  async function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const url =
        dialogMode === "edit" && editingKey
          ? `/api/automation/api-keys/${editingKey.id}`
          : "/api/automation/api-keys";
      const response = await fetch(url, {
        body: JSON.stringify({
          name: formName,
          scopes: formScopes,
        }),
        headers: { "Content-Type": "application/json" },
        method: dialogMode === "edit" ? "PATCH" : "POST",
      });
      const result = (await response.json()) as ApiResponse<
        WorkspaceApiKey | WorkspaceApiKeyCreateResult
      >;

      if (!response.ok || !result.ok) {
        throw new Error(
          result.ok ? "API key could not be saved." : result.error.message,
        );
      }

      if (dialogMode === "edit") {
        const updatedKey = result.data as WorkspaceApiKey;
        setApiKeys((current) =>
          current.map((apiKey) =>
            apiKey.id === updatedKey.id ? updatedKey : apiKey,
          ),
        );
        notify.success("API key updated");
      } else {
        const created = result.data as WorkspaceApiKeyCreateResult;
        setApiKeys((current) => [created.apiKey, ...current]);
        setOneTimeKey({
          label: created.apiKey.name,
          rawKey: created.rawKey,
        });
        notify.success("API key created");
      }

      setIsDialogOpen(false);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "API key could not be saved.";
      setError(message);
      notify.error("API key save failed", message);
    } finally {
      setIsSaving(false);
    }
  }

  async function revokeKey(apiKey: WorkspaceApiKey) {
    if (!window.confirm(`Revoke "${apiKey.name}"? This key will stop working.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/automation/api-keys/${apiKey.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse<WorkspaceApiKey>;

      if (!response.ok || !result.ok) {
        throw new Error(
          result.ok ? "API key could not be revoked." : result.error.message,
        );
      }

      setApiKeys((current) =>
        current.map((item) => (item.id === result.data.id ? result.data : item)),
      );
      notify.success("API key revoked");
    } catch (caughtError) {
      notify.error(
        "API key revoke failed",
        caughtError instanceof Error
          ? caughtError.message
          : "API key could not be revoked.",
      );
    }
  }

  async function rotateKey(apiKey: WorkspaceApiKey) {
    if (
      !window.confirm(
        `Rotate "${apiKey.name}"? The old key will be revoked immediately.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/automation/api-keys/${apiKey.id}/rotate`,
        { method: "POST" },
      );
      const result =
        (await response.json()) as ApiResponse<WorkspaceApiKeyCreateResult>;

      if (!response.ok || !result.ok) {
        throw new Error(
          result.ok ? "API key could not be rotated." : result.error.message,
        );
      }

      setApiKeys((current) => [
        result.data.apiKey,
        ...current.map((item) =>
          item.id === apiKey.id
            ? {
                ...item,
                revoked_at: new Date().toISOString(),
                status: "revoked" as const,
              }
            : item,
        ),
      ]);
      setOneTimeKey({
        label: result.data.apiKey.name,
        rawKey: result.data.rawKey,
      });
      notify.success("API key rotated");
    } catch (caughtError) {
      notify.error(
        "API key rotate failed",
        caughtError instanceof Error
          ? caughtError.message
          : "API key could not be rotated.",
      );
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
              Automations
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--ops-text)]">
              API Access
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ops-text-soft)]">
              Create secure workspace API keys for n8n, Zapier, Make, or custom
              automation tools.
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <KeyIcon aria-hidden="true" className="mr-2 size-4" weight="bold" />
            Create API key
          </Button>
        </div>
      </section>

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-info-soft)] text-[var(--ops-info)]">
            <ShieldCheckIcon aria-hidden="true" className="size-5" weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-[var(--ops-text)]">Quick setup</h2>
            <div className="mt-4 grid gap-3 xl:grid-cols-2 2xl:grid-cols-4">
              {[
                ["Base URL", appOrigin || "Current app origin"],
                ["Auth header", "Authorization: Bearer YOUR_API_KEY"],
                ["Test endpoint", "POST /api/inbound/auth/verify"],
                ["Create lead endpoint", "POST /api/inbound/leads"],
              ].map(([label, value]) => (
                <div
                  className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-3"
                  key={label}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                    {label}
                  </p>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <code className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--ops-text)]">
                      {value}
                    </code>
                    <button
                      aria-label={`Copy ${label}`}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--ops-text-soft)] transition hover:bg-white hover:text-[var(--ops-text)]"
                      onClick={() => copyText(value)}
                      type="button"
                    >
                      <CopyKeyIcon className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-[var(--ops-border)] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                  Verify request
                </p>
                <button
                  aria-label="Copy verify request"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                  onClick={() => copyText(verifyCurlCommand)}
                  type="button"
                >
                  <CopyKeyIcon className="size-4" />
                </button>
              </div>
              <code className="mt-2 block overflow-x-auto whitespace-nowrap text-xs text-[var(--ops-text-soft)]">
                {verifyCurlCommand}
              </code>
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-[var(--ops-border)] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                  Example payload
                </p>
                <button
                  aria-label="Copy example payload"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                  onClick={() => copyText(sampleLeadPayload)}
                  type="button"
                >
                  <CopyKeyIcon className="size-4" />
                </button>
              </div>
              <code className="mt-2 block overflow-x-auto whitespace-pre text-xs leading-6 text-[var(--ops-text-soft)]">
                {sampleLeadPayload}
              </code>
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-[var(--ops-border)] bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                  Create lead request
                </p>
                <button
                  aria-label="Copy create lead request"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)]"
                  onClick={() => copyText(createLeadCurlCommand)}
                  type="button"
                >
                  <CopyKeyIcon className="size-4" />
                </button>
              </div>
              <code className="mt-2 block overflow-x-auto whitespace-nowrap text-xs text-[var(--ops-text-soft)]">
                {createLeadCurlCommand}
              </code>
            </div>
            <div className="mt-3 rounded-lg border border-dashed border-[var(--ops-border)] bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                n8n HTTP Request setup
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  ["Method", "POST"],
                  ["URL", createLeadUrl || "/api/inbound/leads"],
                  ["Authentication", "Header Auth"],
                  ["Header name", "Authorization"],
                  ["Header value", "Bearer YOUR_API_KEY"],
                  ["Body type", "JSON"],
                ].map(([label, value]) => (
                  <div
                    className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-3"
                    key={label}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                      {label}
                    </p>
                    <div className="mt-2 flex min-w-0 items-center gap-2">
                      <code className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--ops-text)]">
                        {value}
                      </code>
                      <button
                        aria-label={`Copy ${label}`}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--ops-text-soft)] transition hover:bg-white hover:text-[var(--ops-text)]"
                        onClick={() => copyText(value)}
                        type="button"
                      >
                        <CopyKeyIcon className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--ops-border)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-[var(--ops-text)]">API keys</h2>
            <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
              Metadata only. Raw keys are shown once after creation or rotation.
            </p>
          </div>
          <Button onClick={openCreateDialog} variant="secondary">
            Create key
          </Button>
        </div>

        {apiKeys.length === 0 ? (
          <div className="p-5">
            <EmptyState
              description="Create a key when an automation builder needs to call OpsPilot."
              title="No API keys yet"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--ops-border)] text-left text-sm">
              <thead className="bg-[var(--ops-card-soft)]">
                <tr>
                  {["Name", "Key", "Scopes", "Status", "Last used", "Created", "Actions"].map(
                    (heading) => (
                      <th
                        className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ops-text-muted)]"
                        key={heading}
                        scope="col"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ops-border)] bg-white">
                {apiKeys.map((apiKey) => (
                  <tr key={apiKey.id}>
                    <td className="px-4 py-3 font-semibold text-[var(--ops-text)]">
                      {apiKey.name}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded-md bg-[var(--ops-card-soft)] px-2 py-1 text-xs font-semibold text-[var(--ops-text-soft)]">
                        {keyLabel(apiKey)}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {apiKey.scopes.length === 0 ? (
                          <span className="text-xs text-[var(--ops-text-muted)]">
                            No scopes
                          </span>
                        ) : (
                          apiKey.scopes.map((scope) => (
                            <Badge key={scope} variant="info">
                              {scope}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(apiKey.status)}>
                        {apiKey.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[var(--ops-text-soft)]">
                      {formatLastUsedDate(apiKey.last_used_at)}
                    </td>
                    <td className="px-4 py-3 text-[var(--ops-text-soft)]">
                      {formatDate(apiKey.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          aria-label={`Rename ${apiKey.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--ops-border)] text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] disabled:opacity-50"
                          disabled={apiKey.status !== "active"}
                          onClick={() => openEditDialog(apiKey)}
                          type="button"
                        >
                          <PencilSimpleIcon aria-hidden="true" size={16} />
                        </button>
                        <button
                          aria-label={`Rotate ${apiKey.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--ops-border)] text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)] hover:text-[var(--ops-text)] disabled:opacity-50"
                          disabled={apiKey.status !== "active"}
                          onClick={() => rotateKey(apiKey)}
                          type="button"
                        >
                          <ArrowClockwiseIcon aria-hidden="true" size={16} />
                        </button>
                        <button
                          aria-label={`Revoke ${apiKey.name}`}
                          className="inline-flex size-8 items-center justify-center rounded-lg border border-[var(--ops-border)] text-[var(--ops-danger)] transition hover:bg-[var(--ops-danger-soft)] disabled:opacity-50"
                          disabled={apiKey.status !== "active"}
                          onClick={() => revokeKey(apiKey)}
                          type="button"
                        >
                          <TrashIcon aria-hidden="true" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4">
          <form
            className="w-full max-w-lg rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-2xl"
            onSubmit={submitDialog}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-[var(--ops-text)]">
                  {dialogMode === "edit" ? "Update API key" : "Create API key"}
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Choose a clear name and the scopes this automation tool needs.
                </p>
              </div>
              <button
                aria-label="Close dialog"
                className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--ops-text-soft)] transition hover:bg-[var(--ops-card-soft)]"
                onClick={() => setIsDialogOpen(false)}
                type="button"
              >
                <XIcon aria-hidden="true" size={17} />
              </button>
            </div>

            <div className="mt-4">
              <label
                className="text-sm font-medium text-[var(--ops-text)]"
                htmlFor="api-key-name"
              >
                Name
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                id="api-key-name"
                onChange={(event) => setFormName(event.target.value)}
                required
                value={formName}
              />
            </div>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-[var(--ops-text)]">
                Scopes
              </legend>
              <div className="mt-2 space-y-2">
                {workspaceApiKeyScopes.map((scope) => (
                  <label
                    className="flex items-start gap-3 rounded-lg border border-[var(--ops-border)] p-3"
                    key={scope}
                  >
                    <input
                      checked={formScopes.includes(scope)}
                      className="mt-1"
                      onChange={() => toggleScope(scope)}
                      type="checkbox"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-[var(--ops-text)]">
                        {workspaceApiKeyScopeLabels[scope]}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--ops-text-soft)]">
                        {scope === "lead:create"
                          ? "Allows inbound automation tools to create leads."
                          : "Allows future log-read endpoints to check this scope."}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error ? (
              <p className="mt-4 rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button
                disabled={isSaving}
                onClick={() => setIsDialogOpen(false)}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button disabled={isSaving} type="submit">
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {oneTimeKey ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-2xl">
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-[var(--ops-success-soft)] text-[var(--ops-success)]">
              <CheckCircleIcon aria-hidden="true" className="size-5" weight="fill" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-[var(--ops-text)]">
              Copy this key now
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--ops-text-soft)]">
              You will not be able to see it again after this window is closed.
            </p>
            <div className="mt-4">
              <label
                className="block text-sm font-medium text-[var(--ops-text)]"
                htmlFor="one-time-api-key"
              >
                {oneTimeKey.label}
              </label>
              <div className="relative mt-2">
                <input
                  className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] py-0 pl-3 pr-11 font-mono text-xs text-[var(--ops-text)]"
                  id="one-time-api-key"
                  readOnly
                  value={oneTimeKey.rawKey}
                />
                <button
                  aria-label="Copy API key"
                  className="absolute -right-2 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--ops-border)] bg-white text-[var(--workspace-primary,var(--ops-primary))] shadow-lg shadow-slate-950/10 transition hover:scale-105 hover:bg-[var(--ops-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
                  onClick={() => copyText(oneTimeKey.rawKey, "API key copied")}
                  title="Copy API key"
                  type="button"
                >
                  <CopyKeyIcon className="size-4" />
                </button>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button onClick={() => setOneTimeKey(null)} type="button">
                I saved this key
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
