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
