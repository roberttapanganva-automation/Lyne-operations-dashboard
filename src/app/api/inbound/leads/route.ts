import { after } from "next/server";
import { ZodError } from "zod";
import {
  getBearerToken,
  markFailedWorkspaceApiKeyAttempt,
  recordInboundAutomationLog,
  verifyWorkspaceApiKey,
} from "@/lib/api-keys/verify";
import { hashWorkspaceApiKey } from "@/lib/api-keys/crypto";
import { enforceInboundRateLimit } from "@/lib/inbound/rate-limit";
import { getInboundRequestFingerprint, readInboundJsonBody } from "@/lib/inbound/request";
import { inboundError, inboundSuccess } from "@/lib/inbound/responses";
import { deliverAutomationWebhook } from "@/lib/n8n/client";
import { createClient } from "@/lib/supabase/server";
import { createInboundLeadSchema } from "@/lib/validation/leads";
import type { VerifiedWorkspaceApiKey } from "@/lib/api-keys/verify";

type InboundLeadCreateRow = {
  assigned_member_id: string | null;
  assignment_message: string | null;
  assignment_status: string | null;
  auto_created_task_id: string | null;
  lead_id: string;
  workspace_id: string;
};

type InboundLeadCreateResponse = {
  lead_id: string;
  status: "created";
};

const LEADS_ROUTE = "/api/inbound/leads";
const LEADS_BODY_MAX_BYTES = 12 * 1024;
const LEADS_FINGERPRINT_LIMIT = 15;
const LEADS_KEY_LIMIT = 45;
const LEADS_WINDOW_SECONDS = 60;

function buildSafeInboundPayloadSummary(payload: Record<string, unknown>) {
  return {
    automation_source: "api_key",
    estimated_value:
      typeof payload.estimated_value === "number" ? payload.estimated_value : null,
    has_email:
      typeof payload.email === "string" && payload.email.trim().length > 0,
    has_phone:
      typeof payload.phone === "string" && payload.phone.trim().length > 0,
    name_present:
      typeof payload.name === "string" && payload.name.trim().length > 0,
    preferred_date_present:
      typeof payload.preferred_date === "string" &&
      payload.preferred_date.trim().length > 0,
    source: typeof payload.source === "string" ? payload.source.trim() : null,
  };
}

