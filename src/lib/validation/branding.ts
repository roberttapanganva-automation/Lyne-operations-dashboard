import { z } from "zod";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";

const themeModeSchema = z.enum(["system", "light", "dark"]);

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().nullable().optional(),
);

const requiredText = (message: string) =>
  z.string().trim().min(1, message);

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, red, green, blue] = trimmed;
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
  }

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return trimmed;
}

export function validateHexColor(value: string) {
  return /^#[0-9A-F]{6}$/.test(normalizeHexColor(value));
}

export const hexColorSchema = z
  .string()
  .trim()
  .transform(normalizeHexColor)
  .refine(
    (value) => /^#[0-9A-F]{6}$/.test(value),
    `Use a valid HEX color like ${DEFAULT_BRAND.primaryColor} or #7CF.`,
  );

export const updateWorkspaceBrandingSchema = z.object({
  accent_color: hexColorSchema,
  app_name: requiredText("App name is required."),
  icon_url: optionalText,
  login_heading: optionalText,
  login_subtext: optionalText,
  logo_url: optionalText,
  primary_color: hexColorSchema,
  theme_mode: themeModeSchema,
});

export const uploadBrandingAssetSchema = z.object({
  asset_type: z.enum(["logo", "icon"]),
});

export type UpdateWorkspaceBrandingInput = z.infer<
  typeof updateWorkspaceBrandingSchema
>;
