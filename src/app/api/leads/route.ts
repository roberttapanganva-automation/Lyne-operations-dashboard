import { after, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  createOrReuseClientInWorkspace,
  getClientByIdInWorkspace,
} from "@/lib/clients/mutations";
import { triggerAutomationForWorkspace } from "@/lib/n8n/client";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import { canCreateOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { createLeadSchema } from "@/lib/validation/leads";
import type { ApiResponse } from "@/types/api";

type LeadResponse = {
  clients: {
    company_name: string | null;
    email: string | null;
    id: string;
    name: string | null;
    phone: string | null;
    source: string | null;
  } | null;
  client_id: string | null;
  created_at: string;
  estimated_value: number | string;
  id: string;
  next_follow_up_at: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  source: string | null;
  stage_id: string | null;
  status: "open" | "won" | "lost";
  title: string;
};

type PipelineStageLookup = {
  entity_type: "lead" | "job";
  id: string;
  pipeline_group_id: string;
  workspace_id: string;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getStatusForWorkspaceResult(status: "no-user" | "no-workspace" | "error") {
  if (status === "no-user") {
    return 401;
  }

  if (status === "no-workspace") {
    return 403;
  }

  return 500;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to view leads.",
        },
        ok: false,
      },
      401,
    );
  }

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: "NO_ACTIVE_WORKSPACE",
          message:
            activeWorkspace.error ??
            "No active workspace is available for this account.",
        },
        ok: false,
      },
      getStatusForWorkspaceResult(activeWorkspace.status),
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id,client_id,title,source,estimated_value,priority,status,stage_id,next_follow_up_at,created_at,clients(id,name,email,phone,company_name,source)",
    )
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .order("created_at", { ascending: false })
    .returns<LeadResponse[]>();

  if (error) {
    return jsonResponse(
      {
        error: {
          code: "LEADS_LOAD_FAILED",
          message: "We could not load leads. Please try again.",
          details: error.message,
        },
        ok: false,
      },
      500,
    );
  }

  return jsonResponse({
    data: data ?? [],
    ok: true,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to create leads.",
        },
        ok: false,
      },
      401,
    );
  }

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: "NO_ACTIVE_WORKSPACE",
          message:
            activeWorkspace.error ??
            "No active workspace is available for this account.",
        },
        ok: false,
      },
      getStatusForWorkspaceResult(activeWorkspace.status),
    );
  }

  const rolePermission = await getEffectiveRolePermission({
    role: activeWorkspace.context.role,
    supabase,
    workspaceId: activeWorkspace.context.workspace.id,
  });

  if (
    !canCreateOperationalRecords(activeWorkspace.context.role) ||
    rolePermission?.can_create_leads === false
  ) {
    return jsonResponse(
      {
        error: {
          code: "LEAD_CREATE_FORBIDDEN",
          message: "Your workspace role cannot create leads.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = createLeadSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;
    let stageId: string | null = null;

    let clientId: string | null = null;

    if (payload.stage_id) {
      const { data: stage, error: stageError } = await supabase
        .from("pipeline_stages")
        .select("id,workspace_id,pipeline_group_id,entity_type")
        .eq("id", payload.stage_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle<PipelineStageLookup>();

      if (stageError || !stage || stage.entity_type !== "lead") {
        return jsonResponse(
          {
            error: {
              code: "LEAD_STAGE_INVALID",
              message: "The selected lead stage is not available in this workspace.",
              details: stageError?.message,
            },
            ok: false,
          },
          400,
        );
      }

      stageId = stage.id;
    }

    if (payload.client_id) {
      try {
        const linkedClient = await getClientByIdInWorkspace({
          clientId: payload.client_id,
          supabase,
          workspaceId,
        });

        if (!linkedClient) {
          return jsonResponse(
            {
              error: {
                code: "CLIENT_LINK_FAILED",
                message: "The selected contact is not available in this workspace.",
              },
              ok: false,
            },
            400,
          );
        }

        clientId = linkedClient.id;
      } catch (clientLookupError) {
        return jsonResponse(
          {
            error: {
              code: "CLIENT_LINK_FAILED",
              message: "We could not verify the selected contact.",
              details:
                clientLookupError instanceof Error
                  ? clientLookupError.message
                  : undefined,
            },
            ok: false,
          },
          400,
        );
      }
    } else if (payload.client_name || payload.client_email || payload.client_phone) {
      try {
        const result = await createOrReuseClientInWorkspace({
          createdBy: user.id,
          draft: {
            email: payload.client_email,
            name: payload.client_name,
            phone: payload.client_phone,
            source: payload.source,
          },
          supabase,
          workspaceId,
        });

        if (!result.client) {
          return jsonResponse(
            {
              error: {
                code: "CLIENT_CREATE_REQUIRES_NAME",
                message:
                  "Choose an existing contact or add a contact name to create a new one.",
              },
              ok: false,
            },
            400,
          );
        }

        clientId = result.client.id;
      } catch (clientError) {
        return jsonResponse(
          {
            error: {
              code: "CLIENT_CREATE_FAILED",
              message: "We could not create the lead contact. Please try again.",
              details: clientError instanceof Error ? clientError.message : undefined,
            },
            ok: false,
          },
          500,
        );
      }
    }

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        client_id: clientId,
        created_by: user.id,
        estimated_value: payload.estimated_value,
        next_follow_up_at: payload.next_follow_up_at ?? null,
        notes: payload.notes ?? null,
        priority: payload.priority,
        source: payload.source,
        stage_id: stageId,
        status: payload.status,
        title: payload.title,
        updated_by: user.id,
        workspace_id: workspaceId,
      })
      .select(
        "id,client_id,title,source,estimated_value,priority,status,stage_id,next_follow_up_at,created_at",
      )
      .single<LeadResponse>();

    if (leadError) {
      return jsonResponse(
        {
          error: {
            code: "LEAD_CREATE_FAILED",
            message: "We could not create the lead. Please try again.",
            details: leadError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "lead.created",
      actor_user_id: user.id,
      entity_id: lead.id,
      entity_type: "lead",
      metadata: {
        title: lead.title,
      },
      workspace_id: workspaceId,
    });

    after(() =>
      triggerAutomationForWorkspace({
        automationType: "new_lead_notification",
        payload: {
          estimated_value: lead.estimated_value,
          priority: lead.priority,
          source: lead.source,
          status: lead.status,
          title: lead.title,
        },
        relatedId: lead.id,
        relatedType: "lead",
        supabase,
        workspaceId,
      }),
    );

    return jsonResponse(
      {
        data: lead,
        ok: true,
      },
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the lead details and try again.",
            details: error.flatten().fieldErrors,
          },
          ok: false,
        },
        400,
      );
    }

    return jsonResponse(
      {
        error: {
          code: "BAD_REQUEST",
          message: "We could not read the lead details. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}
