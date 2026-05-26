# OpsPilot MVP Bug Check Report

## Purpose

This is the current concise bug-check snapshot for the MVP foundation. It is not a patch log.

## Current Snapshot

OpsPilot now includes:

- Dashboard / Overview
- CRM with Leads and Contacts
- Jobs
- Tasks
- Calendar / Appointments
- Pipelines
- Automations
- Personal Settings / Preferences
- Owner Console
- Assignment foundation
- n8n event bridge with safe failure handling

## Current High-Confidence Rules

- no fake production data
- RLS remains enabled
- no service role key in normal app flows
- personal preferences write only to the authenticated user profile
- workspace branding remains owner-managed
- invite acceptance is authenticated and email-matched
- dashboard metrics use real table data

## Current Known Risk Areas

- public n8n lead capture remains deferred until workspace-safe inbound identification is available
- invitation email sending remains deferred
- true real-time presence remains deferred
- owner transfer and workspace deletion remain deferred
- production deployment hardening is not yet the focus of the MVP docs

## Current UX Guardrails

- dashboard must not fake KPI values
- notification dropdown should stay constrained under the bell
- delete flows should require typing `Delete`
- CRM tables should stay compact and operational

## Recommended Ongoing Checks

1. verify role behavior across owner, admin, manager, staff, and viewer
2. verify assignment routes never accept arbitrary workspace context from the client
3. verify personal preference writes never touch `workspace_branding`
4. verify Owner Console routes remain owner-only
5. verify pipeline board actions stay workspace-scoped and use real cards only

## Deferred Bug-Check Areas

- public lead capture hardening
- deeper pipeline automation behavior
- invitation email delivery
- production monitoring and deployment checklists
