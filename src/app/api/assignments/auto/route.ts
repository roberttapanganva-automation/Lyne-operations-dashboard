import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { autoAssignRecordRoundRobin } from "@/lib/assignments/engine";
import { canAssignOperationalRecords } from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { autoAssignSchema } from "@/lib/validation/assignments";
import type { ApiResponse } from "@/types/api";
import type { AssignmentResult } from "@/types/domain";

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to run auto-assignment.",
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
          code: "AUTO_ASSIGN_FORBIDDEN",
          message: "Your workspace role cannot run auto-assignment.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = autoAssignSchema.parse(await request.json());
    const result = await autoAssignRecordRoundRobin({
      recordId: payload.record_id,
      targetType: payload.entity_type,
    });

    return jsonResponse<AssignmentResult>(
      result.ok
        ? { data: result, ok: true }
        : {
            error: {
              code: "AUTO_ASSIGN_FAILED",
              message: result.error ?? "Auto-assignment failed.",
            },
            ok: false,
          },
      result.ok ? 200 : 500,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Send a valid record and entity type.",
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
          message: "We could not read the auto-assignment request.",
        },
        ok: false,
      },
      400,
    );
  }
}
