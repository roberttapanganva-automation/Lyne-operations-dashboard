# n8n Inbound Automation Report

Date: 2026-05-27

## Endpoints Added

- `POST /api/inbound/leads`
- existing verification endpoint: `POST /api/inbound/auth/verify`

## Required API Key Scope

- `lead:create`

The inbound lead route requires `Authorization: Bearer YOUR_API_KEY` and resolves `workspace_id` from the verified API key only.

## Production Safety

- inbound routes require `Content-Type: application/json`
- oversized payloads are rejected before validation
- invalid and high-volume requests are rate-limited without exposing whether a key exists
- raw API keys, key hashes, authorization headers, and full private payloads are not returned in responses or shown in logs
- verified requests use the API key to resolve workspace context; inbound payloads never provide `workspace_id`

## Sample n8n HTTP Request Setup

URL:

```text
POST https://your-opspilot-host/api/inbound/leads
```

Headers:

```text
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Payload:

```json
{
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+123456789",
  "source": "Website form",
  "message": "Needs a cleaning service quote",
  "estimated_value": 250
}
```

## Automation Log Behavior

- `inbound.lead.create`
  - `success` when the lead is created through the verified API key
  - `failed` when a verified key sends invalid JSON, invalid payload fields, or a key without `lead:create`
- `lead.created`
  - recorded after OpsPilot attempts outbound n8n delivery for the created lead
  - `success`, `failed`, or `skipped` based on webhook configuration and delivery result
- `lead.auto_assigned`
  - `success` when round-robin assignment succeeds
  - `skipped` when no enabled rule or no eligible pool member exists
  - `failed` when assignment logic errors after the lead is already created
- `task.auto_created`
  - `success` when a configured follow-up task is created
  - `failed` when follow-up task creation errors after assignment

Raw API keys, bearer tokens, key hashes, and full private payloads are not written to logs.

## Assignment Behavior

- inbound lead creation does not accept `assigned_member_id`, `assigned_by`, or `workspace_id`
- if a lead assignment rule is enabled, OpsPilot uses the existing round-robin pool
- only active `admin`, `manager`, and `staff` members are eligible
- if assignment fails, the lead still remains created
- follow-up task creation only happens when the existing rule is configured to do so

## Pipeline Card Move Behavior

- authenticated pipeline card moves now attempt `pipeline.card.moved` after the stage update succeeds
- payload uses server-derived values only:
  - `entity_type`
  - `entity_id`
  - `from_stage_id`
  - `from_stage_name`
  - `to_stage_id`
  - `to_stage_name`
  - `actor_user_id`
  - `timestamp`
- n8n delivery failure does not roll back the pipeline move

## Security Rules

- bearer API key required for inbound lead creation
- `lead:create` scope required
- invalid, expired, or revoked keys are rejected
- `workspace_id` is never accepted from the inbound payload
- internal fields such as `assigned_member_id`, `assigned_by`, `created_by`, and `role` are rejected by request validation and ignored by database write logic
- n8n internal secrets still use server-only `N8N_WEBHOOK_BASE_URL` and `N8N_SIGNING_SECRET`

## Intentionally Deferred

- logging auth failures for completely invalid API keys without a verified workspace context
- broader inbound endpoints for jobs, tasks, or appointments
- public workspace discovery without API keys
- workflow-builder UI

## Test Checklist

- [ ] `POST /api/inbound/auth/verify` succeeds with a valid active API key
- [ ] `POST /api/inbound/leads` rejects missing bearer auth
- [ ] `POST /api/inbound/leads` rejects revoked or expired keys
- [ ] `POST /api/inbound/leads` rejects keys without `lead:create`
- [ ] valid inbound payload creates a real lead in the workspace from the API key
- [ ] inbound payload does not accept `workspace_id` or assignment fields
- [ ] auto-assignment runs when a rule is enabled
- [ ] follow-up task is created only when the rule is configured
- [ ] `pipeline.card.moved` appears in automation logs when a real card is moved
- [ ] assignment routes send events only when the assignee actually changes

## Validation Results

- `npm run lint` passed with three pre-existing warnings in account, assignments, and reports query files
- `npm run typecheck` passed
- `npm run build` passed after rerunning with network access for the Google Inter font fetch
