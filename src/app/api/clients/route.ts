import { NextResponse } from "next/server";
import { revalidateClientPages } from "@/lib/cache/revalidate-app";
import { ZodError } from "zod";
import { getClientsForActiveWorkspace } from "@/lib/clients/queries";
import { createOrReuseClientInWorkspace } from "@/lib/clients/mutations";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import { canCreateOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { createClientSchema } from "@/lib/validation/clients";
import type { ApiResponse } from "@/types/api";

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
          message: "Sign in to view contacts.",
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

  try {
    const data = await getClientsForActiveWorkspace();

    return jsonResponse({
      data,
      ok: true,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: {
          code: "CLIENTS_LOAD_FAILED",
          message: "We could not load contacts. Please try again.",
          details: error instanceof Error ? error.message : undefined,
        },
        ok: false,
      },
      500,
    );
  }
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
          message: "Sign in to create contacts.",
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
          code: "CLIENT_CREATE_FORBIDDEN",
          message: "Your workspace role cannot create contacts.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = createClientSchema.parse(await request.json());
    const result = await createOrReuseClientInWorkspace({
      createdBy: user.id,
      draft: payload,
      supabase,
      workspaceId: activeWorkspace.context.workspace.id,
    });

    if (!result.client) {
      return jsonResponse(
        {
          error: {
            code: "CLIENT_CREATE_FAILED",
            message: "We could not create the contact. Please try again.",
          },
          ok: false,
        },
        400,
      );
    }

    if (result.wasCreated) {
      await supabase.from("audit_logs").insert({
        action: "client.created",
        actor_user_id: user.id,
        entity_id: result.client.id,
        entity_type: "client",
        metadata: {
          name: result.client.name,
        },
        workspace_id: activeWorkspace.context.workspace.id,
      });
    }

    revalidateClientPages();

    return jsonResponse(
      {
        data: result.client,
        ok: true,
      },
      result.wasCreated ? 201 : 200,
    );
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
          message: "We could not read the contact details. Please try again.",
          details: error instanceof Error ? error.message : undefined,
        },
        ok: false,
      },
      400,
    );
  }
}
