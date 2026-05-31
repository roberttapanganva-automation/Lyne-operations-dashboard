import { z } from "zod";

const assignableRoles = ["admin", "manager", "staff", "viewer"] as const;
const assignableRoleSchema = z.enum(assignableRoles);

const optionalDateTime = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}, z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date.").optional());

export const createWorkspaceInvitationSchema = z.object({
  expires_at: optionalDateTime,
  invited_email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  role: assignableRoleSchema,
});

export const updateMemberRoleSchema = z.object({
  role: assignableRoleSchema,
});

export const updateInvitationStatusSchema = z.object({
  status: z.enum(["cancelled", "expired"]),
});

export const workspaceRolePermissionPatchSchema = z.object({
  can_create_appointments: z.boolean(),
  can_create_jobs: z.boolean(),
  can_create_leads: z.boolean(),
  can_create_tasks: z.boolean(),
  can_view_automations: z.boolean(),
  can_edit_basic_settings: z.boolean(),
  can_edit_branding: z.boolean(),
  can_manage_modules: z.boolean(),
  can_manage_pipeline: z.boolean(),
  can_view_audit_logs: z.boolean(),
  can_view_settings: z.boolean(),
  role: assignableRoleSchema,
});

export const updateWorkspaceRolePermissionSchema = z.object({
  permissions: z.array(workspaceRolePermissionPatchSchema).min(1),
});
