# API Access Keys Report

Date: 2026-05-27

## Routes Added

- `GET /api/automation/api-keys`
- `POST /api/automation/api-keys`
- `PATCH /api/automation/api-keys/[keyId]`
- `DELETE /api/automation/api-keys/[keyId]`
- `POST /api/automation/api-keys/[keyId]/rotate`
- `POST /api/inbound/auth/verify`
- `POST /api/inbound/leads`
- `/automations/api-access`

## Database Tables Added

- `public.workspace_api_keys`
  - stores key metadata only
  - includes `workspace_id`, name, prefix/suffix, scopes, status, lifecycle timestamps, and actor IDs
- `public.workspace_api_key_secrets`
  - stores `key_hash` only
  - raw API keys are never stored

RLS is enabled on both tables. Owner/admin users can manage metadata. The secrets table does not expose readable rows to client flows.

## Security Model

- Raw keys are generated server-side with Node crypto.
- Raw keys use `op_dev_...` outside production and `op_live_...` in production.
- Only a SHA-256 hash is stored.
- The raw key is returned only once after creation or rotation.
- `key_hash` is never selected by app routes or returned to the browser.
- Client requests never provide `workspace_id` or `user_id`.
- Workspace and role context are derived server-side.
- The inbound verify route accepts `Authorization: Bearer <api_key>`, hashes it server-side, and calls `verify_workspace_api_key_by_hash`.
- The verifier returns safe metadata only: API key ID, workspace ID for server use, workspace name, scopes, and status. The API response returns only workspace name and scopes.

## Role Access Rules

- `owner`: can list, create, rename, rotate, and revoke API keys.
- `admin`: can list, create, rename, rotate, and revoke API keys.
- `manager`: cannot manage API keys in this patch.
- `staff`: cannot manage API keys.
- `viewer`: cannot manage API keys.

## Key Lifecycle

1. Owner/admin creates a key from `/automations/api-access`.
2. OpsPilot stores metadata in `workspace_api_keys`.
3. OpsPilot stores only the hash in `workspace_api_key_secrets`.
4. The raw key is shown once in a modal.
5. Rotate revokes the old key and creates a new raw key with the same name/scopes.
6. Revoke marks the key as `revoked`; keys are not hard-deleted by default.
7. Successful verification updates `last_used_at`.
8. Failed verification attempts for a known key update `last_failed_at`.

## Usage Metadata

- `last_used_at`
  - updated by verified inbound API key usage
  - shown in the API Access table as a real timestamp or `Never used`
- `last_failed_at`
  - updated only when a request presents a recognizable stored key hash but fails verification or scope checks
  - raw keys, bearer headers, and failed key strings are not stored
- `status`
  - `active`, `revoked`, or `expired`
  - shown directly in the API Access table

## Using With Automation Builders

Base URL:

```text
https://your-opspilot-host
```

Header:

```text
Authorization: Bearer YOUR_API_KEY
```

Header auth setup:

```text
Method: POST
Authentication: Header Auth
Header name: Authorization
Header value: Bearer YOUR_API_KEY
Body type: JSON
```

Test endpoint:

```text
POST /api/inbound/auth/verify
```

Create lead endpoint:

```text
POST /api/inbound/leads
```

Example lead body:

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

## Audit And Logging

Authenticated management actions write safe audit events:

- `api_key.created`
- `api_key.rotated`
- `api_key.revoked`
- `api_key.renamed`

Raw keys and key hashes are never written to audit logs.

Inbound API security behavior is documented separately in `docs/INBOUND_API_SECURITY_REPORT.md`. The verify route updates usage metadata and applies inbound rate limiting without exposing key existence or secrets.

## Deferred

- public lead capture forms
- broader n8n event reliability changes
- direct Zapier/Make templates
- `job:create`, `task:create`, and `pipeline:update` scopes
- API-key-scoped automation log read endpoint

## Test Checklist

- [ ] Owner can open `/automations/api-access`.
- [ ] Admin can open `/automations/api-access`.
- [ ] Manager/staff/viewer see a guarded unavailable state.
- [ ] Create shows a raw key once.
- [ ] Closing the one-time modal makes the raw key unrecoverable.
- [ ] Table displays only key prefix and suffix.
- [ ] Table shows `Never used` until a verified request updates `last_used_at`.
- [ ] Rename updates metadata without changing the raw key.
- [ ] Rotate revokes the old key and shows a new raw key once.
- [ ] Revoke marks the key as revoked.
- [ ] `POST /api/inbound/auth/verify` succeeds with a valid bearer key.
- [ ] Verify fails after revoke.
- [ ] `key_hash` never appears in browser responses.

## Validation Results

- `npm run lint` passed with three pre-existing warnings in account, assignments, and reports query files.
- `npm run typecheck` passed.
- `npm run build` initially failed because the sandbox could not fetch the Google Inter font. It passed after rerunning with network access.
- `npx supabase db push --dry-run` was attempted, but Supabase CLI reported that no access token was available. No database push was run.
