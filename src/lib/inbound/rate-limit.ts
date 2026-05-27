import "server-only";

import { createClient } from "@/lib/supabase/server";

type RateLimitIdentifierType = "api_key" | "fingerprint";

type EnforceInboundRateLimitArgs = {
  identifierHash: string;
  identifierType: RateLimitIdentifierType;
  limit: number;
  route: string;
  windowSeconds: number;
};

type RateLimitResultRow = {
  allowed: boolean;
  request_count: number;
  reset_at: string;
  retry_after_seconds: number;
};

export async function enforceInboundRateLimit({
  identifierHash,
  identifierType,
  limit,
  route,
  windowSeconds,
}: EnforceInboundRateLimitArgs) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_inbound_api_rate_limit", {
    target_identifier_hash: identifierHash,
    target_identifier_type: identifierType,
    target_limit: limit,
    target_route: route,
    target_window_seconds: windowSeconds,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = ((data ?? []) as RateLimitResultRow[])[0];

  return {
    allowed: result?.allowed ?? false,
    requestCount: result?.request_count ?? 0,
    resetAt: result?.reset_at ?? null,
    retryAfterSeconds: result?.retry_after_seconds ?? windowSeconds,
  };
}
