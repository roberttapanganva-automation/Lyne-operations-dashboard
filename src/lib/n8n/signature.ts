import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export function signN8nPayload(payload: string, secret: string) {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export function verifyN8nPayloadSignature({
  payload,
  secret,
  signature,
}: {
  payload: string;
  secret: string;
  signature: string | null;
}) {
  if (!signature) {
    return false;
  }

  const expected = signN8nPayload(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
