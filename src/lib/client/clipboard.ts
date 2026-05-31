"use client";

export type CopyTextResult =
  | { ok: true; method: "navigator" | "fallback" }
  | { ok: false; error: "copy_failed" };

function fallbackCopyText(value: string): CopyTextResult {
  if (typeof document === "undefined") {
    return { error: "copy_failed", ok: false };
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const copied = document.execCommand("copy");
    return copied
      ? { method: "fallback", ok: true }
      : { error: "copy_failed", ok: false };
  } catch {
    return { error: "copy_failed", ok: false };
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyTextToClipboard(value: string): Promise<CopyTextResult> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(value);
      return { method: "navigator", ok: true };
    } catch {
      return fallbackCopyText(value);
    }
  }

  return fallbackCopyText(value);
}
