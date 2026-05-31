# OpsPilot / ServiceOps Command Center — Next.js SaaS Master Blueprint

## Purpose

This is the current product and architecture blueprint for OpsPilot / ServiceOps Command Center. Use it with the DB, UI, SKILL, plugins, and AGENTS docs before making product changes.

## Official Stack

```text
Next.js App Router
TypeScript
Tailwind CSS
Supabase Auth
Supabase Postgres
Supabase RLS
Supabase migrations
Vercel later
n8n integration
Stripe later
OpenAI later
```

## Current Product Direction

OpsPilot is a premium multi-tenant SaaS command center for service businesses. The app uses a dark navy operational shell, a light main workspace, compact tables, real workspace-scoped data, and owner-managed workspace controls.

### Current Major Modules

- Dashboard / Overview
- CRM with `Leads` and `Contacts` tabs
- Jobs
- Tasks
- Calendar / Appointments
- Pipelines
- Automations
- Settings / Personal Preferences
- Owner Console

## Current Route Direction

### Daily operations

- `/dashboard`
- `/leads` with CRM tabs for `leads` and `contacts`
- `/jobs`
- `/tasks`
- `/calendar`
- `/pipelines`
- `/automations`
- `/settings`

### Owner Console

- `/owner`
- `/owner/team`
- `/owner/invitations`
- `/owner/branding`
- `/owner/modules`
- `/owner/pipeline`
- `/owner/access-rules`
- `/owner/audit-logs`
- `/owner/assignments`

Owner Console is owner-only unless that rule is explicitly changed later.

## CRM Direction

- The sidebar label may be `CRM` instead of `Leads`.
- The CRM page contains two tabs: `Leads` and `Contacts`.
- Leads are prospects, inquiries, and active opportunities.
- Contacts are saved customers, repeat customers, and clients linked to completed or ongoing work.
- Contacts use `public.clients`.
- Do not create a separate `contacts` table.
- Leads use `public.leads`.
- Leads may link to contacts through `leads.client_id`.
- Leads and Contacts use CRM-style utility tables:
  - search
  - filters
  - sort
  - manage fields
  - import
  - export
  - row checkboxes
  - select all
  - bulk action bar
  - safe delete confirmation
- CSV import should be server-validated.
- Manage Fields can remain localStorage-backed for MVP.
- Bulk delete requires typing exactly `Delete`.
- Contacts linked to live leads or jobs must not be casually hard-deleted.

## Pipeline Direction

- Dashboard Pipeline Overview is preview-only.
- The full working board lives at `/pipelines`.
- Owners manage pipeline groups and stages from Owner Console.
- Operations users work inside the board.
- Pipeline groups can include:
  - Sales Pipeline
  - Client Delivery Pipeline
  - other owner-defined groups
- `pipeline_groups` defines folders/groups.
- `pipeline_stages` belongs to `pipeline_groups`.
- Stage uniqueness is:

```text
workspace_id + pipeline_group_id + name
```

- Leads and jobs appear as real cards inside stages.
- Stage columns can create real lead cards.
- Cards move through safe server routes.
- n8n may automate movement later.
- Do not add fake stages or cards.

## Settings And Preferences Direction

Normal Settings is no longer the workspace-wide control surface.

Settings is for:

- personal preferences
- account/profile details
- role-limited operational context
- security/account actions
- theme preference link/display

Workspace-wide controls belong in Owner Console.

### Personal preferences

These are per-user and stored on `profiles`:

- timezone
- date format
- time format
- week starts on
- default landing page
- table density
- reduced motion
- in-app notifications preference
- personal theme preference in `profiles.theme_mode`

Rules:

- all authenticated roles can update their own preferences
- personal preferences must not update `workspace_branding`
- personal preferences must not require owner permissions
- client requests must not accept `user_id`
- client requests must not accept `workspace_id`

## Theme Direction

- Owner controls the workspace default theme in Owner Console branding.
- Every authenticated user can set a personal theme preference.
- `profiles.theme_mode` stores the user preference.
- Personal theme overrides the workspace default when present.
- User theme writes must not update `workspace_branding`.
- Theme control is available from the topbar for authenticated roles.

## Branding Direction

Owner-managed workspace branding includes:

- app name
- logo
- icon
- primary color
- accent color
- login heading
- login subtext
- workspace default theme

Rules:

- color controls may use presets and custom HEX
- logo and icon uploads should use the `workspace-branding` storage bucket
- branding uploads should be workspace-scoped
- non-owner roles cannot edit workspace branding unless explicitly allowed later

## Role Model

| Role | Current direction |
|---|---|
| owner | Full workspace control, Owner Console, branding, modules, pipeline, assignments, audit logs, access rules |
| admin | Operational access, settings visibility through owner rules, limited member visibility, no Owner Console by default |
| manager | Operational access, can assign and reassign work by default, can see member activity and visibility context, no Owner Console by default |
| staff | Daily operational work, can view and update assigned work, cannot reassign by default |
| viewer | Read-only where practical |

