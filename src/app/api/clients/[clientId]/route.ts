import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { canEditOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { updateClientSchema } from "@/lib/validation/clients";
import type { ApiResponse } from "@/types/api";
import type { Client } from "@/types/domain";

type RouteContext = {
  params: Promise<{
    clientId: string;
  }>;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getStatusForWorkspaceResult(
  status: "no-user" | "no-workspace" | "error",
) {
  if (status === "no-user") {
    return 401;
  }

  if (status === "no-workspace") {
    return 403;
  }

  return 500;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { clientId } = await context.params;
  const clientIdResult = z.uuid().safeParse(clientId);

  if (!clientIdResult.success) {
    return jsonResponse(
      {
        error: {
          code: "INVALID_CLIENT_ID",
          message: "The selected contact is not valid.",
        },
        ok: false,
      },
      400,
    );
  }

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
          message: "Sign in to update contacts.",
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

  if (!canEditOperationalRecords(activeWorkspace.context.role)) {
    return jsonResponse(
      {
        error: {
          code: "CLIENT_UPDATE_FORBIDDEN",
          message: "Your workspace role cannot update contacts.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = updateClientSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;

    const { data: currentClient, error: currentClientError } = await supabase
      .from("clients")
      .select("id")
      .eq("id", clientIdResult.data)
      .eq("workspace_id", workspaceId)
      .single<{ id: string }>();

    if (currentClientError || !currentClient) {
      return jsonResponse(
        {
          error: {
            code: "CLIENT_NOT_FOUND",
            message: "This contact is not available in the active workspace.",
            details: currentClientError?.message,
          },
          ok: false,
        },
        404,
      );
    }

    if (payload.email) {
      const { data: duplicateClient, error: duplicateError } = await supabase
        .from("clients")
        .select("id,name")
        .eq("workspace_id", workspaceId)
        .eq("email", payload.email)
        .neq("id", clientIdResult.data)
        .maybeSingle<{ id: string; name: string }>();

      if (duplicateError) {
        return jsonResponse(
          {
            error: {
              code: "CLIENT_DUPLICATE_CHECK_FAILED",
              message: "We could not check for duplicate contacts.",
              details: duplicateError.message,
            },
            ok: false,
          },
          500,
        );
      }

      if (duplicateClient) {
        return jsonResponse(
          {
            error: {
              code: "CLIENT_EMAIL_EXISTS",
              message: `A contact with this email already exists: ${duplicateClient.name}.`,
            },
            ok: false,
          },
          409,
        );
      }
    }

    const { data: client, error: updateError } = await supabase
      .from("clients")
      .update({
        address: payload.address ?? null,
        company_name: payload.company_name ?? null,
        email: payload.email ?? null,
        name: payload.name,
        notes: payload.notes ?? null,
        phone: payload.phone ?? null,
        source: payload.source ?? null,
        updated_by: user.id,
      })
      .eq("id", clientIdResult.data)
      .eq("workspace_id", workspaceId)
      .select(
        "id,workspace_id,name,email,phone,company_name,address,source,notes,created_at,updated_at,created_by,updated_by",
      )
      .single<Client>();

    if (updateError) {
      return jsonResponse(
        {
          error: {
            code: "CLIENT_UPDATE_FAILED",
            message: "We could not update the contact. Please try again.",
            details: updateError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "client.updated",
      actor_user_id: user.id,
      entity_id: client.id,
      entity_type: "client",
      metadata: {
        name: client.name,
      },
      workspace_id: workspaceId,
    });

    return jsonResponse({
      data: client,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the contact details and try again.",
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
          message: "We could not read the contact update. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}
