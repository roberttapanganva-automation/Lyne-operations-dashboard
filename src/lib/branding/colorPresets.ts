import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import type { BrandingColorPreset } from "@/types/domain";

export const brandingColorPresets: BrandingColorPreset[] = [
  {
    accent_color: DEFAULT_BRAND.accentColor,
    label: "Lyne Purple",
    primary_color: DEFAULT_BRAND.primaryColor,
  },
  {
    accent_color: "#3730A3",
    label: "Indigo",
    primary_color: "#4F46E5",
  },
  {
    accent_color: "#1D4ED8",
    label: "Blue",
    primary_color: "#2563EB",
  },
  {
    accent_color: "#0284C7",
    label: "Sky",
    primary_color: "#0EA5E9",
  },
  {
    accent_color: "#059669",
    label: "Emerald",
    primary_color: "#10B981",
  },
  {
    accent_color: "#0F766E",
    label: "Teal",
    primary_color: "#14B8A6",
  },
  {
    accent_color: "#D97706",
    label: "Amber",
    primary_color: "#F59E0B",
  },
  {
    accent_color: "#E11D48",
    label: "Rose",
    primary_color: "#F43F5E",
  },
  {
    accent_color: "#1E293B",
    label: "Slate",
    primary_color: "#334155",
  },
  {
    accent_color: DEFAULT_BRAND.accentColor,
    label: "Custom",
    primary_color: DEFAULT_BRAND.primaryColor,
  },
];
