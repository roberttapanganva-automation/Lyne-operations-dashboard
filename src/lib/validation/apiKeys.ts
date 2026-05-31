import { z } from "zod";

export const workspaceApiKeyScopes = [
  "lead:create",
  "automation_logs:read",
] as const;

export const workspaceApiKeyScopeLabels: Record<
  (typeof workspaceApiKeyScopes)[number],
  string
> = {
  "automation_logs:read": "Read automation logs",
  "lead:create": "Create leads",
};

const scopesSchema = z
  .array(z.enum(workspaceApiKeyScopes))
  .max(workspaceApiKeyScopes.length)
  .default([]);

export const createWorkspaceApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: scopesSchema,
});

export const updateWorkspaceApiKeySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    scopes: scopesSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.scopes !== undefined, {
    message: "Provide a name or scopes to update.",
  });

export type WorkspaceApiKeyScope = (typeof workspaceApiKeyScopes)[number];
