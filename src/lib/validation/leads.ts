import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email("Enter a valid email address.").optional(),
);

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value;
}, z.number().min(0, "Estimated value cannot be negative.").optional());

const optionalDateTime = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}, z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid follow-up date.").optional());

export const createLeadSchema = z.object({
  client_id: z.uuid().optional(),
  client_email: optionalEmail,
  client_name: optionalText,
  client_phone: optionalText,
  estimated_value: optionalNumber.default(0),
  next_follow_up_at: optionalDateTime,
  notes: optionalText,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  source: optionalText.default("manual"),
  stage_id: z.uuid().optional(),
  status: z.enum(["open", "won", "lost"]).default("open"),
  title: z.string().trim().min(1, "Lead title is required."),
});

export const updateLeadSchema = z.object({
  estimated_value: optionalNumber.default(0),
  next_follow_up_at: optionalDateTime,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  source: optionalText.default("manual"),
  status: z.enum(["open", "won", "lost"]).default("open"),
  title: z.string().trim().min(1, "Lead title is required."),
});

export const importLeadRowSchema = z.object({
  contact_name: optionalText,
  email: optionalEmail,
  estimated_value: optionalNumber.default(0),
  next_follow_up_at: optionalDateTime,
  notes: optionalText,
  phone: optionalText,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  source: optionalText.default("csv"),
  status: z.enum(["open", "won", "lost"]).default("open"),
  title: z.string().trim().min(1, "Lead title is required."),
});

export const importLeadsSchema = z.object({
  rows: z.array(importLeadRowSchema).min(1).max(200),
});

export const bulkLeadActionSchema = z.object({
  action: z.literal("delete"),
  ids: z.array(z.uuid()).min(1).max(200),
});

export type BulkLeadActionInput = z.infer<typeof bulkLeadActionSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type ImportLeadRowInput = z.infer<typeof importLeadRowSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
