import type { AutomationLog } from "@/types/domain";

const SENSITIVE_KEY_PATTERN =
  /(authorization|bearer|token|secret|signature|key_hash|raw[_-]?key|password|workspace_id|api_key_id|actor_user_id)/i;

const INTERNAL_ERROR_PATTERN =
  /(column .* does not exist|relation .* does not exist|duplicate key value|violates .* constraint|permission denied|syntax error|sqlstate|function .* does not exist)/i;

function truncateString(value: string, maxLength = 280) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

function sanitizePayloadValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayloadValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? "[redacted]"
          : sanitizePayloadValue(nestedValue),
      ]),
    );
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  return value;
}

export function formatAutomationEventName(value: string) {
  return value
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatAutomationRelatedType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getAutomationSourceLabel(
  log: Pick<AutomationLog, "automation_type" | "payload">,
) {
  const payload = log.payload;

  if (
    payload &&
    typeof payload === "object" &&
    "automation_source" in payload &&
    typeof payload.automation_source === "string"
  ) {
    if (payload.automation_source === "api_key") {
      return "API key";
    }

    if (payload.automation_source === "system") {
      return "System";
    }

    if (payload.automation_source === "n8n") {
      return "n8n";
    }
  }

  if (log.automation_type.startsWith("inbound.")) {
    return "API key";
  }

  if (log.automation_type === "test_connection") {
    return "System";
  }

  return "n8n";
}

export function sanitizeAutomationErrorMessage(errorMessage: string | null) {
  if (!errorMessage) {
    return null;
  }

  if (
    SENSITIVE_KEY_PATTERN.test(errorMessage) ||
    INTERNAL_ERROR_PATTERN.test(errorMessage)
  ) {
    return "Internal automation error.";
  }

  return truncateString(errorMessage, 220);
}

export function formatAutomationPayload(value: AutomationLog["payload"]) {
  if (!value) {
    return "No payload recorded.";
  }

  try {
    return JSON.stringify(sanitizePayloadValue(value), null, 2);
  } catch {
    return "Payload could not be rendered.";
  }
}