Additional rules:

- owner is not assignable from normal role dropdowns
- owner transfer is deferred
- admin and manager can see member status read-only where enabled
- staff and viewer do not see full team visibility by default

## Member Visibility And Activity

- `profiles.last_seen_at` powers activity state
- `Online` means last seen within 5 minutes
- `Recently active` means within 24 hours
- `Offline` means older than 24 hours or null
- true realtime presence is deferred

## Invitations

- pending invitations live in `workspace_invitations`
- invite links are copied manually for now
- email sending is deferred
- acceptance route is `/invite/[invitationId]`
- acceptance requires authenticated email to match `invited_email`
- invite roles exclude owner
- accepted invites safely create `workspace_members` rows
- do not use a service role key for invite acceptance

## Assignment Direction

- leads, jobs, and tasks can store `assigned_member_id`, `assigned_at`, and `assigned_by`
- assignable members must be active workspace members
- assignable roles are `admin`, `manager`, and `staff`
- `viewer` is excluded
- owner may remain manually assignable if safe, but should be excluded from auto-assignment by default
- owner, admin, and manager can manually assign or reassign
- staff can view and update assigned work but cannot reassign by default
- viewer is read-only
- round-robin auto-assignment is configured through `assignment_rules` and `assignment_rule_members`
- lead auto-assignment can create follow-up tasks when enabled
- if automation fails, manual assignment remains available

## n8n Direction

OpsPilot owns security, assignment, and database state. n8n assists with triggers and notifications.

Rules:

- n8n should call secure OpsPilot API routes
- n8n should not bypass workspace rules directly
- `N8N_WEBHOOK_BASE_URL` is server-only
- `N8N_SIGNING_SECRET` is server-only
- never add `NEXT_PUBLIC_N8N_*`
- n8n delivery failure must not break core app actions
- `automation_logs` should record success, failure, pending, and skipped states

Current event direction:

- `manual.test`
- `lead.created`
- `lead.updated`
- `lead.assigned`
- `lead.auto_assigned`
- `job.created`
- `job.assigned`
- `task.created`
- `task.assigned`
- `task.auto_created`
- `appointment.created`
- `pipeline.card.moved`

Public lead capture remains deferred until workspace-safe inbound identification is implemented.

## Dashboard Metric Rules

- `Revenue (Est.)` uses `jobs.estimated_value` only
- lead `estimated_value` is pipeline or opportunity value, not revenue
- cancelled jobs are excluded from estimated revenue
- overdue tasks are calculated dynamically from `due_at` and `status`
- today agenda uses `appointments.starts_at` and `jobs.scheduled_start`
- recent activity uses `audit_logs` and `automation_logs`
- dashboard must not show fake values

## Safe Delete Pattern

This is the standard destructive-action pattern across operational pages:

- bulk actions stay hidden until rows are selected
- select-all applies to the current visible filtered rows
- deletes use a confirmation dialog
- the user must type exactly `Delete`
- the server must still verify workspace scope and permissions
- no client-side-only protection

This pattern should apply to Leads, Contacts, Jobs, Tasks, Calendar/Appointments, and future bulk action pages.

## Notification Dropdown UX

- dropdown aligns under the topbar bell
- fixed max height with internal scroll
- should not awkwardly cover major table content
- should not overlap menus in a broken way

## UI Direction

- premium SaaS utility dashboard
- dark navy sidebar
- light main workspace by default
- compact spacing for operations work
- responsive mobile design
- CRM-style tables for Leads and Contacts
- pipeline board columns and cards
- Owner Console separated from daily operations
- Phosphor Icons
- no fake badges, counts, records, or summary states
- empty states are acceptable and preferred over fake content

## Current Deferred Features

- real invitation email sending
- true realtime presence
- owner transfer
- workspace deletion
- Stripe billing
- OpenAI assistant actions
- full workflow builder
- public lead capture without safe workspace identification
- deeper production deployment hardening

Drag-and-drop pipeline cards are implemented in the current board. Broader pipeline automation and advanced workflow orchestration remain future work.

## Build Order Direction

1. Next.js foundation
2. Design tokens and app shell
3. Supabase database foundation
4. Supabase auth and workspace loading
5. Dashboard and core CRUD
6. CRM refinement
7. Owner Console workspace controls
8. Pipeline board and grouped stages
9. Personal preferences and account UX
10. Assignment foundation
11. n8n secure event bridge
12. Stripe later
13. OpenAI later
14. deployment hardening later

## Final Rule

Keep patches small, safe, and honest. Prefer real workspace data, server-derived permissions, and durable owner-managed configuration over shortcuts.
