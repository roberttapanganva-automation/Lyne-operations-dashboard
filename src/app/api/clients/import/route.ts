import { NextResponse } from "next/server";
import { revalidateClientPages } from "@/lib/cache/revalidate-app";
import { ZodError } from "zod";
import { createOrReuseClientInWorkspace } from "@/lib/clients/mutations";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import { canCreateOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { importClientRowSchema } from "@/lib/validation/clients";
import type { ApiResponse } from "@/types/api";

type ImportResult = {
  created: number;
  reused: number;
  results: Array<{
    id: string | null;
    message: string;
    row: number;
    status: "created" | "reused" | "error";
  }>;
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        error: { code: "UNAUTHORIZED", message: "Sign in to import contacts." },
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
          code: "CLIENT_IMPORT_FORBIDDEN",
          message: "Your workspace role cannot import contacts.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const body = (await request.json()) as { rows?: unknown[] };
    const rawRows = Array.isArray(body.rows) ? body.rows.slice(0, 200) : [];
    const workspaceId = activeWorkspace.context.workspace.id;
    const results: ImportResult["results"] = [];
    let created = 0;
    let reused = 0;

    if (rawRows.length === 0) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Add at least one contact row to import.",
          },
          ok: false,
        },
        400,
      );
    }

    for (const [index, rawRow] of rawRows.entries()) {
      try {
        const parsedRow = importClientRowSchema.safeParse(rawRow);

        if (!parsedRow.success) {
          results.push({
            id: null,
            message: parsedRow.error.issues[0]?.message ?? "Invalid contact row.",
            row: index + 2,
            status: "error",
          });
          continue;
        }

        const result = await createOrReuseClientInWorkspace({
          createdBy: user.id,
          draft: parsedRow.data,
          supabase,
          workspaceId,
        });

        if (!result.client) {
          results.push({
            id: null,
            message: "Contact name is required.",
            row: index + 2,
            status: "error",
          });
          continue;
        }

        if (result.wasCreated) {
          created += 1;
          await supabase.from("audit_logs").insert({
            action: "client.created",
            actor_user_id: user.id,
            entity_id: result.client.id,
            entity_type: "client",
            metadata: { name: result.client.name, source: "csv_import" },
            workspace_id: workspaceId,
          });
        } else {
          reused += 1;
        }

        results.push({
          id: result.client.id,
          message: result.wasCreated
            ? "Contact imported."
            : "Existing matching contact reused.",
          row: index + 2,
          status: result.wasCreated ? "created" : "reused",
        });
      } catch (error) {
        results.push({
          id: null,
          message:
            error instanceof Error
              ? error.message
              : "We could not import this contact.",
          row: index + 2,
          status: "error",
        });
      }
    }

    if (created > 0) {
      revalidateClientPages();
    }

    return jsonResponse({
      data: { created, reused, results },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Check the contacts CSV and try again.",
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
          message: "We could not read the contacts import payload.",
        },
        ok: false,
      },
      400,
    );
  }
}
