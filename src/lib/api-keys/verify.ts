import "server-only";

import { hashWorkspaceApiKey } from "@/lib/api-keys/crypto";
import { createClient } from "@/lib/supabase/server";
import type { WorkspaceApiKeyScope } from "@/types/domain";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type VerifyApiKeyRow = {
  api_key_id: string;
  scopes: WorkspaceApiKeyScope[];
  status: "active";
  workspace_id: string;
  workspace_name: string;
};

type RecordInboundAutomationLogArgs = {
  automationType: string;
  errorMessage?: string | null;
  keyHash: string;
  message: string;
  payload?: Record<string, unknown>;
  relatedId?: string | null;
  relatedType?: string;
  status: "success" | "failed" | "pending" | "skipped" | "retrying";
  supabase?: SupabaseServerClient;
};

export type VerifiedWorkspaceApiKey = {
  apiKeyId: string;
  keyHash: string;
  scopes: WorkspaceApiKeyScope[];
  workspaceId: string;
  workspaceName: string;
};

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }

  return token.trim();
}

export async function verifyWorkspaceApiKey(rawKey: string) {
  const supabase = await createClient();
  const keyHash = hashWorkspaceApiKey(rawKey);
  const { data, error } = await supabase.rpc("verify_workspace_api_key_by_hash", {
    target_key_hash: keyHash,
  });

  if (error) {
    throw new Error(error.message);
  }

  const verified = ((data ?? []) as VerifyApiKeyRow[])[0];

  if (!verified) {
    return null;
  }

  return {
    apiKeyId: verified.api_key_id,
    keyHash,
    scopes: verified.scopes,
    workspaceId: verified.workspace_id,
    workspaceName: verified.workspace_name,
  } satisfies VerifiedWorkspaceApiKey;
}

export async function markFailedWorkspaceApiKeyAttempt(rawKey: string) {
  const supabase = await createClient();

  try {
    await supabase.rpc("mark_workspace_api_key_failed_by_hash", {
      target_key_hash: hashWorkspaceApiKey(rawKey),
    });
  } catch {
    return null;
  }

  return true;
}

export async function recordInboundAutomationLog({
  automationType,
  errorMessage = null,
  keyHash,
  message,
  payload = {},
  relatedId = null,
  relatedType = "lead",
  status,
  supabase,
}: RecordInboundAutomationLogArgs) {
  const client = supabase ?? (await createClient());

  try {
    await client.rpc("record_inbound_automation_log_by_key", {
      automation_error_message: errorMessage,
      automation_message: message,
      automation_payload: payload,
      automation_status: status,
      automation_type: automationType,
      related_id: relatedId,
      related_type: relatedType,
      target_key_hash: keyHash,
    });
  } catch {
    return null;
  }

  return true;
}
