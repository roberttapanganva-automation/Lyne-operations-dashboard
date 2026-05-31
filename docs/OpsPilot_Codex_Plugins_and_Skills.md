# OpsPilot — Codex Plugins, Skills, and Companion Tools

## Purpose

This file keeps the Codex toolchain guidance aligned with the current OpsPilot build direction.

## Core Working Style

- use small, isolated patches
- read the product blueprints and `AGENTS.md` before changing implementation
- prefer repo truth over stale planning notes
- validate security-sensitive changes at both the route and policy level
- report validation results honestly

## Current Product Context For Codex

- the daily operations shell includes Dashboard, CRM, Jobs, Tasks, Calendar, Pipelines, Automations, and Settings
- CRM uses `/leads` with `Leads` and `Contacts` tabs
- Owner Console is a separate owner-only control area
- personal preferences live on `profiles`
- grouped pipelines use `pipeline_groups` and grouped stages
- assignment foundation exists for leads, jobs, and tasks
- n8n integration is server-driven and must not bypass app rules

## Recommended Core Tools

| Tool | Why it matters |
|---|---|
| Codex | patching, review, architecture alignment |
| Node.js LTS | Next.js runtime |
| npm | scripts and package workflow |
| Git | safe incremental changes |
| Supabase CLI | migrations and local database workflow |
| VS Code | editing and diff review |

## Current Plugin And Skill Priorities

### Supabase

Use Supabase-oriented workflows whenever the task touches:

- migrations
- RLS
- workspace isolation
- auth
- storage buckets
- route-level database writes

### Browser

Use the in-app browser for:

- localhost UI checks
- visual verification
- layout and interaction debugging
- authenticated UI confirmation when available

### Superpowers

Helpful when the task needs:

- systematic debugging
- implementation planning
- verification before completion

### Vercel / Next.js references

Useful for:

- Next.js App Router guidance
- deployment planning later
- verification patterns for UI work

## Current UI Skill Direction

Codex should follow these UI rules consistently:

- use Phosphor Icons
- preserve dark navy sidebar and light workspace
- keep spacing compact for operational work
- avoid fake counts, badges, and records
- keep CRM tables utility-first
- keep notification dropdowns constrained and aligned
- keep Owner Console separate from daily operations

## Current Backend Skill Direction

Codex should treat these as standard rules:

- do not use a service role key for normal app flows
- do not accept `workspace_id` from client writes
- do not trust client `user_id` or role claims
- keep RLS enabled
- route handlers derive workspace context server-side
- n8n secrets are server-only
- n8n failures should not break core app actions

## Current Module Notes

### CRM

- `/leads` contains `Leads` and `Contacts`
- contacts come from `public.clients`
- leads come from `public.leads`
- `leads.client_id` links the models

### Pipelines

- dashboard pipeline is preview-only
- `/pipelines` is the working board
- pipeline groups and stages are owner-managed
- drag-and-drop card movement exists

### Settings

- Settings is personal and role-limited
- workspace-wide controls belong in Owner Console
- preferences are per-user and stored in `profiles`

### Assignments

- assignment fields exist on leads, jobs, and tasks
- round-robin configuration exists through `assignment_rules` and `assignment_rule_members`
- managers can assign by default

## Safe Delete Rule

Treat this as a global product pattern:

- bulk actions stay hidden until selection exists
- delete confirmation requires typing exactly `Delete`
- server verification remains mandatory

## n8n Integration Rule

OpsPilot owns security and state. n8n is an external automation layer.

Current expectations:

- secure webhook calls only
- server-side signing
- `N8N_WEBHOOK_BASE_URL` and `N8N_SIGNING_SECRET` stay server-only
- `automation_logs` records pending, success, failed, and skipped outcomes
- public lead capture is still deferred until safe workspace identification exists

## Deferred Areas For Tooling

- Stripe billing workflows
- OpenAI action workflows
- real invitation email delivery tooling
- production incident tooling beyond current logs
- full workflow builder support

## Final Recommendation

Use Codex as a careful patching partner, not a bulk generator. Favor small, validated changes that respect the current data model, role model, and owner-versus-personal boundary.
