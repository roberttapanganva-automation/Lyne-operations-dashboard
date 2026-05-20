import "server-only";

import { createHmac } from "node:crypto";

export function signN8nPayload(payload: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}
