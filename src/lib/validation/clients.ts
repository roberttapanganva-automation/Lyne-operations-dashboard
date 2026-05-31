import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email("Enter a valid email address.").optional(),
);

export const createClientSchema = z.object({
  address: optionalText,
  company_name: optionalText,
  email: optionalEmail,
  name: z.string().trim().min(1, "Contact name is required."),
  notes: optionalText,
  phone: optionalText,
  source: optionalText,
});

export const updateClientSchema = z.object({
  address: optionalText,
  company_name: optionalText,
  email: optionalEmail,
  name: z.string().trim().min(1, "Contact name is required."),
  notes: optionalText,
  phone: optionalText,
  source: optionalText,
});

export const importClientRowSchema = createClientSchema;

export const importClientsSchema = z.object({
  rows: z.array(importClientRowSchema).min(1).max(200),
});

export const bulkClientActionSchema = z.object({
  action: z.literal("delete"),
  ids: z.array(z.uuid()).min(1).max(200),
});

export type BulkClientActionInput = z.infer<typeof bulkClientActionSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type ImportClientRowInput = z.infer<typeof importClientRowSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
