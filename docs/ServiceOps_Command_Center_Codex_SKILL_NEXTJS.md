# ServiceOps Command Center — Codex SKILL NEXTJS

## Mission

Build and maintain OpsPilot / ServiceOps Command Center as a premium multi-tenant SaaS operations dashboard for service businesses.

## Official Stack

```text
Next.js App Router
TypeScript
Tailwind CSS
Supabase Auth
Supabase Postgres
Supabase RLS
Supabase migrations
n8n integration
Stripe later
OpenAI later
Vercel later
```

## Current Implementation Snapshot

- daily operations live in Dashboard, CRM, Jobs, Tasks, Calendar, Pipelines, Automations, and Settings
- CRM uses `/leads` with `Leads` and `Contacts` tabs
- Owner Console is owner-only and includes assignments
- dashboard pipeline is preview-only
- `/pipelines` is the full board
- grouped pipelines use `pipeline_groups` and `pipeline_stages.pipeline_group_id`
- personal preferences live on `profiles`
- personal theme preference lives on `profiles.theme_mode`
- current icon family is Phosphor Icons

## Source Of Truth Files

Read these first:

1. `docs/OpsPilot_ServiceOps_Master_Blueprint_NEXTJS.md`
2. `docs/ServiceOps_Command_Center_DB_Blueprint_NEXTJS.md`
3. `docs/ServiceOps_Command_Center_UI_Blueprint_NEXTJS.md`
4. `docs/ServiceOps_Command_Center_Codex_SKILL_NEXTJS.md`
5. `docs/OpsPilot_Codex_Plugins_and_Skills.md`
6. `AGENTS.md`

## Non-Negotiable Rules

### Stack

- use Next.js App Router only
- do not use Vite
- do not use React Router
- use TypeScript
- use Tailwind CSS

### Security

- do not use a Supabase service role key in app flows
- only `NEXT_PUBLIC_*` variables may reach browser code
- do not expose n8n, Stripe, or OpenAI secrets in the client
- keep RLS enabled
- do not disable RLS to fix errors
- do not accept `workspace_id` from normal client writes
- do not trust client-supplied `user_id` or role claims
- derive authenticated workspace and member context server-side

### Data

- do not add fake production data
- use empty states when needed
- keep `workspace_id` on workspace-owned tables
- keep naming aligned with the DB blueprint

### UI

- preserve the dark navy sidebar and light workspace
- use Phosphor Icons
- keep the operational UI compact and premium
- Owner Console remains separate from normal Settings
- CRM page has `Leads` and `Contacts` tabs
- dashboard pipeline is preview-only
- `/pipelines` is the full board
- notification dropdown should align cleanly under the bell

### Product rules

- Owner Console is owner-only unless explicitly changed later
- Settings is personal and role-limited
- personal preferences live on `profiles`
- personal theme overrides workspace default theme
- workspace branding is owner-managed
- safe delete requires typing exactly `Delete`

### Development

- use small safe patches
- inspect files before editing
- avoid unrelated rewrites
- run build, lint, and typecheck where available after meaningful app changes
- report validation honestly

## Current Route Direction

### Daily operations

- `/dashboard`
- `/leads`
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

## CRM Direction

- sidebar label may be `CRM`
- `/leads` page contains `Leads` and `Contacts` tabs
- leads use `public.leads`
- contacts use `public.clients`
- do not create a separate contacts table
- `leads.client_id` links leads to contacts
- CRM tables should support search, filters, sort, manage fields, import, export, row selection, bulk action bar, and safe delete

## Pipeline Direction

- dashboard pipeline is a preview
- `/pipelines` is the real board
- owners manage groups and stages from Owner Console
- operations users work on real cards
- stage uniqueness is `workspace_id + pipeline_group_id + name`
- drag-and-drop card movement is currently supported
- broader n8n automation around pipeline movement is future work

## Settings And Theme Direction

- Settings is not the workspace admin hub
- personal preferences are editable by all authenticated roles
- preferences include timezone, date format, time format, week starts on, default landing page, table density, reduced motion, and in-app notifications
- personal preference writes must not update workspace branding
- theme button is available in the topbar
- `profiles.theme_mode` stores the personal theme choice

## Owner Console Direction

Owner Console handles:

- branding
- modules
- pipeline groups and stages
- team members
- invitations
- access rules
- audit logs
- assignment rules

## Assignment Direction

- leads, jobs, and tasks can store `assigned_member_id`, `assigned_at`, and `assigned_by`
- assignable members must be active workspace members
- assignable roles are `admin`, `manager`, and `staff`
- viewer is excluded
- owner, admin, and manager can manually assign or reassign by default
- staff can work assigned records but cannot reassign by default
- round-robin auto-assignment is configured through `assignment_rules` and `assignment_rule_members`
- lead auto-assignment may create follow-up tasks
- manual fallback remains available when automation fails

## n8n Direction

- OpsPilot owns database state, security, and assignment logic
- n8n triggers, notifies, reminds, escalates, and reports
- n8n should call secure app routes
- `N8N_WEBHOOK_BASE_URL` and `N8N_SIGNING_SECRET` are server-only
- n8n failures must not break core CRUD actions
- `automation_logs` records delivery outcomes
- public lead capture remains deferred until workspace-safe inbound identification is implemented

## Environment Guidance

Browser-safe environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_NAME=OpsPilot
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_DEMO_MODE=false
```

Server-only examples:

```env
N8N_WEBHOOK_BASE_URL=
N8N_SIGNING_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=
SENTRY_DSN=
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to the normal app-flow instructions.

## Validation Expectations

After meaningful app changes:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

If a patch is documentation-only, do not run the app build unless code changed accidentally. Validate with diff review instead.

## Current Deferred Areas

- real invitation email sending
- owner transfer
- workspace deletion
- full workflow builder
- Stripe billing
- OpenAI assistant actions
- public lead capture without safe workspace mapping
- deeper production deployment hardening
- true real-time presence

## Final Rule

Codex should prefer real current repo state over stale assumptions, keep changes narrow, and document implemented versus planned status honestly.
