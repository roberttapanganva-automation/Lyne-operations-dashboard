import { z } from "zod";

const optionalText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().optional(),
);

const optionalDateTime = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}, z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid due date.").optional());

const optionalUuid = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.uuid().optional(),
);

const optionalNullableUuid = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z.uuid().nullable().optional(),
);

export const taskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "done",
  "cancelled",
]);

export const createTaskSchema = z.object({
  assigned_member_id: optionalNullableUuid,
  description: optionalText,
  due_at: optionalDateTime,
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  related_id: optionalUuid,
  related_type: z.enum(["lead", "job", "client", "general"]).default("general"),
  status: taskStatusSchema.default("todo"),
  title: z.string().trim().min(1, "Task title is required."),
});

export const updateTaskStatusSchema = z.object({
  status: taskStatusSchema,
});

export const updateTaskSchema = z
  .object({
    description: optionalText,
    assigned_member_id: optionalNullableUuid,
    due_at: optionalDateTime,
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    related_id: optionalUuid,
    related_type: z.enum(["lead", "job", "client", "general"]).optional(),
    status: taskStatusSchema.optional(),
    title: z.string().trim().min(1, "Task title is required.").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one task field to update.",
  });

export const bulkTaskActionSchema = z.object({
  action: z.literal("delete"),
  ids: z.array(z.uuid()).min(1).max(100),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type BulkTaskActionInput = z.infer<typeof bulkTaskActionSchema>;
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
