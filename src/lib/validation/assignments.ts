import { z } from "zod";

export const assignmentTargetTypeSchema = z.enum(["lead", "job", "task"]);

export const assignRecordSchema = z
  .object({
    assigned_member_id: z.uuid().nullable(),
  })
  .strict();

export const autoAssignSchema = z
  .object({
    entity_type: assignmentTargetTypeSchema,
    record_id: z.uuid(),
  })
  .strict();

export const updateAssignmentRuleSchema = z
  .object({
    auto_create_task: z.boolean(),
    enabled: z.boolean(),
    entity_type: assignmentTargetTypeSchema,
    member_ids: z.array(z.uuid()).max(100),
    notify_assignee: z.boolean(),
    task_due_offset_minutes: z.number().int().min(15).max(43200),
  })
  .strict();

export type AssignRecordInput = z.infer<typeof assignRecordSchema>;
export type AutoAssignInput = z.infer<typeof autoAssignSchema>;
export type UpdateAssignmentRuleInput = z.infer<
  typeof updateAssignmentRuleSchema
>;
