import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { AutomationTriggerType } from "@/lib/validation/automations";
import { signN8nPayload } from "@/lib/n8n/signature";
import type { AutomationLogStatus } from "@/types/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type TriggerAutomationForWorkspaceArgs = {
  automationType: AutomationTriggerType;
  payload?: Record<string, unknown>;
  relatedId?: string | null;
  relatedType: string;
  supabase: SupabaseServerClient;
  workspaceId: string;
};

export type AutomationTriggerResult = {
  configured: boolean;
  delivered: boolean;
  errorMessage?: string | null;
  logId: string | null;
  message: string;
  status: AutomationLogStatus;
};

export type AutomationDeliveryResult = Omit<AutomationTriggerResult, "logId">;

type AutomationLogInsert = {
  automation_type: string;
  error_message?: string | null;
  message: string;
  payload: Record<string, unknown>;
  related_id: string | null;
  related_type: string;
  status: AutomationLogStatus;
  workspace_id: string;
};

class AutomationLogFinalizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationLogFinalizeError";
  }
}

export function isN8nConfigured() {
  return Boolean(
    process.env.N8N_WEBHOOK_BASE_URL?.trim() &&
      process.env.N8N_SIGNING_SECRET?.trim(),
  );
}

function getN8nConfig() {
  return {
    signingSecret: process.env.N8N_SIGNING_SECRET?.trim() ?? "",
    webhookUrl: process.env.N8N_WEBHOOK_BASE_URL?.trim() ?? "",
  };
}

async function insertAutomationLog(
  supabase: SupabaseServerClient,
  values: AutomationLogInsert,
) {
  const { data, error } = await supabase
    .from("automation_logs")
    .insert(values)
    .select("id")
    .single<{ id: string }>();

  if (error) {
    return { error, id: null };
  }

  return { error: null, id: data.id };
}

async function updateAutomationLog(
  supabase: SupabaseServerClient,
  logId: string | null,
  values: {
    error_message?: string | null;
    message: string;
    payload?: Record<string, unknown>;
    status: AutomationLogStatus;
  },
) {
  if (!logId) {
    throw new AutomationLogFinalizeError(
      "Automation run could not be finalized because no log row was created.",
    );
  }

  const { data, error } = await supabase
    .from("automation_logs")
    .update(values)
    .eq("id", logId)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    throw new AutomationLogFinalizeError(
      "Automation run could not be finalized in Supabase.",
    );
  }
}

function buildAutomationPayload(args: {
  automationType: AutomationTriggerType;
  payload: Record<string, unknown>;
  relatedId: string | null;
  relatedType: string;
  workspaceId: string;
}) {
  return {
    automation_type: args.automationType,
    automation_source: "system",
    event: args.automationType,
    payload: args.payload,
    related_id: args.relatedId,
    related_type: args.relatedType,
    triggered_at: new Date().toISOString(),
    workspace_id: args.workspaceId,
  };
}

async function buildN8nResponsePayload(response: Response) {
  const responseText = await response.text();

  let body: unknown = null;

  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = responseText;
    }
  }

  return {
    body,
    ok: response.ok,
    status: response.status,
    status_text: response.statusText,
  };
}

export async function deliverAutomationWebhook({
  automationType,
  payload = {},
  relatedId = null,
  relatedType,
  workspaceId,
}: Omit<TriggerAutomationForWorkspaceArgs, "supabase">): Promise<AutomationDeliveryResult> {
  const { signingSecret, webhookUrl } = getN8nConfig();
  const automationPayload = buildAutomationPayload({
    automationType,
    payload,
    relatedId,
    relatedType,
    workspaceId,
  });

  if (!webhookUrl || !signingSecret) {
    return {
      configured: false,
      delivered: false,
      errorMessage: null,
      message: "n8n webhook is not configured.",
      status: "skipped",
    };
  }

  try {
    const serializedPayload = JSON.stringify(automationPayload);
    const response = await fetch(webhookUrl, {
      body: serializedPayload,
      headers: {
        "content-type": "application/json",
        "x-opspilot-event": automationType,
        "x-opspilot-signature": signN8nPayload(
          serializedPayload,
          signingSecret,
        ),
        "x-opspilot-workspace-id": workspaceId,
      },
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });
    const responsePayload = await buildN8nResponsePayload(response);

    if (!response.ok) {
      return {
        configured: true,
        delivered: false,
        errorMessage: getN8nErrorMessage(responsePayload),
        message: "n8n automation failed.",
        status: "failed",
      };
    }

    return {
      configured: true,
      delivered: true,
      errorMessage: null,
      message: "n8n automation completed.",
      status: "success",
    };
  } catch (error) {
    return {
      configured: true,
      delivered: false,
      errorMessage:
        error instanceof Error ? error.message : "n8n webhook request failed.",
      message: "n8n automation failed.",
      status: "failed",
    };
  }
}

function getN8nErrorMessage(
  responsePayload: Awaited<ReturnType<typeof buildN8nResponsePayload>>,
) {
  if (responsePayload.body && typeof responsePayload.body === "object") {
    const message =
      "message" in responsePayload.body &&
      typeof responsePayload.body.message === "string"
        ? responsePayload.body.message
        : null;
    const hint =
      "hint" in responsePayload.body &&
      typeof responsePayload.body.hint === "string"
        ? responsePayload.body.hint
        : null;

    const details = [message, hint].filter(Boolean).join(" ");

    if (details) {
      return details;
    }
  }

  return `n8n webhook returned ${responsePayload.status}.`;
}

export async function triggerAutomationForWorkspace({
  automationType,
  payload = {},
  relatedId = null,
  relatedType,
  supabase,
  workspaceId,
}: TriggerAutomationForWorkspaceArgs): Promise<AutomationTriggerResult> {
  const automationPayload = buildAutomationPayload({
    automationType,
    payload,
    relatedId,
    relatedType,
    workspaceId,
  });

  if (!isN8nConfigured()) {
    const message = "n8n webhook is not configured.";
    const { id } = await insertAutomationLog(supabase, {
      automation_type: automationType,
      message,
      payload: automationPayload,
      related_id: relatedId,
      related_type: relatedType,
      status: "skipped",
      workspace_id: workspaceId,
    });

    return {
      configured: false,
      delivered: false,
      errorMessage: null,
      logId: id,
      message,
      status: "skipped",
    };
  }

  const pendingLog = await insertAutomationLog(supabase, {
    automation_type: automationType,
    message: "Automation event queued for n8n.",
    payload: automationPayload,
    related_id: relatedId,
    related_type: relatedType,
    status: "pending",
    workspace_id: workspaceId,
  });

  let delivered = false;
  let errorMessage: string | null = null;
  let message = "n8n automation failed.";
  let status: AutomationLogStatus = "failed";

  const delivery = await deliverAutomationWebhook({
    automationType,
    payload,
    relatedId,
    relatedType,
    workspaceId,
  });
  delivered = delivery.delivered;
  errorMessage = delivery.errorMessage ?? null;
  message = delivery.message;
  status = delivery.status;

  await updateAutomationLog(supabase, pendingLog.id, {
    error_message: errorMessage,
    message,
    payload: automationPayload,
    status,
  });

  return {
    configured: true,
    delivered,
    errorMessage,
    logId: pendingLog.id,
    message,
    status,
  };
}
