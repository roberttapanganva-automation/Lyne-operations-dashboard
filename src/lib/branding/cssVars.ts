import type { CSSProperties } from "react";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import type { WorkspaceBranding } from "@/types/domain";
import { normalizeHexColor } from "@/lib/validation/branding";

const DEFAULT_PRIMARY = DEFAULT_BRAND.primaryColor;
const DEFAULT_ACCENT = DEFAULT_BRAND.accentColor;

function isValidHexColor(value: string) {
  return /^#[0-9A-F]{6}$/.test(normalizeHexColor(value));
}

function getSafeHexColor(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const normalized = normalizeHexColor(value);

  return isValidHexColor(normalized) ? normalized : fallback;
}

function hexToRgb(value: string) {
  const normalized = getSafeHexColor(value, DEFAULT_PRIMARY).replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red}, ${green}, ${blue}`;
}

export function getBrandingCssVars(
  branding: Pick<WorkspaceBranding, "accent_color" | "primary_color"> | null,
) {
  const primaryColor = getSafeHexColor(branding?.primary_color, DEFAULT_PRIMARY);
  const accentColor = getSafeHexColor(branding?.accent_color, DEFAULT_ACCENT);
  const primaryRgb = hexToRgb(primaryColor);
  const accentRgb = hexToRgb(accentColor);

  return {
    "--ops-primary": primaryColor,
    "--ops-primary-dark": accentColor,
    "--ops-primary-glow": `rgba(${primaryRgb}, 0.24)`,
    "--ops-primary-soft": `rgba(${primaryRgb}, 0.12)`,
    "--workspace-primary": primaryColor,
    "--workspace-accent": accentColor,
    "--workspace-primary-soft": `rgba(${primaryRgb}, 0.12)`,
    "--workspace-accent-soft": `rgba(${accentRgb}, 0.14)`,
    "--workspace-primary-glow": `rgba(${primaryRgb}, 0.24)`,
  } as CSSProperties;
}
