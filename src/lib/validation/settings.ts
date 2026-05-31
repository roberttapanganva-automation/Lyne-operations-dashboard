import { z } from "zod";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import {
  hexColorSchema,
  updateWorkspaceBrandingSchema,
} from "@/lib/validation/branding";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().nullable().optional(),
);

const requiredText = (message: string) =>
  z.string().trim().min(1, message);

const colorSchema = hexColorSchema;

const currencySchema = z
  .string()
  .trim()
  .length(3, "Use a 3-letter currency code.")
  .transform((value) => value.toUpperCase());

export const updateWorkspaceProfileSchema = z.object({
  currency_code: currencySchema,
  industry: optionalText,
  name: requiredText("Workspace name is required."),
  timezone: requiredText("Timezone is required."),
});

export { updateWorkspaceBrandingSchema };

export const updateWorkspaceModulesSchema = z.object({
  ai_enabled: z.boolean(),
  automations_enabled: z.boolean(),
  calendar_enabled: z.boolean(),
  invoices_enabled: z.boolean(),
  jobs_enabled: z.boolean(),
  leads_enabled: z.boolean(),
  reports_enabled: z.boolean(),
  tasks_enabled: z.boolean(),
});

export const createPipelineStageSchema = z.object({
  color: colorSchema.default(DEFAULT_BRAND.primaryColor),
  entity_type: z.enum(["lead", "job"]),
  is_closed: z.boolean().default(false),
  is_lost: z.boolean().default(false),
  is_won: z.boolean().default(false),
  name: requiredText("Stage name is required."),
  order_index: z.coerce.number().int().min(0).default(0),
});

export const updatePipelineStageSchema = z.object({
  color: colorSchema,
  is_closed: z.boolean(),
  is_lost: z.boolean(),
  is_won: z.boolean(),
  name: requiredText("Stage name is required."),
  order_index: z.coerce.number().int().min(0),
});

export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;
export type UpdateWorkspaceBrandingInput = z.infer<
  typeof updateWorkspaceBrandingSchema
>;
export type UpdateWorkspaceModulesInput = z.infer<
  typeof updateWorkspaceModulesSchema
>;
export type UpdateWorkspaceProfileInput = z.infer<
  typeof updateWorkspaceProfileSchema
>;
