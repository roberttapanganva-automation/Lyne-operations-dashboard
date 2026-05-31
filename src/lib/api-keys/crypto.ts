import "server-only";

import { createHash, randomBytes } from "crypto";

const RANDOM_BYTE_LENGTH = 32;

export function hashWorkspaceApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateWorkspaceApiKey() {
  const prefix =
    process.env.NEXT_PUBLIC_APP_ENV === "production" ||
    process.env.NODE_ENV === "production"
      ? "op_live"
      : "op_dev";
  const randomPart = randomBytes(RANDOM_BYTE_LENGTH).toString("base64url");
  const rawKey = `${prefix}_${randomPart}`;

  return {
    keyHash: hashWorkspaceApiKey(rawKey),
    keyPrefix: `${prefix}_${randomPart.slice(0, 4)}`,
    keySuffix: rawKey.slice(-4),
    rawKey,
  };
}
