import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  getApiKeyAccessStatusCode,
  getApiKeyManagementAccess,
} from "@/lib/api-keys/access";
import { rotateWorkspaceApiKey } from "@/lib/api-keys/service";
import type { ApiResponse } from "@/types/api";
import type { WorkspaceApiKeyCreateResult } from "@/types/domain";

const keyIdSchema = z.uuid();

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ keyId: string }> },
) {
  const access = await getApiKeyManagementAccess();

  if (access.status !== "ready") {
    return jsonResponse<WorkspaceApiKeyCreateResult>(
      {
        error: access.error,
        ok: false,
      },
      getApiKeyAccessStatusCode(access.status),
    );
  }

  try {
    const { keyId } = await context.params;
    const parsedKeyId = keyIdSchema.parse(keyId);
    const result = await rotateWorkspaceApiKey({
      access,
      keyId: parsedKeyId,
    });

    if (!result) {
      return jsonResponse<WorkspaceApiKeyCreateResult>(
        {
          error: {
            code: "API_KEY_NOT_FOUND",
            message: "Active API key was not found for this workspace.",
          },
          ok: false,
        },
        404,
      );
    }

    return jsonResponse({
      data: result,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse<WorkspaceApiKeyCreateResult>(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Check the API key ID and try again.",
          },
          ok: false,
        },
        400,
      );
    }

    return jsonResponse<WorkspaceApiKeyCreateResult>(
      {
        error: {
          code: "API_KEY_ROTATE_FAILED",
          message:
            error instanceof Error ? error.message : "API key could not be rotated.",
        },
        ok: false,
      },
      500,
    );
  }
}
