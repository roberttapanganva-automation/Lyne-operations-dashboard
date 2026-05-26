# Role Access QA Report

Date: 2026-05-27

## Routes Checked

- `/dashboard`
- `/leads`
- `/jobs`
- `/tasks`
- `/calendar`
- `/pipelines`
- `/automations`
- `/reports`
- `/settings`
- `/account`
- `/owner`
- `/owner/team`
- `/owner/invitations`
- `/owner/branding`
- `/owner/modules`
- `/owner/pipeline`
- `/owner/access-rules`
- `/owner/audit-logs`
- `/owner/assignments`

## Role Behavior Checked

- `owner`
  - Owner Console access verified through `getOwnerAccessContext()` and `(owner)` layout protection.
  - Workspace-wide branding, modules, pipeline, access rules, and assignment-rule controls remain owner-scoped.
- `admin`
  - Operational create/edit/delete/assign access verified through server permission helpers and route checks.
  - Owner Console access remains blocked by default.
- `manager`
  - Operational create/edit/delete/assign access verified.
  - Owner Console access remains blocked by default.
- `staff`
  - Operational create/edit access remains allowed where expected.
  - Manual reassignment remains blocked by server checks.
- `viewer`
  - Read-only behavior verified across create, update, delete, assign, and pipeline-move routes.

## Issues Found

1. Assignment rule updates were guarded by operational assignment permissions instead of the Owner Console boundary.
2. Assignment member lookup API could be called by authenticated non-assigning roles.
3. Reports navigation could appear for roles that the reports API already denied.
4. Legacy `/settings` workspace controls were still exposed in a general settings surface, which blurred the owner-only boundary.

## Fixes Applied

1. `src/app/api/assignments/rules/route.ts`
   - Switched GET and PATCH access checks to `getOwnerAccessContext()`.
   - Assignment rule management is now owner-only through the API, matching the Owner Console contract.

2. `src/app/api/assignments/members/route.ts`
   - Added active-workspace resolution and `canAssignOperationalRecords()` enforcement.
   - Non-assigning roles can no longer load assignable-member controls directly.

3. `src/components/app-shell/nav-items.ts`
   - Reports nav visibility now respects `canViewReports()` in addition to module visibility.

4. `src/app/(app)/reports/page.tsx`
   - Added page-level role guard so unauthorized roles get a clean boundary message before the client fetch layer runs.

5. `src/lib/settings/access.ts`
   - Workspace settings management is now owner-only by default.
   - Explicit `workspace_role_permissions` rows can still widen access intentionally.
   - Default role-permission fallbacks no longer silently grant workspace-management writes.

6. `src/app/(app)/settings/page.tsx`
   - Removed legacy workspace-edit forms from the general settings surface.
   - Settings now keeps personal preferences visible while directing owner workspace controls back to Owner Console.

7. `src/components/settings/SettingsPageHeader.tsx`
8. `src/components/settings/RestrictedSettingsState.tsx`
   - Updated copy so the UI matches the current boundary model: personal preferences on account/settings surfaces, workspace controls in Owner Console.

9. Assignment regression hardening
   - Lead, job, and task create/edit flows now accept optional manual assignees only for owner/admin/manager roles.
   - Assignees are validated server-side against the active workspace and allowed roles.

## Safe Delete Checks

Verified for:

- Leads bulk delete
- Contacts bulk delete
- Jobs bulk delete
- Tasks bulk delete
- Appointments bulk delete

Confirmed:

- bulk actions are server-scoped to the active workspace
- delete routes reject unauthorized roles
- contacts linked to leads/jobs/appointments are blocked from casual deletion
- UI confirmation pattern still requires typing `Delete`

## Assignment Checks

Verified for:

- `POST /api/leads`
- `PATCH /api/leads/[leadId]`
- `PATCH /api/leads/[leadId]/assign`
- `POST /api/jobs`
- `PATCH /api/jobs/[jobId]`
- `PATCH /api/jobs/[jobId]/assign`
- `POST /api/tasks`
- `PATCH /api/tasks/[taskId]`
- `PATCH /api/tasks/[taskId]/assign`
- `PATCH /api/assignments/rules`
- `POST /api/assignments/auto`

Confirmed:

- manual assignment/reassignment is owner/admin/manager only
- assignable members must belong to the active workspace
- assignable members must be active
- viewer is excluded from assignable members
- owner is not included in the round-robin assignable-member pool
- manual assignment remains available even if automation delivery fails

## n8n Safety Checks

Verified:

- `N8N_WEBHOOK_BASE_URL` and `N8N_SIGNING_SECRET` are only read in server code
- webhook delivery remains non-blocking for core app actions
- automation outcomes are recorded in `automation_logs`
- assignment and CRUD permission checks happen inside OpsPilot before any n8n trigger

## Remaining Risks

- `npm run lint` still reports pre-existing React Compiler issues in:
  - `src/components/account/AccountAvatarCard.tsx`
  - `src/components/app-shell/Topbar.tsx`
  - `src/components/app-shell/TopbarProfileMenu.tsx`
  - `src/components/reports/ReportsOverviewClient.tsx`
- `/settings` remains a legacy route alongside `/account`; the boundary is now safer, but future cleanup should consolidate the two surfaces more clearly.

## Validation Results

- `npm run typecheck` — passed
- `npm run lint` — failed with pre-existing lint errors listed above
- `npm run build` — passed after rerunning with network access so Next.js could fetch the Google Font used by the app

## Manual QA Checklist

### Owner

- [ ] Open `/owner` and each Owner Console child route successfully
- [ ] Update assignment rules from `/owner/assignments`
- [ ] Create, edit, delete, and reassign leads/jobs/tasks
- [ ] Update personal preferences without affecting workspace branding

### Admin

- [ ] Confirm `/owner` is blocked by direct URL
- [ ] Confirm lead/job/task manual assignment works
- [ ] Confirm reports load
- [ ] Confirm workspace-wide controls are not editable from `/settings`

### Manager

- [ ] Confirm `/owner` is blocked by direct URL
- [ ] Confirm lead/job/task manual assignment works
- [ ] Confirm reports load
- [ ] Confirm assignment rules API is blocked

### Staff

- [ ] Confirm `/owner` is blocked by direct URL
- [ ] Confirm leads/jobs/tasks can be worked but not reassigned
- [ ] Confirm assign-member API is blocked
- [ ] Confirm reports access follows product policy

### Viewer

- [ ] Confirm create/edit/delete/assign actions are blocked
- [ ] Confirm pipeline card moves are blocked
- [ ] Confirm reports nav is hidden
- [ ] Confirm direct report route shows the boundary message instead of data
