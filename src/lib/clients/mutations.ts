import { createClient } from "@/lib/supabase/server";
import type { Client } from "@/types/domain";

const clientSelect =
  "id,workspace_id,name,email,phone,company_name,address,notes,source,created_by,updated_by,created_at,updated_at";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type ClientDraft = {
  address?: string | null;
  company_name?: string | null;
  email?: string | null;
  name?: string | null;
  notes?: string | null;
  phone?: string | null;
  source?: string | null;
};

function toNullableTrimmed(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeClientEmail(value: string | null | undefined) {
  const trimmed = toNullableTrimmed(value);
  return trimmed ? trimmed.toLowerCase() : null;
}

export function normalizeClientPhone(value: string | null | undefined) {
  const trimmed = toNullableTrimmed(value);
  return trimmed ? trimmed.replace(/\s+/g, " ") : null;
}

export async function getClientByIdInWorkspace({
  clientId,
  supabase,
  workspaceId,
}: {
  clientId: string;
  supabase: ServerSupabaseClient;
  workspaceId: string;
}) {
  const { data, error } = await supabase
    .from("clients")
    .select(clientSelect)
    .eq("id", clientId)
    .eq("workspace_id", workspaceId)
    .maybeSingle<Client>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function findExistingClientInWorkspace({
  email,
  phone,
  supabase,
  workspaceId,
}: {
  email?: string | null;
  phone?: string | null;
  supabase: ServerSupabaseClient;
  workspaceId: string;
}) {
  const normalizedEmail = normalizeClientEmail(email);
  const normalizedPhone = normalizeClientPhone(phone);

  if (normalizedEmail) {
    const { data, error } = await supabase
      .from("clients")
      .select(clientSelect)
      .eq("workspace_id", workspaceId)
      .ilike("email", normalizedEmail)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Client>();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data;
    }
  }

  if (!normalizedEmail && normalizedPhone) {
    const { data, error } = await supabase
      .from("clients")
      .select(clientSelect)
      .eq("workspace_id", workspaceId)
      .eq("phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<Client>();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data;
    }
  }

  return null;
}

export async function createOrReuseClientInWorkspace({
  createdBy,
  draft,
  supabase,
  workspaceId,
}: {
  createdBy: string;
  draft: ClientDraft;
  supabase: ServerSupabaseClient;
  workspaceId: string;
}) {
  const existingClient = await findExistingClientInWorkspace({
    email: draft.email,
    phone: draft.phone,
    supabase,
    workspaceId,
  });

  if (existingClient) {
    return {
      client: existingClient,
      wasCreated: false,
    };
  }

  const name = toNullableTrimmed(draft.name);

  if (!name) {
    return {
      client: null,
      wasCreated: false,
    };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      address: toNullableTrimmed(draft.address),
      company_name: toNullableTrimmed(draft.company_name),
      created_by: createdBy,
      email: normalizeClientEmail(draft.email),
      name,
      notes: toNullableTrimmed(draft.notes),
      phone: normalizeClientPhone(draft.phone),
      source: toNullableTrimmed(draft.source),
      updated_by: createdBy,
      workspace_id: workspaceId,
    })
    .select(clientSelect)
    .single<Client>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    client: data,
    wasCreated: true,
  };
}
