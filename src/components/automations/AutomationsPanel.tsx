"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  ExclamationMarkIcon,
  LightningIcon,
  PaperPlaneTiltIcon,
  PlugsConnectedIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { AutomationRunDetailsDialog } from "@/components/automations/AutomationRunDetailsDialog";
import { AutomationStatusBadge } from "@/components/automations/AutomationStatusBadge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { AutomationLog, AutomationLogStatus } from "@/types/domain";

type AutomationFilter = "all" | "success" | "failed" | "pending";

type AutomationsPanelProps = {
  isN8nConfigured: boolean;
  logs: AutomationLog[];
};

type TriggerResponse = {
  configured: boolean;
  delivered: boolean;
  errorMessage?: string | null;
  logId: string | null;
  message: string;
  status: AutomationLogStatus;
};

const filterOptions: Array<{ key: AutomationFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "success", label: "Success" },
  { key: "failed", label: "Failed" },
  { key: "pending", label: "Pending / skipped" },
];

const pendingStatuses: AutomationLogStatus[] = ["pending", "skipped", "retrying"];

function formatEventName(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelatedType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getFilteredLogs(logs: AutomationLog[], filter: AutomationFilter) {
  if (filter === "all") {
    return logs;
  }

  if (filter === "pending") {
    return logs.filter((log) => pendingStatuses.includes(log.status));
  }

  return logs.filter((log) => log.status === filter);
}

function getSummary(logs: AutomationLog[]) {
  return {
    failed: logs.filter((log) => log.status === "failed").length,
    pending: logs.filter((log) => pendingStatuses.includes(log.status)).length,
    success: logs.filter((log) => log.status === "success").length,
    total: logs.length,
  };
}

function getLastTestLog(logs: AutomationLog[]) {
  return logs.find((log) => log.automation_type === "test_connection") ?? null;
}

export function AutomationsPanel({ isN8nConfigured, logs }: AutomationsPanelProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<AutomationFilter>("all");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AutomationLog | null>(null);

  const filteredLogs = useMemo(() => getFilteredLogs(logs, filter), [filter, logs]);
  const summary = useMemo(() => getSummary(logs), [logs]);
  const lastTestLog = useMemo(() => getLastTestLog(logs), [logs]);

  async function sendTestEvent() {
    setError(null);
    setFeedback(null);
    setIsSending(true);

    try {
      const request = (async () => {
        const response = await fetch("/api/automations/trigger", {
          body: JSON.stringify({
            automation_type: "test_connection",
            payload: {
              source: "automations_page",
            },
            related_type: "workspace",
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        });

        const result = (await response.json()) as ApiResponse<TriggerResponse>;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.ok
              ? "The test event could not be sent."
              : result.error.message,
          );
        }

        if (!result.data.configured) {
          throw new Error(
            "n8n is not configured. Add N8N_WEBHOOK_BASE_URL and N8N_SIGNING_SECRET to enable delivery.",
          );
        }

        if (!result.data.delivered) {
          throw new Error(result.data.errorMessage ?? result.data.message);
        }

        return result.data;
      })();

      notify.promise(request, {
        error: "Automation failed",
        loading: "Sending test event...",
        success: "Test event sent",
        description: {
          error: (error) =>
            error instanceof Error ? error.message : "The test event could not be sent.",
          loading: "OpsPilot is handing this event to n8n.",
          success: "n8n received the automation event.",
        },
      });

      const data = await request;
      setFeedback(data.message);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "The test event could not be sent.";
      setError(message);
    } finally {
      router.refresh();
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 py-1 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-info-soft)] text-[var(--ops-info)]">
              <PlugsConnectedIcon className="size-5" weight="duotone" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--ops-text)]">
                  n8n connection
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isN8nConfigured
                      ? "bg-[var(--ops-success-soft)] text-[var(--ops-success)]"
                      : "bg-[var(--ops-warning-soft)] text-[var(--ops-warning)]"
                  }`}
                >
                  {isN8nConfigured ? (
                    <CheckCircleIcon className="size-3.5" weight="fill" />
                  ) : (
                    <WarningCircleIcon className="size-3.5" weight="fill" />
                  )}
                  {isN8nConfigured ? "Configured" : "Not configured"}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
                {isN8nConfigured
                  ? "Webhook bridge is ready for server-side delivery."
                  : "Add N8N_WEBHOOK_BASE_URL and N8N_SIGNING_SECRET to enable delivery."}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {feedback ? (
                  <span className="text-xs font-medium text-[var(--ops-success)]">
                    {feedback}
                  </span>
                ) : null}
                {error ? (
                  <span className="text-xs font-medium text-[var(--ops-danger)]">
                    {error}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 xl:justify-end">
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--workspace-primary,var(--ops-primary))] px-4 text-sm font-semibold text-white shadow-lg shadow-[var(--workspace-primary-glow,var(--ops-primary-glow))] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSending}
            onClick={sendTestEvent}
            type="button"
          >
            {isSending ? (
              <ArrowClockwiseIcon className="size-4 animate-spin" />
            ) : (
              <PaperPlaneTiltIcon className="size-4" weight="bold" />
            )}
            {isSending ? "Sending..." : "Send test event"}
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            icon: ClockCounterClockwiseIcon,
            label: "Total Runs",
            tone: "text-[var(--ops-text)]",
            value: summary.total,
          },
          {
            icon: CheckCircleIcon,
            label: "Success",
            tone: "text-[var(--ops-success)]",
            value: summary.success,
          },
          {
            icon: WarningCircleIcon,
            label: "Failed",
            tone: "text-[var(--ops-danger)]",
            value: summary.failed,
          },
          {
            icon: ExclamationMarkIcon,
            label: "Pending",
            tone: "text-[var(--ops-warning)]",
            value: summary.pending,
          },
        ].map((item) => (
          <Card className="p-4" key={item.label}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                  {item.label}
                </p>
                <p className="mt-3 text-2xl font-semibold text-[var(--ops-text)]">
                  {item.value}
                </p>
              </div>
              <span className={`inline-flex size-10 items-center justify-center rounded-lg bg-[var(--ops-card-soft)] ${item.tone}`}>
                <item.icon className="size-5" weight="duotone" />
              </span>
            </div>
          </Card>
        ))}
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                Last Test
              </p>
              <p className="mt-3 truncate text-sm font-semibold text-[var(--ops-text)]">
                {lastTestLog ? formatDateTime(lastTestLog.created_at) : "No tests yet"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--ops-text-muted)]">
                  Last result
                </span>
                {lastTestLog ? (
                  <AutomationStatusBadge status={lastTestLog.status} />
                ) : (
                  <span className="inline-flex items-center rounded-full bg-[var(--ops-card-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ops-text-soft)]">
                    Not run
                  </span>
                )}
              </div>
            </div>
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--ops-card-soft)] text-[var(--ops-info)]">
              <PlugsConnectedIcon className="size-5" weight="duotone" />
            </span>
          </div>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--ops-border)] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--ops-text)]">
                Automation runs
              </h2>
              <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                Real workflow delivery history for this workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold transition ${
                    filter === option.key
                      ? "bg-[var(--workspace-primary,var(--ops-primary))] text-white shadow-sm"
                      : "border border-[var(--ops-border)] bg-[var(--ops-card)] text-[var(--ops-text-soft)] hover:text-[var(--ops-text)]"
                  }`}
                  key={option.key}
                  onClick={() => setFilter(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5">
          {logs.length === 0 ? (
            <EmptyState
              description="No automation runs yet. Create a lead or send a test event to start tracking automation activity."
              title="No automation runs yet"
            />
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              description="Try a different status filter to review the rest of the automation history."
              title="No runs match this filter"
            />
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <button
                  className="block w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4 text-left transition hover:border-[var(--workspace-primary,var(--ops-primary))] hover:bg-white"
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  type="button"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-sm font-semibold text-[var(--ops-text)]">
                          {formatEventName(log.automation_type)}
                        </h3>
                        <AutomationStatusBadge status={log.status} />
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[var(--ops-text-soft)]">
                          <LightningIcon className="size-3.5" weight="duotone" />
                          {formatRelatedType(log.related_type)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
                        {log.message}
                      </p>
                      {log.error_message ? (
                        <p className="mt-2 text-xs font-medium text-[var(--ops-danger)]">
                          {log.error_message}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-left md:text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                        Created
                      </p>
                      <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                        {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <AutomationRunDetailsDialog
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
        open={Boolean(selectedLog)}
      />
    </div>
  );
}
