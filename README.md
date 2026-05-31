# Lyne

Lyne is a ServiceOps Command Center for service businesses that need a clearer way to manage leads, jobs, schedules, follow-ups, team ownership, and daily operations.

Instead of spreading work across spreadsheets, chat threads, calendars, and disconnected tools, Lyne gives a service team one organized workspace for seeing what needs attention, who owns it, and what should happen next.

## What Lyne Helps With

Lyne is built for businesses that handle customer requests, scheduled work, repeat clients, and team assignments.

Examples include:

- cleaning services
- home service teams
- maintenance providers
- field service businesses
- local service operators
- appointment-based service teams
- small operations teams that need better visibility

The goal is simple: make daily service work easier to track, easier to assign, and easier to follow through.

## The Problem

Service businesses often lose time because important work is scattered:

- leads come in from different places
- job details live in messages or notes
- follow-ups get missed
- staff do not always know what is assigned to them
- owners cannot quickly see what is overdue
- managers need to rebalance work manually
- automation tools can trigger workflows, but the business still needs one reliable system of record

Lyne is designed to bring those moving parts into one operational dashboard.

## Core Experience

### Dashboard

The dashboard gives owners and teams a quick view of the workspace.

It helps answer:

- What needs attention today?
- How many new leads are active?
- What jobs are booked?
- What tasks are overdue?
- What changed recently?
- What work is assigned to the team?

The dashboard is not a fake analytics page. It is meant to show real workspace activity and honest empty states when there is no data yet.

### CRM

Lyne includes a CRM-style workspace for managing both leads and contacts.

Leads are prospects, inquiries, and active opportunities.

Contacts are customers, clients, repeat buyers, or people connected to completed work.

Example:

A cleaning company receives a new inquiry for an office cleaning estimate. The team can save it as a lead, track its stage, add contact details, assign ownership, and follow up until the job is booked or closed.

### Jobs

Jobs help the team track scheduled service work from creation to completion.

Example:

A manager creates a job for a residential deep cleaning appointment. The job can include the client name, service type, schedule, location, estimated value, payment status, and assignment.

### Tasks

Tasks keep follow-ups and operational reminders visible.

Example:

After a lead is assigned, Lyne can create a follow-up task so the assigned team member knows exactly what to do next.

### Calendar

The calendar shows scheduled appointments and jobs in a month view, with supporting list and settings views.

Example:

A team can open the calendar to see which jobs are scheduled this month, which days are busy, and which work items need attention.

### Pipelines

Pipelines help track work across stages.

Example stages might include:

- New Inquiry
- Contacted
- Estimate Scheduled
- Quote Sent
- Follow-Up Needed
- Booked
- Lost

Owners can configure pipeline groups and stages so the workflow matches how the business actually operates.

### Assignments

Lyne supports manual assignment and round-robin assignment foundations.

Example:

When a new lead is created, Lyne can assign it to the next available team member in the configured assignment pool. If automation fails, the lead still exists and a manager can assign it manually.

### Automations

Lyne is automation-ready without letting automation tools bypass the app rules.

n8n or similar tools can connect to secure inbound API routes for workflows such as:

- lead capture
- assignment notifications
- task reminders
- operational alerts
- workflow reporting

Lyne remains the system that owns permissions, assignment logic, and database updates.

## Role-Based Access

Lyne is designed for multi-role teams.

Typical roles:

- Owner: full workspace control.
- Admin: operational access.
- Manager: operational access and assignment control.
- Staff: assigned daily work.
- Viewer: read-only visibility where practical.

This means owners can keep workspace controls protected while staff can focus on the work assigned to them.

## Owner Console

The Owner Console separates business-wide controls from daily operations.

Owners can manage:

- team members
- invitations
- workspace branding
- module visibility
- pipeline groups and stages
- access rules
- audit logs
- assignment rules

This keeps normal settings personal while workspace-wide controls stay protected.

## Personal Preferences

Each user can manage their own personal preferences.

Examples:

- timezone
- date format
- time format
- week start day
- default landing page
- table density
- reduced motion
- in-app notification preference
- personal theme preference

These are personal settings, not workspace-wide branding controls.

## Branding

Lyne is the default brand for the product, but each workspace can be customized.

Owners can customize:

- app name
- logo
- icon
- primary color
- accent color
- login page heading
- login page supporting text
- workspace default theme

If a workspace has no custom branding, Lyne is used as the fallback.

## Example Workflow

Here is how Lyne can support a simple service business workflow:

1. A new customer inquiry is created as a lead.
2. The lead is assigned to a team member.
3. A follow-up task is created.
4. The lead moves through the sales pipeline.
5. Once booked, the work becomes a scheduled job.
6. The job appears on the calendar.
7. Staff can see assigned work.
8. Managers can review open work and reassign when needed.
9. Owners can review activity, pipeline movement, and workspace controls.
10. Automation tools can notify, remind, and report without bypassing Lyne permissions.

## Why Lyne

Lyne is focused on practical service operations.

It is not just a CRM, calendar, or task list. It combines those pieces into one workspace so a team can understand:

- what came in
- what is scheduled
- what is overdue
- who owns each item
- what changed recently
- what needs to happen next

## Current Product Direction

Lyne is being built as a premium, compact, operations-first dashboard.

Design direction:

- dark navy sidebar
- light main workspace
- compact operational layouts
- CRM-style tables
- real workspace data
- honest empty states
- client-ready visual polish
- no fake production records or fake metrics

Product direction:

- workspace-scoped data
- role-aware access
- owner-managed controls
- assignment foundations
- n8n-compatible automation
- secure inbound API access
- Stripe billing later
- OpenAI assistant features later

## Built With

Lyne is built with:

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase Postgres
- Supabase Row Level Security
- Phosphor Icons
- n8n-compatible integration patterns

## Development Status

Lyne is an active MVP build. The current focus is making the core operating experience reliable, secure, and easy to use for service teams.

Deferred areas include:

- Stripe billing
- OpenAI assistant actions
- public booking pages
- public lead forms
- full workflow builder
- true real-time presence
- owner transfer
- workspace deletion hardening

## License

Private project. All rights reserved unless a license is added later.
