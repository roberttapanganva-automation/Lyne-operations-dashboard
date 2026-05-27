# ServiceOps Command Center — Database Blueprint NEXTJS

## Purpose

This document is the current database source of truth for OpsPilot / ServiceOps Command Center.

## Database Stack

```text
Supabase Auth
Supabase Postgres
Supabase Row Level Security
Supabase migrations
Generated TypeScript database types
```

## Core Principles

- every workspace-owned table uses `workspace_id`
- RLS remains enabled
- tenant isolation is enforced through `workspace_members`, helpers, and policies
- servers derive workspace and user context where possible
- do not trust client-supplied `workspace_id`, `user_id`, or role claims
- use real data and empty states instead of seed-like fake production records

## Naming Rules

Use these names consistently:

| Concept | Current field or table |
|---|---|
| branding | `workspace_branding` |
| contacts/customers | `clients` |
| lead records | `leads` |
| lead-contact link | `leads.client_id` |
| job schedule start | `scheduled_start` |
| job schedule end | `scheduled_end` |
| appointment start | `starts_at` |
| appointment end | `ends_at` |
| estimated revenue | `estimated_value` |
| manual assignment member field | `assigned_member_id` |
| assignment timestamp | `assigned_at` |
| assignment actor | `assigned_by` |
| user theme preference | `profiles.theme_mode` |
| last activity timestamp | `profiles.last_seen_at` |

Avoid stale aliases such as `contacts`, `assigned_to` as the canonical assignment field, `scheduled_at`, or `value`.

## Migration Order

Current migrations in repo:

```text
001_extensions_and_helpers.sql
002_profiles_workspaces.sql
003_workspace_customization.sql
004_pipeline_clients_operations.sql
005_logs_templates.sql
006_rls_policies.sql
007_indexes.sql
008_owner_console_foundation.sql
009_invite_acceptance_flow.sql
010_branding_storage_and_user_theme.sql
011_fix_profile_theme_preference_rls.sql
012_workspace_branding_storage.sql
013_pipeline_groups_and_board.sql
014_fix_pipeline_stage_group_uniqueness.sql
015_personal_preferences.sql
016_assignments_and_round_robin.sql
20260509101425_part_2_profile_theme_and_member_visibility.sql
20260509102652_part_3_workspace_member_owner_only_rls.sql
20260509110000_allow_manager_operational_deletes.sql
20260519002532_automation_logs_update_policy.sql
20260519013005_user_avatars_bucket.sql
20260520093000_fix_user_avatars_public_bucket.sql
20260526180003_workspace_api_access_keys.sql
```

## Current Schema Status

### Implemented

- `profiles`
- `workspaces`
- `workspace_members`
- `workspace_branding`
- `workspace_modules`
- `clients`
- `leads`
- `jobs`
- `tasks`
- `appointments`
- `message_templates`
- `automation_logs`
- `audit_logs`
- `workspace_invitations`
- `workspace_role_permissions`
- `pipeline_groups`
- `pipeline_stages`
- `profiles.theme_mode`
- `profiles.last_seen_at`
- personal preference columns on `profiles`
- `pipeline_stages.pipeline_group_id`
- `assignment_rules`
- `assignment_rule_members`
- `assigned_member_id`, `assigned_at`, and `assigned_by` on leads, jobs, and tasks
- `workspace-branding` storage bucket
- `workspace_api_keys`
- `workspace_api_key_secrets`

### Planned

- richer CSV import job tracking
- custom field persistence beyond MVP-local settings
- hardened public lead capture with workspace-safe identification
- broader workflow orchestration metadata around n8n-driven flows

### Deferred

- Stripe billing tables
- OpenAI action/job tables
- full workflow builder tables
- owner transfer support
- workspace deletion support

## Key Table Direction

### `profiles`

Current responsibilities:

- account profile identity
- avatar URL
- personal theme preference
- last seen activity
- personal preferences:
  - timezone
  - date format
  - time format
  - week starts on
  - default landing page
  - table density
  - reduced motion
  - in-app notifications enabled

Preferences are per-user and editable by authenticated roles only for their own row.

### `workspace_branding`

Owner-managed workspace defaults:

- app name
- logo URL
- icon URL
- primary color
- accent color
- login heading
- login subtext
- workspace default theme

Personal theme writes must not update this table.

### `clients`

`clients` is the contacts/customer table for CRM and customer history.

Rules:

