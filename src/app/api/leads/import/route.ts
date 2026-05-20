import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createOrReuseClientInWorkspace } from "@/lib/clients/mutations";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import { canCreateOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { importLeadRowSchema } from "@/lib/validation/leads";
import type { ApiResponse } from "@/types/api";

type ImportResult = {
  created: number;
  results: Array<{
    id: string | null;
    message: string;
    row: number;
    status: "created" | "error";
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
        error: { code: "UNAUTHORIZED", message: "Sign in to import leads." },
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
          code: "LEAD_IMPORT_FORBIDDEN",
          message: "Your workspace role cannot import leads.",
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

    if (rawRows.length === 0) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Add at least one lead row to import.",
          },
          ok: false,
        },
        400,
      );
    }

    for (const [index, rawRow] of rawRows.entries()) {
      try {
        const parsedRow = importLeadRowSchema.safeParse(rawRow);

        if (!parsedRow.success) {
          results.push({
            id: null,
            message: parsedRow.error.issues[0]?.message ?? "Invalid lead row.",
            row: index + 2,
            status: "error",
          });
          continue;
        }

        const row = parsedRow.data;
        let clientId: string | null = null;

        if (row.contact_name || row.email || row.phone) {
          const contactResult = await createOrReuseClientInWorkspace({
            createdBy: user.id,
            draft: {
              email: row.email,
              name: row.contact_name,
              phone: row.phone,
              source: row.source,
            },
            supabase,
            workspaceId,
          });

          clientId = contactResult.client?.id ?? null;
        }

        const { data: lead, error: leadError } = await supabase
          .from("leads")
          .insert({
            client_id: clientId,
            created_by: user.id,
            estimated_value: row.estimated_value,
            next_follow_up_at: row.next_follow_up_at ?? null,
            notes: row.notes ?? null,
            priority: row.priority,
            source: row.source,
            status: row.status,
            title: row.title,
            updated_by: user.id,
            workspace_id: workspaceId,
          })
          .select("id,title")
          .single<{ id: string; title: string }>();

        if (leadError) {
          results.push({
            id: null,
            message: leadError.message,
            row: index + 2,
            status: "error",
          });
          continue;
        }

        created += 1;
        await supabase.from("audit_logs").insert({
          action: "lead.created",
          actor_user_id: user.id,
          entity_id: lead.id,
          entity_type: "lead",
          metadata: { source: "csv_import", title: lead.title },
          workspace_id: workspaceId,
        });

        results.push({
          id: lead.id,
          message: "Lead imported.",
          row: index + 2,
          status: "created",
        });
      } catch (error) {
        results.push({
          id: null,
          message:
            error instanceof Error ? error.message : "We could not import this lead.",
          row: index + 2,
          status: "error",
        });
      }
    }

    return jsonResponse({
      data: { created, results },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Check the leads CSV and try again.",
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
          message: "We could not read the leads import payload.",
        },
        ok: false,
      },
      400,
    );
  }
}
