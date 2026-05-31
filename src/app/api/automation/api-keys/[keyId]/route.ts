import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import {
  getApiKeyAccessStatusCode,
  getApiKeyManagementAccess,
} from "@/lib/api-keys/access";
import {
  revokeWorkspaceApiKey,
  updateWorkspaceApiKey,
} from "@/lib/api-keys/service";
import { updateWorkspaceApiKeySchema } from "@/lib/validation/apiKeys";
import type { ApiResponse } from "@/types/api";
import type { WorkspaceApiKey } from "@/types/domain";

const keyIdSchema = z.uuid();

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ keyId: string }> },
) {
  const access = await getApiKeyManagementAccess();

  if (access.status !== "ready") {
    return jsonResponse<WorkspaceApiKey>(
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
    const payload = updateWorkspaceApiKeySchema.parse(await request.json());
    const apiKey = await updateWorkspaceApiKey({
      access,
      keyId: parsedKeyId,
      name: payload.name,
      scopes: payload.scopes,
    });

    if (!apiKey) {
      return jsonResponse<WorkspaceApiKey>(
        {
          error: {
            code: "API_KEY_NOT_FOUND",
            message: "API key was not found for this workspace.",
          },
          ok: false,
        },
        404,
      );
    }

    return jsonResponse({
      data: apiKey,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse<WorkspaceApiKey>(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: "Check the API key details and try again.",
          },
          ok: false,
        },
        400,
      );
    }

    return jsonResponse<WorkspaceApiKey>(
      {
        error: {
          code: "API_KEY_UPDATE_FAILED",
          message:
            error instanceof Error ? error.message : "API key could not be updated.",
        },
        ok: false,
      },
      500,
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ keyId: string }> },
) {
  const access = await getApiKeyManagementAccess();

  if (access.status !== "ready") {
    return jsonResponse<WorkspaceApiKey>(
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
    const apiKey = await revokeWorkspaceApiKey({
      access,
      keyId: parsedKeyId,
    });

    if (!apiKey) {
      return jsonResponse<WorkspaceApiKey>(
        {
          error: {
            code: "API_KEY_NOT_FOUND",
            message: "API key was not found for this workspace.",
          },
          ok: false,
        },
        404,
      );
    }

    return jsonResponse({
      data: apiKey,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse<WorkspaceApiKey>(
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

    return jsonResponse<WorkspaceApiKey>(
      {
        error: {
          code: "API_KEY_REVOKE_FAILED",
          message:
            error instanceof Error ? error.message : "API key could not be revoked.",
        },
        ok: false,
      },
      500,
    );
  }
}