- do not create a separate `contacts` table
- contacts can be linked from leads and jobs
- deletes should be cautious when linked records exist

### `leads`

Lead records represent prospects, inquiries, and open opportunities.

Current important columns:

- `workspace_id`
- `client_id`
- `stage_id`
- `estimated_value`
- `assigned_member_id`
- `assigned_at`
- `assigned_by`

### `jobs`

Jobs represent scheduled or delivered work.

Current important columns:

- `workspace_id`
- `client_id`
- `scheduled_start`
- `scheduled_end`
- `estimated_value`
- `actual_value`
- `assigned_member_id`
- `assigned_at`
- `assigned_by`

### `tasks`

Tasks represent operational follow-up and internal execution work.

Current important columns:

- `workspace_id`
- `related_type`
- `related_id`
- `due_at`
- `status`
- `assigned_member_id`
- `assigned_at`
- `assigned_by`

### `pipeline_groups`

Pipeline groups are the owner-defined folders or boards such as:

- Sales Pipeline
- Client Delivery Pipeline

### `pipeline_stages`

Stages belong to pipeline groups.

Current uniqueness rule:

```text
workspace_id + pipeline_group_id + name
```

Do not revert this back to entity-type uniqueness.

### `workspace_invitations`

Pending workspace invites are stored here.

Rules:

- invite acceptance route is `/invite/[invitationId]`
- authenticated user email must match `invited_email`
- invite roles exclude owner
- accepted invite creates a `workspace_members` row safely

### `workspace_role_permissions`

Stores owner-managed permission overrides that refine role visibility and access without changing the base role model.

### `assignment_rules`

Workspace-scoped assignment strategy records.

Current direction:

- entity types include `lead`, `job`, and `task`
- round-robin is the current strategy
- lead auto-assignment can create follow-up tasks

### `assignment_rule_members`

Stores the active assignment pool and order for each assignment rule.

### `automation_logs`

Used for n8n event delivery visibility.

Expected status values include:

- pending
- success
- failed
- skipped

n8n failures should be logged here without breaking core CRUD actions.

### `workspace_api_keys`

Workspace-scoped metadata for inbound automation API keys.

Rules:

- owner/admin manage keys from `/automations/api-access`
- raw keys are shown once and never stored
- key prefixes and suffixes may be displayed
- revoked keys are soft-revoked instead of hard-deleted by default

### `workspace_api_key_secrets`

Stores only API key hashes.

Rules:

- `key_hash` must never be returned to client code
- no normal app flow uses a service role key to read secrets
- inbound verification hashes the bearer key server-side and verifies through a safe RPC

## RLS Direction

RLS remains enabled.

### Required behaviors

- users can access only rows in workspaces where they are active members
- owner-only workspace controls stay owner-only unless explicitly changed
- personal profile preference writes are limited to `auth.uid()`
- invite acceptance remains authenticated and email-matched
- assignment configuration writes stay limited to trusted workspace roles
- no public write policy should bypass normal app security

## Assignment Model

Current assignment rules:

- assignable members must be active workspace members
- assignable roles are `admin`, `manager`, and `staff`
- viewers are excluded
- owner may be manually assignable if allowed by product logic, but is excluded from auto-assignment by default
- owner, admin, and manager may assign or reassign by default
- staff can work assigned records but cannot reassign by default

## Dashboard Metric Rules

- estimated revenue uses `jobs.estimated_value`
- lead `estimated_value` is opportunity value only
- cancelled jobs are excluded from estimated revenue
- overdue tasks are dynamic from `due_at` and status
- today agenda uses `appointments.starts_at` and `jobs.scheduled_start`
- recent activity comes from `audit_logs` and `automation_logs`

## Storage Direction

### Implemented

- `workspace-branding` bucket for workspace logo and icon uploads
- `user-avatars` bucket for personal avatar uploads

### Rules

- branding uploads are workspace-scoped
- avatar uploads are user-scoped
- do not use public client secrets for uploads

## n8n Data Model Direction

- OpsPilot remains the system of record
- n8n should call secure app routes rather than writing around RLS
- `automation_logs` captures delivery outcomes
- public lead capture remains deferred until safe workspace identification is available

## Deferred Items

- real-time presence streams
- public inbound lead capture without safe workspace mapping
- full workflow builder persistence
- billing/subscription schema
- OpenAI assistant schema

## Final Rule

Prefer small additive migrations, preserve RLS, and document implemented versus planned state honestly.
