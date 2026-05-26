# ServiceOps Command Center — UI/UX Blueprint NEXTJS

## Purpose

This is the current UI and UX direction for OpsPilot / ServiceOps Command Center.

## Current UI Direction

- premium SaaS utility dashboard
- dark navy sidebar
- light main workspace
- compact spacing for repeated operational work
- rounded cards and restrained shadows
- responsive mobile layout
- Phosphor Icons
- real data or empty states only

## App Shell

### Desktop

- compact dark navy sidebar
- light workspace canvas
- topbar inside the main content area
- compact operational spacing
- owner console visually distinct but still in the same design family

### Mobile

- no fixed desktop sidebar
- compact topbar
- bottom navigation or drawer
- large touch targets
- no text overlap

## Sidebar Direction

The sidebar should remain compact enough for normal operational pages to be visible without awkward scrolling on common laptop heights.

### Current nav grouping

`Menu`

- Overview
- Jobs
- Tasks
- Calendar
- CRM
- Pipelines

`More`

- Automations
- Reports
- Owner Console

Rules:

- `Account` should not be a primary sidebar destination
- collapsed mode shows compact icons only
- active state uses workspace branding when available, with a safe fallback
- no fake count badges
- spacing should stay compact for operational use

## Topbar Direction

- compact utility header
- page title and subtitle aligned with the operational page template
- business label may appear on Overview, but should stay minimal on interior pages
- theme button available to authenticated users
- notifications align under the bell
- notification dropdown uses fixed max height with internal scroll
- notification dropdown should not awkwardly blanket a whole data table

## CRM Page Direction

The CRM module may keep the route at `/leads`, but the product language should treat it as CRM.

### Tabs

- Leads
- Contacts

### Data model

- leads come from `public.leads`
- contacts come from `public.clients`
- do not add a separate contacts table

### Table behavior

CRM tables should feel similar to modern high-utility sales tools:

- search
- filters
- sort
- row selection
- select all
- bulk action bar
- manage fields
- import
- export
- safe delete confirmation

Manage Fields can remain localStorage-backed for MVP. CSV import should be server-validated.

## Pipeline UX Direction

- dashboard pipeline card is preview-only
- the full working board lives at `/pipelines`
- pipeline groups are owner-managed
- pipeline stages belong to groups
- lead and job cards should be real records
- stage columns may create real lead cards
- drag-and-drop card movement is supported through safe server routes
- n8n automation around movement remains future work

## Owner Console Direction

Owner Console is the workspace-wide control surface.

Current destinations:

- `/owner`
- `/owner/team`
- `/owner/invitations`
- `/owner/branding`
- `/owner/modules`
- `/owner/pipeline`
- `/owner/access-rules`
- `/owner/audit-logs`
- `/owner/assignments`

Owner Console controls:

- branding
- logo and icon
- modules
- pipeline groups and stages
- team members
- invitations
- role management
- access rules
- audit logs
- assignment rules

Dangerous-zone operations remain future work.

## Settings Direction

Normal Settings is a personal and role-limited page, not the workspace-wide admin hub.

### Current expectations

- personal profile
- security/account actions
- personal preferences
- limited role-aware workspace context
- theme note or link to topbar theme control

### Personal preferences

- timezone
- date format
- time format
- week starts on
- default landing page
- table density
- reduced motion
- in-app notifications

Workspace-wide branding, modules, pipeline structure, and assignment rules belong in Owner Console.

## Branding Direction

Owner-managed branding controls:

- app name
- logo
- icon
- primary color
- accent color
- login heading
- login subtext
- workspace default theme

Rules:

- use workspace branding tokens safely
- keep semantic success, warning, and danger colors semantic
- allow preset colors plus custom HEX

## Theme Direction

- workspace default theme is owner-managed
- personal theme preference is user-managed
- personal theme overrides the workspace default
- theme controls stay visible in the topbar for authenticated roles

## Dashboard Direction

Dashboard should answer:

```text
What needs attention today?
```

### Core sections

- greeting and context
- KPI cards
- pipeline preview
- today agenda
- tasks overview
- revenue overview
- recent activity

### Metric rules

- New Leads uses real lead rows
- Jobs Booked uses real job rows
- Revenue (Est.) uses `jobs.estimated_value`
- Overdue Tasks is dynamic from `due_at` and status
- Today agenda uses appointments and job schedules
- Recent activity uses `audit_logs` and `automation_logs`

No fake KPI values.

## Safe Delete Pattern

This is the global destructive-action pattern:

- bulk action bars appear only after selection
- select-all applies to visible filtered rows
- delete actions use a confirmation dialog
- the user must type exactly `Delete`
- server routes still verify permissions and workspace scope

Apply this pattern to Leads, Contacts, Jobs, Tasks, Calendar/Appointments, and future bulk-action pages.

## Accessibility Rules

- icon-only buttons require `aria-label`
- focus states remain visible
- labels stay explicit on forms
- dropdowns and dialogs remain keyboard reachable
- compactness must not reduce legibility

## Data Honesty Rules

- no fake counts
- no fake rows
- no fake notification totals
- use empty states when data is missing
- avoid placeholder badges that imply production behavior

## Deferred UX Areas

- invitation email delivery UX
- full workflow builder UI
- deeper pipeline automation surfaces
- real-time team presence UI
- billing UX
- OpenAI assistant action UI

## Final Design Rule

OpsPilot should feel like a client-ready command center: compact, clear, operational, and premium without decorative clutter.
