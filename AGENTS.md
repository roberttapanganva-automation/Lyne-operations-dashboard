# OpsPilot / ServiceOps Command Center — Codex Instructions

## Mission

Build and maintain OpsPilot as a premium multi-tenant SaaS operations dashboard for service businesses.

## Source Of Truth

Read these before changing implementation:

1. `docs/OpsPilot_ServiceOps_Master_Blueprint_NEXTJS.md`
2. `docs/ServiceOps_Command_Center_DB_Blueprint_NEXTJS.md`
3. `docs/ServiceOps_Command_Center_UI_Blueprint_NEXTJS.md`
4. `docs/ServiceOps_Command_Center_Codex_SKILL_NEXTJS.md`
5. `docs/OpsPilot_Codex_Plugins_and_Skills.md`
6. `docs/CURRENT_IMPLEMENTATION_STATUS.md` if present

## Non-Negotiable Rules

- use Next.js App Router only
- do not use React Router
- use Phosphor Icons
- do not use a service role key for normal app flows
- only `NEXT_PUBLIC_` variables may reach browser code
- keep Supabase RLS enabled
- every workspace-owned table must include `workspace_id`
- do not disable RLS to fix errors
- do not accept `workspace_id` from client writes
- do not hardcode workspace IDs
- do not add fake data
- use empty states where data is missing
- Owner Console is owner-only
- Settings is personal and role-limited
- CRM page has `Leads` and `Contacts` tabs
- dashboard pipeline is preview only
- `/pipelines` is the full board
- personal theme preference lives in `profiles.theme_mode`
- role permissions flow through `workspace_role_permissions`
- n8n secrets are server-only
- safe delete requires typing exactly `Delete`
- use small safe patches
- explain every file changed
- always report validation honestly

## UI Direction

- dark navy sidebar
- light main workspace
- compact premium operational spacing
- rounded cards
- CRM-style tables
- pipeline board columns and cards
- Owner Console separated from daily operations
- no fake badges, fake counts, or fake records

## Build Direction

1. Next.js foundation
2. design tokens and app shell
3. Supabase database foundation
4. auth and workspace loading
5. dashboard and CRUD
6. CRM refinement
7. Owner Console workspace controls
8. pipeline board and grouped stages
9. personal preferences
10. assignments
11. n8n integration
12. Stripe later
13. OpenAI later

## Validation

- run `npm run build` after meaningful app changes
- run `npm run lint` and `npm run typecheck` where available
- for documentation-only patches, validate with diff review and skip build unless code changed accidentally

## Terminal Notes

Prefer RTK commands when they map to real Windows executables. Use PowerShell-native commands for file listing and text search when needed.
