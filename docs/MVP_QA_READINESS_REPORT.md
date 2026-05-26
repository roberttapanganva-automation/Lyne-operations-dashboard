# OpsPilot MVP QA Readiness Report

## Current Readiness Summary

OpsPilot is in a solid functional MVP direction for workspace-scoped operations. The current product surface includes CRM, jobs, tasks, calendar, pipelines, automations, personal preferences, Owner Console, assignments, and a server-driven n8n event layer.

## Current QA Priorities

### Role coverage

Verify behavior for:

- owner
- admin
- manager
- staff
- viewer

Focus on route visibility, write permissions, assignment behavior, and Settings versus Owner Console boundaries.

### Data integrity

Verify:

- no client write depends on arbitrary `workspace_id`
- no personal preference write updates workspace branding
- no fake dashboard counts or records appear
- contacts linked to real records are not casually hard-deleted

### UX quality

Verify:

- compact sidebar and operational table layouts
- CRM Leads and Contacts tabs
- notification dropdown alignment and scroll behavior
- safe delete confirmation requiring `Delete`
- pipeline preview on dashboard versus full board on `/pipelines`

### Assignment behavior

Verify:

- owner, admin, and manager can assign by default
- staff can work assigned records but cannot reassign by default
- viewers remain read-only
- auto-assignment failures do not block core lead creation

### n8n behavior

Verify:

- secure server-side event delivery only
- failures write to `automation_logs`
- app actions still succeed when n8n is unavailable

## Current Deferred QA Areas

- invitation email sending
- public lead capture without safe workspace mapping
- true real-time presence
- Stripe billing
- OpenAI assistant actions
- full workflow builder
- final production deployment hardening

## Current Recommendation

The next QA passes should stay practical and role-based:

1. owner/admin/manager/staff/viewer regression on core pages
2. CRM bulk actions and safe delete confirmation
3. assignment flows across leads, jobs, and tasks
4. Owner Console access boundaries
5. personal preferences persistence and theme override behavior
