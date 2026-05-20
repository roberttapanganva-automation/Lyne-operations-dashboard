import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { canDeleteOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { bulkClientActionSchema } from "@/lib/validation/clients";
import type { ApiResponse } from "@/types/api";

type BulkDeletedClient = {
  id: string;
  name: string;
};

type LinkedRecordRow = {
  client_id: string | null;
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

function hasLinkedClient(rows: LinkedRecordRow[] | null) {
  return (rows ?? []).some((row) => Boolean(row.client_id));
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
          message: "Sign in to delete contacts.",
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

  if (!canDeleteOperationalRecords(activeWorkspace.context.role)) {
    return jsonResponse(
      {
        error: {
          code: "CLIENT_BULK_DELETE_FORBIDDEN",
          message: "Your workspace role cannot delete contacts.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = bulkClientActionSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;
    const ids = [...new Set(payload.ids)];
    const { data: availableClients, error: availableError } = await supabase
      .from("clients")
      .select("id,name")
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .returns<BulkDeletedClient[]>();

    if (availableError) {
      return jsonResponse(
        {
          error: {
            code: "CLIENT_BULK_LOOKUP_FAILED",
            message: "We could not verify the selected contacts.",
            details: availableError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if ((availableClients ?? []).length !== ids.length) {
      return jsonResponse(
        {
          error: {
            code: "CLIENT_BULK_SCOPE_MISMATCH",
            message: "Some selected contacts are not available in this workspace.",
          },
          ok: false,
        },
        400,
      );
    }

    const [{ data: linkedLeads, error: linkedLeadsError }, { data: linkedJobs, error: linkedJobsError }, { data: linkedAppointments, error: linkedAppointmentsError }] =
      await Promise.all([
        supabase
          .from("leads")
          .select("client_id")
          .eq("workspace_id", workspaceId)
          .in("client_id", ids)
          .limit(1)
          .returns<LinkedRecordRow[]>(),
        supabase
          .from("jobs")
          .select("client_id")
          .eq("workspace_id", workspaceId)
          .in("client_id", ids)
          .limit(1)
          .returns<LinkedRecordRow[]>(),
        supabase
          .from("appointments")
          .select("client_id")
          .eq("workspace_id", workspaceId)
          .in("client_id", ids)
          .limit(1)
          .returns<LinkedRecordRow[]>(),
      ]);

    const linkError =
      linkedLeadsError ?? linkedJobsError ?? linkedAppointmentsError;

    if (linkError) {
      return jsonResponse(
        {
          error: {
            code: "CLIENT_LINK_CHECK_FAILED",
            message: "We could not verify whether these contacts are linked.",
            details: linkError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if (
      hasLinkedClient(linkedLeads) ||
      hasLinkedClient(linkedJobs) ||
      hasLinkedClient(linkedAppointments)
    ) {
      return jsonResponse(
        {
          error: {
            code: "CLIENT_HAS_LINKED_RECORDS",
            message:
              "This contact is linked to existing leads or jobs. Remove or reassign those records before deleting.",
          },
          ok: false,
        },
        409,
      );
    }

    const { data: deletedClients, error: deleteError } = await supabase
      .from("clients")
      .delete()
      .eq("workspace_id", workspaceId)
      .in("id", ids)
      .select("id,name")
      .returns<BulkDeletedClient[]>();

    if (deleteError) {
      return jsonResponse(
        {
          error: {
            code: "CLIENT_BULK_DELETE_FAILED",
            message: "We could not delete the selected contacts. Please try again.",
            details: deleteError.message,
          },
          ok: false,
        },
        500,
      );
    }

    const deleted = deletedClients ?? [];

    if (deleted.length > 0) {
      await supabase.from("audit_logs").insert(
        deleted.map((client) => ({
          action: "client.deleted",
          actor_user_id: user.id,
          entity_id: client.id,
          entity_type: "client",
          metadata: {
            name: client.name,
          },
          workspace_id: workspaceId,
        })),
      );
    }

    return jsonResponse({
      data: {
        deleted,
        deletedCount: deleted.length,
      },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Choose at least one valid contact.",
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
          message: "We could not read the bulk contact request. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}
