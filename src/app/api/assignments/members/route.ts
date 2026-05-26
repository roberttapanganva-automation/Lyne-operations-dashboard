import { NextResponse } from "next/server";
import { getAssignableMembersForActiveWorkspace } from "@/lib/assignments/queries";
import { canAssignOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { ApiResponse } from "@/types/api";
import type { AssignableWorkspaceMember } from "@/types/domain";

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to load assignment members.",
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
      activeWorkspace.status === "no-user" ? 401 : 403,
    );
  }

  if (!canAssignOperationalRecords(activeWorkspace.context.role)) {
    return jsonResponse(
      {
        error: {
          code: "ASSIGNMENT_MEMBERS_FORBIDDEN",
          message: "Your workspace role cannot load assignment controls.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const members = await getAssignableMembersForActiveWorkspace();

    return jsonResponse<AssignableWorkspaceMember[]>({
      data: members,
      ok: true,
    });
  } catch (error) {
    return jsonResponse(
      {
        error: {
          code: "ASSIGNMENT_MEMBERS_LOAD_FAILED",
          details: error instanceof Error ? error.message : undefined,
          message: "We could not load assignable members.",
        },
        ok: false,
      },
      500,
    );
  }
}
