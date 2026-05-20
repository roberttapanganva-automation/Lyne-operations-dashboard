import { z } from "zod";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
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
}, z.number().min(0, "Value cannot be negative.").optional());

const optionalNullableNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return value;
}, z.number().min(0, "Value cannot be negative.").nullable().optional());

const optionalDateTime = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}, z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid schedule date.").optional());

export const createJobSchema = z.object({
  actual_value: optionalNullableNumber,
  client_email: optionalEmail,
  client_name: optionalText,
  client_phone: optionalText,
  estimated_value: optionalNumber.default(0),
  lead_id: z.uuid().optional(),
  location: optionalText,
  notes: optionalText,
  payment_status: z
    .enum(["unpaid", "partial", "paid", "refunded", "not_applicable"])
    .default("unpaid"),
  scheduled_end: optionalDateTime,
  scheduled_start: optionalDateTime,
  service_type: optionalText,
  status: z
    .enum(["draft", "scheduled", "in_progress", "completed", "cancelled"])
    .default("scheduled"),
  title: z.string().trim().min(1, "Job title is required."),
});

export const updateJobSchema = z.object({
  estimated_value: optionalNumber.default(0),
  location: optionalText,
  payment_status: z
    .enum(["unpaid", "partial", "paid", "refunded", "not_applicable"])
    .default("unpaid"),
  service_type: optionalText,
  status: z
    .enum(["draft", "scheduled", "in_progress", "completed", "cancelled"])
    .default("scheduled"),
  title: z.string().trim().min(1, "Job title is required."),
});

export const bulkJobActionSchema = z.object({
  action: z.literal("delete"),
  ids: z.array(z.uuid()).min(1).max(200),
});

export type BulkJobActionInput = z.infer<typeof bulkJobActionSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
