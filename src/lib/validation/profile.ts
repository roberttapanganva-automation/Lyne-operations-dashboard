import { z } from "zod";

const optionalDisplayName = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}, z.string().max(80, "Display name must be 80 characters or fewer.").optional());

const timezoneSchema = z
  .string()
  .trim()
  .min(1, "Timezone is required.")
  .max(80, "Timezone must be 80 characters or fewer.");

export const updatePreferencesSchema = z
  .object({
    date_format: z.enum(["MMM d, yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd"]),
    default_landing_page: z.enum([
      "/dashboard",
      "/leads",
      "/jobs",
      "/tasks",
      "/calendar",
      "/pipelines",
      "/automations",
    ]),
    in_app_notifications_enabled: z.boolean(),
    reduce_motion: z.boolean(),
    table_density: z.enum(["compact", "comfortable", "spacious"]),
    time_format: z.enum(["12h", "24h"]),
    timezone: timezoneSchema,
    week_starts_on: z.enum(["sunday", "monday"]),
  })
  .strict();

export const updateThemeModeSchema = z.object({
  theme_mode: z.enum(["system", "light", "dark"]),
}).strict();

export const updateAccountProfileSchema = z
  .object({
    full_name: optionalDisplayName,
    timezone: timezoneSchema,
  })
  .strict();

export type UpdateAccountProfileInput = z.infer<typeof updateAccountProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
