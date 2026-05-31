import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getOwnerAccessContext, writeOwnerAuditLog } from "@/lib/owner/access";
import { defaultRolePermissions } from "@/lib/owner/queries";
import {
  buildRolePermissionWritePayload,
  listWorkspaceRolePermissionRecords,
} from "@/lib/permissions/rolePermissions";
import { getAssignableRoles } from "@/lib/permissions/workspace";
import { updateWorkspaceRolePermissionSchema } from "@/lib/validation/owner";
import type { ApiResponse } from "@/types/api";

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

async function ensurePermissions(
  access: Awaited<ReturnType<typeof getOwnerAccessContext>> & {
    status: "ready";
  },
) {
  const workspaceId = access.activeWorkspace.workspace.id;
  const { data, error, supportsAutomationsPermission } =
    await listWorkspaceRolePermissionRecords(access.supabase, workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  const existing = new Set((data ?? []).map((permission) => permission.role));
  const missing = getAssignableRoles()
    .filter((role) => !existing.has(role))
    .map((role) =>
      buildRolePermissionWritePayload(
        {
          ...defaultRolePermissions[role],
          workspace_id: workspaceId,
        },
        supportsAutomationsPermission,
      ),
    );

  if (missing.length > 0) {
    const { error: insertError } = await access.supabase
      .from("workspace_role_permissions")
      .insert(missing);

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  const { data: refreshed, error: refreshedError } =
    await listWorkspaceRolePermissionRecords(access.supabase, workspaceId);

  if (refreshedError) {
    throw new Error(refreshedError.message);
  }

  return refreshed ?? [];
}

export async function GET() {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: access.error.code,
          message: access.error.message,
        },
        ok: false,
      },
      access.error.status,
    );
  }

  try {
    return jsonResponse({ data: await ensurePermissions(access), ok: true });
  } catch (error) {
    return jsonResponse(
      {
        error: {
          code: "ACCESS_RULES_LOAD_FAILED",
          message: "We could not load access rules.",
          details: error instanceof Error ? error.message : undefined,
        },
        ok: false,
      },
      500,
    );
  }
}

export async function PATCH(request: Request) {
  const access = await getOwnerAccessContext();

  if (access.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: access.error.code,
          message: access.error.message,
        },
        ok: false,
      },
      access.error.status,
    );
  }

  try {
    const payload = updateWorkspaceRolePermissionSchema.parse(
      await request.json(),
    );
    const permissionState = await listWorkspaceRolePermissionRecords(
      access.supabase,
      access.activeWorkspace.workspace.id,
    );

    if (permissionState.error) {
      throw new Error(permissionState.error.message);
    }

    for (const permission of payload.permissions) {
      const { error } = await access.supabase
        .from("workspace_role_permissions")
        .upsert(
          buildRolePermissionWritePayload(
            {
              ...permission,
              workspace_id: access.activeWorkspace.workspace.id,
            },
            permissionState.supportsAutomationsPermission,
          ),
          { onConflict: "workspace_id,role" },
        );

      if (error) {
        throw new Error(error.message);
      }
    }

    await writeOwnerAuditLog({
      access,
      action: "workspace_role_permissions.updated",
      entityId: access.activeWorkspace.workspace.id,
      entityType: "workspace_role_permissions",
      metadata: {
        roles: payload.permissions.map((permission) => permission.role),
      },
    });

    return jsonResponse({ data: await ensurePermissions(access), ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the access rule details and try again.",
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
          code: "ACCESS_RULES_UPDATE_FAILED",
          message: "We could not update access rules.",
          details: error instanceof Error ? error.message : undefined,
        },
        ok: false,
      },
      500,
    );
  }
}
