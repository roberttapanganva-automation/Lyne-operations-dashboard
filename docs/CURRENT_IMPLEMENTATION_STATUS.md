# OpsPilot Current Implementation Status

## Implemented Modules

- Dashboard / Overview
- CRM with Leads and Contacts tabs
- Jobs
- Tasks
- Calendar / Appointments
- Pipelines
- Automations
- Personal Settings / Preferences
- Owner Console
- Assignment foundation
- n8n event bridge with safe failure handling
- Workspace API access keys for external automation builders
- inbound lead capture using workspace API keys

## Implemented Backend Features

- workspace-scoped tables with RLS
- workspace branding
- workspace modules
- workspace invitations
- workspace role permissions
- grouped pipelines with `pipeline_groups` and grouped stages
- personal theme preference in `profiles.theme_mode`
- activity status via `profiles.last_seen_at`
- personal preferences on `profiles`
- assignment rules and assignment rule members
- assignment fields on leads, jobs, and tasks
- `workspace-branding` and `user-avatars` storage buckets
- `automation_logs` for n8n event outcomes
- workspace API key metadata and hashed secrets

## Current Role Model

- owner: full workspace control and Owner Console
- admin: operational access with limited admin visibility
- manager: operational access and assignment control by default
- staff: daily operational work on assigned records
- viewer: read-only where practical

## Current UI Direction

- dark navy sidebar
- light main workspace
- compact operational spacing
- CRM-style data tables
- dashboard pipeline preview
- full board at `/pipelines`
- Owner Console separated from daily operations
- Phosphor Icons

## Current Deferred Features

- invitation email sending
- public lead capture without safe workspace mapping
- true real-time presence
- owner transfer
- workspace deletion
- Stripe billing
- OpenAI assistant actions
- full workflow builder
- deeper production deployment hardening

## Next Recommended Patches

1. CRM CSV import and export hardening
2. safe delete consistency pass across all bulk-action pages
3. notification dropdown polish and unread-state UX review
4. pipeline automation follow-up around n8n events
5. production readiness pass for deployment, logging, and operational checklists
6. inbound lead creation using workspace API keys
7. broader inbound automation coverage beyond lead capture
