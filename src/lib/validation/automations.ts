import { z } from "zod";

export const automationTriggerTypes = [
  "job.assigned",
  "lead.assigned",
  "lead.auto_assigned",
  "new_lead_notification",
  "follow_up_reminder",
  "task.assigned",
  "task.auto_created",
  "test_connection",
] as const;

export const triggerAutomationSchema = z.object({
  automation_type: z.enum(automationTriggerTypes),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
  related_id: z.uuid().nullable().optional(),
  related_type: z.string().trim().min(1).max(64).default("general"),
});

export type AutomationTriggerType = (typeof automationTriggerTypes)[number];
export type TriggerAutomationInput = z.infer<typeof triggerAutomationSchema>;
