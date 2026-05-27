import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const boundedOptionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
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

const optionalNullableUuid = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z.uuid().nullable().optional(),
);

export const createLeadSchema = z.object({
  assigned_member_id: optionalNullableUuid,
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

export const createInboundLeadSchema = z
  .object({
    email: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.string().trim().email("Enter a valid email address.").max(320).optional(),
    ),
    estimated_value: optionalNumber.default(0),
    message: boundedOptionalText(2000),
    name: z.string().trim().min(1, "Lead name is required.").max(160),
    phone: boundedOptionalText(32),
    preferred_date: z.preprocess((value) => {
      if (typeof value === "string" && value.trim() === "") {
        return undefined;
      }

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
        return new Date(value).toISOString();
      }

      return value;
    }, z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid preferred date.").optional()),
    source: boundedOptionalText(80).default("Automation"),
  })
  .strict();

export const updateLeadSchema = z.object({
  assigned_member_id: optionalNullableUuid,
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
export type CreateInboundLeadInput = z.infer<typeof createInboundLeadSchema>;
export type ImportLeadRowInput = z.infer<typeof importLeadRowSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