export async function POST(request: Request) {
  try {
    const fingerprintResult = await enforceInboundRateLimit({
      identifierHash: getInboundRequestFingerprint(request, LEADS_ROUTE),
      identifierType: "fingerprint",
      limit: LEADS_FINGERPRINT_LIMIT,
      route: LEADS_ROUTE,
      windowSeconds: LEADS_WINDOW_SECONDS,
    });

    if (!fingerprintResult.allowed) {
      return inboundError(
        "rate_limited",
        "Too many requests. Please wait before trying again.",
        429,
      );
    }
  } catch {
    return inboundError(
      "server_error",
      "Inbound API security checks could not be completed.",
      500,
    );
  }

  const rawKey = getBearerToken(request);

  if (!rawKey) {
    return inboundError(
      "unauthorized",
      "Send Authorization: Bearer YOUR_API_KEY.",
      401,
    );
  }

  let verifiedKey: VerifiedWorkspaceApiKey | null = null;

  try {
    verifiedKey = await verifyWorkspaceApiKey(rawKey);
  } catch {
    return inboundError(
      "server_error",
      "API key could not be verified.",
      500,
    );
  }

  if (!verifiedKey) {
    await markFailedWorkspaceApiKeyAttempt(rawKey);

    return inboundError(
      "unauthorized",
      "API key could not be verified.",
      401,
    );
  }

  try {
    const apiKeyLimit = await enforceInboundRateLimit({
      identifierHash: hashWorkspaceApiKey(verifiedKey.apiKeyId),
      identifierType: "api_key",
      limit: LEADS_KEY_LIMIT,
      route: LEADS_ROUTE,
      windowSeconds: LEADS_WINDOW_SECONDS,
    });

    if (!apiKeyLimit.allowed) {
      return inboundError(
        "rate_limited",
        "Too many requests. Please wait before trying again.",
        429,
      );
    }
  } catch {
    return inboundError(
      "server_error",
      "Inbound API security checks could not be completed.",
      500,
    );
  }

  if (!verifiedKey.scopes.includes("lead:create")) {
    await markFailedWorkspaceApiKeyAttempt(rawKey);
    await recordInboundAutomationLog({
      automationType: "inbound.lead.create",
      errorMessage: "API key is missing the lead:create scope.",
      keyHash: verifiedKey.keyHash,
      message: "Inbound lead capture was rejected.",
      payload: {
        automation_source: "api_key",
        reason: "missing_scope",
      },
      status: "failed",
    });

    return inboundError(
      "forbidden",
      "API key is not allowed to create leads.",
      403,
    );
  }

  const bodyResult = await readInboundJsonBody<Record<string, unknown>>(request, {
    maxBytes: LEADS_BODY_MAX_BYTES,
  });

  if (!bodyResult.ok) {
    await recordInboundAutomationLog({
      automationType: "inbound.lead.create",
      errorMessage: bodyResult.message,
      keyHash: verifiedKey.keyHash,
      message: "Inbound lead capture was rejected.",
      payload: {
        automation_source: "api_key",
        reason: bodyResult.error,
      },
      status: "failed",
    });

    return inboundError(bodyResult.error, bodyResult.message, bodyResult.status);
  }

  const rawPayload = bodyResult.data;

  try {
    const payload = createInboundLeadSchema.parse(rawPayload);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_inbound_lead_with_api_key", {
      contact_email: payload.email ?? null,
      contact_name: payload.name,
      contact_phone: payload.phone ?? null,
      lead_estimated_value: payload.estimated_value,
      lead_next_follow_up_at: payload.preferred_date ?? null,
      lead_notes: payload.message ?? null,
      lead_source: payload.source,
      lead_title: payload.name,
      target_key_hash: verifiedKey.keyHash,
    });

    if (error) {
      await recordInboundAutomationLog({
        automationType: "inbound.lead.create",
        errorMessage: "The inbound lead could not be created.",
        keyHash: verifiedKey.keyHash,
        message: "Inbound lead capture failed during database creation.",
        payload: buildSafeInboundPayloadSummary(rawPayload),
        status: "failed",
      });

      return inboundError(
        "server_error",
        "The inbound lead could not be created.",
        500,
      );
    }

    const createdLead = ((data ?? []) as InboundLeadCreateRow[])[0];

    if (!createdLead) {
      await recordInboundAutomationLog({
        automationType: "inbound.lead.create",
        errorMessage: "API key is not allowed to create leads.",
        keyHash: verifiedKey.keyHash,
        message: "Inbound lead capture was rejected.",
        payload: {
          automation_source: "api_key",
          reason: "create_forbidden",
        },
        status: "failed",
      });

      return inboundError(
        "forbidden",
        "API key is not allowed to create leads.",
        403,
      );
    }

    after(async () => {
      const delivery = await deliverAutomationWebhook({
        automationType: "lead.created",
        payload: {
          assigned_member_id: createdLead.assigned_member_id,
          source: payload.source,
        },
        relatedId: createdLead.lead_id,
        relatedType: "lead",
        workspaceId: createdLead.workspace_id,
      });

      await recordInboundAutomationLog({
        automationType: "lead.created",
        errorMessage: delivery.errorMessage ?? null,
        keyHash: verifiedKey.keyHash,
        message: delivery.message,
        payload: {
          automation_source: "n8n",
          assigned_member_id: createdLead.assigned_member_id,
          auto_created_task_id: createdLead.auto_created_task_id,
          configured: delivery.configured,
          delivered: delivery.delivered,
        },
        relatedId: createdLead.lead_id,
        relatedType: "lead",
        status: delivery.status,
      });
    });

    return inboundSuccess<InboundLeadCreateResponse>(
      {
        lead_id: createdLead.lead_id,
        status: "created",
      },
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      await recordInboundAutomationLog({
        automationType: "inbound.lead.create",
        errorMessage: "Inbound lead payload failed validation.",
        keyHash: verifiedKey.keyHash,
        message: "Inbound lead capture was rejected.",
        payload: {
          ...buildSafeInboundPayloadSummary(rawPayload),
          invalid_fields: Array.from(
            new Set(
              error.issues.map((issue) =>
                issue.path.length > 0 ? String(issue.path[0]) : "payload",
              ),
            ),
          ),
        },
        status: "failed",
      });

      return inboundError(
        "validation_error",
        "Check the inbound lead payload and try again.",
        400,
      );
    }

    return inboundError(
      "bad_request",
      "We could not process the inbound lead payload.",
      400,
    );
  }
}
