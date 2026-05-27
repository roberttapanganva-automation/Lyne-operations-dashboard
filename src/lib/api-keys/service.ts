import "server-only";

import { generateWorkspaceApiKey } from "@/lib/api-keys/crypto";
import type { ApiKeyManagementAccess } from "@/lib/api-keys/access";
import type {
  WorkspaceApiKey,
  WorkspaceApiKeyCreateResult,
  WorkspaceApiKeyScope,
} from "@/types/domain";

const API_KEY_METADATA_SELECT =
  "id,workspace_id,name,key_prefix,key_suffix,scopes,status,created_by,created_at,updated_at,last_used_at,last_failed_at,revoked_at,revoked_by,expires_at";

type ReadyApiKeyManagementAccess = Extract<
  ApiKeyManagementAccess,
  { status: "ready" }
>;

function normalizeApiKey(row: WorkspaceApiKey): WorkspaceApiKey {
  return {
    ...row,
    scopes: row.scopes.filter((scope): scope is WorkspaceApiKeyScope =>
      scope === "lead:create" || scope === "automation_logs:read",
    ),
  };
}

async function logApiKeyAudit(
  access: ReadyApiKeyManagementAccess,
  action: string,
  apiKeyId: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await access.supabase.from("audit_logs").insert({
    action,
    actor_user_id: access.user.id,
    entity_id: apiKeyId,
    entity_type: "workspace_api_key",
    metadata,
    workspace_id: access.activeWorkspace.workspace.id,
  });

  if (error) {
    console.error("API key audit log failed", {
      action,
      apiKeyId,
      error: error.message,
    });
  }
}

export async function listWorkspaceApiKeys(
  access: ReadyApiKeyManagementAccess,
) {
  const { data, error } = await access.supabase
    .from("workspace_api_keys")
    .select(API_KEY_METADATA_SELECT)
    .eq("workspace_id", access.activeWorkspace.workspace.id)
    .order("created_at", { ascending: false })
    .returns<WorkspaceApiKey[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeApiKey);
}

export async function createWorkspaceApiKey({
  access,
  name,
  scopes,
}: {
  access: ReadyApiKeyManagementAccess;
  name: string;
  scopes: WorkspaceApiKeyScope[];
}): Promise<WorkspaceApiKeyCreateResult> {
  const generated = generateWorkspaceApiKey();
  const { data: apiKey, error: apiKeyError } = await access.supabase
    .from("workspace_api_keys")
    .insert({
      created_by: access.user.id,
      key_prefix: generated.keyPrefix,
      key_suffix: generated.keySuffix,
      name,
      scopes,
      workspace_id: access.activeWorkspace.workspace.id,
    })
    .select(API_KEY_METADATA_SELECT)
    .single<WorkspaceApiKey>();

  if (apiKeyError || !apiKey) {
    throw new Error(apiKeyError?.message ?? "API key could not be created.");
  }

  const { error: secretError } = await access.supabase
    .from("workspace_api_key_secrets")
    .insert({
      api_key_id: apiKey.id,
      key_hash: generated.keyHash,
    });

  if (secretError) {
    await access.supabase
      .from("workspace_api_keys")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: access.user.id,
        status: "revoked",
      })
      .eq("id", apiKey.id)
      .eq("workspace_id", access.activeWorkspace.workspace.id);

    throw new Error(secretError.message);
  }

  await logApiKeyAudit(access, "api_key.created", apiKey.id, {
    name,
    scopes,
  });

  return {
    apiKey: normalizeApiKey(apiKey),
    rawKey: generated.rawKey,
  };
}

export async function updateWorkspaceApiKey({
  access,
  keyId,
  name,
  scopes,
}: {
  access: ReadyApiKeyManagementAccess;
  keyId: string;
  name?: string;
  scopes?: WorkspaceApiKeyScope[];
}) {
  const updates: Partial<Pick<WorkspaceApiKey, "name" | "scopes">> = {};

  if (name !== undefined) {
    updates.name = name;
  }

  if (scopes !== undefined) {
    updates.scopes = scopes;
  }

  const { data, error } = await access.supabase
    .from("workspace_api_keys")
    .update(updates)
    .eq("id", keyId)
    .eq("workspace_id", access.activeWorkspace.workspace.id)
    .neq("status", "revoked")
    .select(API_KEY_METADATA_SELECT)
    .maybeSingle<WorkspaceApiKey>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  await logApiKeyAudit(access, "api_key.renamed", keyId, {
    name,
    scopes,
  });

  return normalizeApiKey(data);
}

export async function revokeWorkspaceApiKey({
  access,
  keyId,
}: {
  access: ReadyApiKeyManagementAccess;
  keyId: string;
}) {
  const { data, error } = await access.supabase
    .from("workspace_api_keys")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: access.user.id,
      status: "revoked",
    })
    .eq("id", keyId)
    .eq("workspace_id", access.activeWorkspace.workspace.id)
    .select(API_KEY_METADATA_SELECT)
    .maybeSingle<WorkspaceApiKey>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  await logApiKeyAudit(access, "api_key.revoked", keyId);

  return normalizeApiKey(data);
}

export async function rotateWorkspaceApiKey({
  access,
  keyId,
}: {
  access: ReadyApiKeyManagementAccess;
  keyId: string;
}): Promise<WorkspaceApiKeyCreateResult | null> {
  const { data: currentKey, error: currentKeyError } = await access.supabase
    .from("workspace_api_keys")
    .select(API_KEY_METADATA_SELECT)
    .eq("id", keyId)
    .eq("workspace_id", access.activeWorkspace.workspace.id)
    .eq("status", "active")
    .maybeSingle<WorkspaceApiKey>();

  if (currentKeyError) {
    throw new Error(currentKeyError.message);
  }

  if (!currentKey) {
    return null;
  }

  const revokedKey = await revokeWorkspaceApiKey({ access, keyId });

  if (!revokedKey) {
    return null;
  }

  const nextKey = await createWorkspaceApiKey({
    access,
    name: currentKey.name,
    scopes: normalizeApiKey(currentKey).scopes,
  });

  await logApiKeyAudit(access, "api_key.rotated", nextKey.apiKey.id, {
    rotated_from: keyId,
  });

  return nextKey;
}
