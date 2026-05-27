# Inbound API Security Report

Date: 2026-05-27

## Routes Reviewed

- `POST /api/inbound/auth/verify`
- `POST /api/inbound/leads`
- `/automations/api-access`

## Auth Model

- inbound routes require `Authorization: Bearer YOUR_API_KEY`
- OpsPilot hashes the presented key server-side
- workspace context is resolved only from the verified API key
- inbound payloads do not provide `workspace_id`, `user_id`, `assigned_by`, `assigned_member_id`, or `created_by`
- `lead:create` scope is required for `POST /api/inbound/leads`

## API Key Lifecycle

- raw keys are generated server-side
- only `key_hash` is stored in `workspace_api_key_secrets`
- raw keys are shown once after create or rotate
- `key_hash` is never returned to the client
- successful verified usage updates `last_used_at`
- failed recognized-key usage updates `last_failed_at`

## Rate Limit Behavior

### `POST /api/inbound/auth/verify`

- fingerprint limit before auth: `20 requests / 60 seconds`
- verified API key limit after auth: `60 requests / 60 seconds`

### `POST /api/inbound/leads`

- fingerprint limit before auth: `15 requests / 60 seconds`
- verified API key limit after auth: `45 requests / 60 seconds`

### Notes

- invalid-key traffic is rate-limited by a request fingerprint derived from IP and basic request headers
- verified traffic is rate-limited by API key id after verification
- raw API keys are never stored in the rate-limit table
- rate-limited responses return:

```json
{
  "ok": false,
  "error": "rate_limited",
  "message": "Too many requests. Please wait before trying again."
}
```

## Request Size And Content-Type Behavior

- inbound routes require JSON requests
- non-JSON requests return `415 invalid_content_type`
- malformed JSON returns `400 bad_request`
- oversized requests return `413 request_too_large`
- verify route body limit: `2 KB`
- inbound lead route body limit: `12 KB`
- raw payloads and authorization headers are not written to logs

## Safe Error Response Behavior

Inbound routes now return a flat safe shape:

```json
{
  "ok": false,
  "error": "validation_error",
  "message": "Readable safe message"
}
```

The response layer avoids exposing:

- raw API keys
- `key_hash`
- `Authorization` headers
- SQL error internals
- workspace internals beyond safe verified metadata
- n8n secrets or signing values

## Automation Logs

- automation logs can show event name, status, created time, source, and safe short messages
- log presentation sanitizes error strings that look like SQL internals or secret-bearing content
- payload previews redact sensitive fields such as:
  - `authorization`
  - `token`
  - `secret`
  - `signature`
  - `key_hash`
  - `raw_key`
  - `workspace_id`
  - `api_key_id`
  - `actor_user_id`

## API Access Guide Updates

The API Access page now includes:

- base URL
- auth header
- verify endpoint
- create lead endpoint
- copyable verify request
- copyable create lead request
- copyable example JSON payload
- explicit n8n HTTP Request setup:
  - method
  - URL
  - authentication type
  - header name
  - header value
  - body type

## Intentionally Deferred

- distributed/global rate limiting across multiple app instances
- richer IP reputation or abuse detection
- inbound job/task creation
- plan or billing-based API quotas
- logging completely invalid keys into workspace-scoped automation logs without a verified workspace context

## Manual Test Checklist

- [ ] `POST /api/inbound/auth/verify` succeeds with a valid active key
- [ ] verify rejects missing bearer auth
- [ ] verify rejects non-JSON requests
- [ ] verify rejects repeated high-volume requests with `429 rate_limited`
- [ ] `POST /api/inbound/leads` rejects missing `lead:create`
- [ ] lead creation rejects non-JSON requests
- [ ] lead creation rejects oversized payloads
- [ ] lead creation rejects invalid payload shape with safe validation messaging
- [ ] raw API keys are never shown outside the one-time modal
- [ ] automation log rows never show bearer headers, raw keys, or key hashes

## Validation Results

- `npm run lint`
  - passed with 3 pre-existing warnings:
    - `src/lib/account/queries.ts`
    - `src/lib/assignments/engine.ts`
    - `src/lib/reports/queries.ts`
- `npm run typecheck`
  - passed
- `npm run build`
  - first sandboxed attempt failed because Next.js could not fetch the Google Inter font
  - rerun with network access passed
- `npx supabase db push --dry-run`
  - first sandboxed attempt failed because the Supabase CLI could not write `C:\Users\rober\.supabase\telemetry.json`
  - rerun outside the sandbox passed
  - dry-run reported two pending migrations:
    - `20260527160000_role_permission_automations_access.sql`
    - `20260527190000_inbound_api_security_hardening.sql`
