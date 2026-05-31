import { z } from "zod";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import { hexColorSchema } from "@/lib/validation/branding";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().nullable().optional(),
);

const requiredText = (message: string) =>
  z.string().trim().min(1, message);

export const pipelineEntityTypeSchema = z.enum(["lead", "job"]);

export const createPipelineGroupSchema = z.object({
  description: optionalText,
  entity_type: pipelineEntityTypeSchema,
  is_default: z.boolean().default(false),
  name: requiredText("Pipeline group name is required."),
  order_index: z.coerce.number().int().min(0).default(0),
});

export const updatePipelineGroupSchema = z.object({
  description: optionalText,
  entity_type: pipelineEntityTypeSchema,
  is_default: z.boolean(),
  name: requiredText("Pipeline group name is required."),
  order_index: z.coerce.number().int().min(0),
});

export const createPipelineStageSchema = z.object({
  color: hexColorSchema.default(DEFAULT_BRAND.primaryColor),
  entity_type: pipelineEntityTypeSchema.optional(),
  is_closed: z.boolean().default(false),
  is_lost: z.boolean().default(false),
  is_won: z.boolean().default(false),
  name: requiredText("Stage name is required."),
  order_index: z.coerce.number().int().min(0).default(0),
  pipeline_group_id: z.uuid(),
});

export const updatePipelineStageSchema = z.object({
  color: hexColorSchema,
  is_closed: z.boolean(),
  is_lost: z.boolean(),
  is_won: z.boolean(),
  name: requiredText("Stage name is required."),
  order_index: z.coerce.number().int().min(0),
});

export const movePipelineCardSchema = z.object({
  entity_type: pipelineEntityTypeSchema,
  record_id: z.uuid(),
  target_stage_id: z.uuid(),
});

export type CreatePipelineGroupInput = z.infer<typeof createPipelineGroupSchema>;
export type UpdatePipelineGroupInput = z.infer<typeof updatePipelineGroupSchema>;
export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;
export type MovePipelineCardInput = z.infer<typeof movePipelineCardSchema>;
