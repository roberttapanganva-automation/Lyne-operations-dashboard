import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getApiKeyManagementAccess,
  getApiKeyAccessStatusCode,
} from "@/lib/api-keys/access";
import {
  createWorkspaceApiKey,
  listWorkspaceApiKeys,
} from "@/lib/api-keys/service";
import { createWorkspaceApiKeySchema } from "@/lib/validation/apiKeys";
import type { ApiResponse } from "@/types/api";
import type {
  WorkspaceApiKey,
  WorkspaceApiKeyCreateResult,
} from "@/types/domain";

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function GET() {
  const access = await getApiKeyManagementAccess();

  if (access.status !== "ready") {
    return jsonResponse<WorkspaceApiKey[]>(
      {
        error: access.error,
        ok: false,
      },
      getApiKeyAccessStatusCode(access.status),
    );
  }

  try {
    const keys = await listWorkspaceApiKeys(access);

    return jsonResponse({
      data: keys,
      ok: true,
    });
  } catch (error) {
    return jsonResponse<WorkspaceApiKey[]>(
      {
        error: {
          code: "API_KEYS_LOAD_FAILED",
          message:
            error instanceof Error ? error.message : "API keys could not be loaded.",
        },
        ok: false,
      },
      500,
    );
  }
}

export async function POST(request: Request) {
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
    const payload = createWorkspaceApiKeySchema.parse(await request.json());
    const result = await createWorkspaceApiKey({
      access,
      name: payload.name,
      scopes: payload.scopes,
    });

    return jsonResponse(
      {
        data: result,
        ok: true,
      },
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse<WorkspaceApiKeyCreateResult>(
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

    return jsonResponse<WorkspaceApiKeyCreateResult>(
      {
        error: {
          code: "API_KEY_CREATE_FAILED",
          message:
            error instanceof Error ? error.message : "API key could not be created.",
        },
        ok: false,
      },
      500,
    );
  }
}
