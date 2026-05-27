import {
  getBearerToken,
  markFailedWorkspaceApiKeyAttempt,
  verifyWorkspaceApiKey,
} from "@/lib/api-keys/verify";
import { enforceInboundRateLimit } from "@/lib/inbound/rate-limit";
import { getInboundRequestFingerprint, readInboundJsonBody } from "@/lib/inbound/request";
import { inboundError, inboundSuccess } from "@/lib/inbound/responses";
import { hashWorkspaceApiKey } from "@/lib/api-keys/crypto";
import type { WorkspaceApiKeyVerificationResult } from "@/types/domain";

const VERIFY_ROUTE = "/api/inbound/auth/verify";
const VERIFY_BODY_MAX_BYTES = 2 * 1024;
const VERIFY_FINGERPRINT_LIMIT = 20;
const VERIFY_KEY_LIMIT = 60;
const VERIFY_WINDOW_SECONDS = 60;

export async function POST(request: Request) {
  try {
    const fingerprintResult = await enforceInboundRateLimit({
      identifierHash: getInboundRequestFingerprint(request, VERIFY_ROUTE),
      identifierType: "fingerprint",
      limit: VERIFY_FINGERPRINT_LIMIT,
      route: VERIFY_ROUTE,
      windowSeconds: VERIFY_WINDOW_SECONDS,
    });

    if (!fingerprintResult.allowed) {
      return inboundError(
        "rate_limited",
        "Too many requests. Please wait before trying again.",
        429,
      );
    }
  } catch {
    return inboundError(
      "server_error",
      "Inbound API security checks could not be completed.",
      500,
    );
  }

  const bodyResult = await readInboundJsonBody(request, {
    allowEmptyObject: true,
    maxBytes: VERIFY_BODY_MAX_BYTES,
  });

  if (!bodyResult.ok) {
    return inboundError(bodyResult.error, bodyResult.message, bodyResult.status);
  }

  const rawKey = getBearerToken(request);

  if (!rawKey) {
    return inboundError(
      "unauthorized",
      "Send Authorization: Bearer YOUR_API_KEY.",
      401,
    );
  }

  try {
    const verified = await verifyWorkspaceApiKey(rawKey);

    if (!verified) {
      await markFailedWorkspaceApiKeyAttempt(rawKey);

      return inboundError(
        "unauthorized",
        "API key could not be verified.",
        401,
      );
    }

    const apiKeyLimit = await enforceInboundRateLimit({
      identifierHash: hashWorkspaceApiKey(verified.apiKeyId),
      identifierType: "api_key",
      limit: VERIFY_KEY_LIMIT,
      route: VERIFY_ROUTE,
      windowSeconds: VERIFY_WINDOW_SECONDS,
    });

    if (!apiKeyLimit.allowed) {
      return inboundError(
        "rate_limited",
        "Too many requests. Please wait before trying again.",
        429,
      );
    }

    return inboundSuccess<WorkspaceApiKeyVerificationResult>({
      scopes: verified.scopes,
      workspaceName: verified.workspaceName,
    });
  } catch {
    return inboundError(
      "server_error",
      "API key could not be verified.",
      500,
    );
  }
}
