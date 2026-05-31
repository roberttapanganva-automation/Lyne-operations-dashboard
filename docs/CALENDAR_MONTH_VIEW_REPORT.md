# Calendar Month View Report

## Route Updated

- `src/app/(app)/calendar/page.tsx`

## Components Added Or Updated

- `src/components/calendar/CalendarWorkspaceView.tsx`
- `src/components/calendar/CalendarMonthView.tsx`
- `src/components/calendar/CalendarManageViewPanel.tsx`
- `src/components/calendar/CalendarEventDetailsDialog.tsx`
- `src/lib/calendar/types.ts`
- `src/lib/calendar/utils.ts`
- `src/lib/calendar/queries.ts`

## Data Sources Used

### Appointments

- table: `public.appointments`
- fields used:
  - `id`
  - `client_id`
  - `job_id`
  - `title`
  - `starts_at`
  - `ends_at`
  - `location`
  - `status`
  - `notes`
  - `created_at`
  - `created_by`

### Scheduled jobs

- table: `public.jobs`
- fields used:
  - `id`
  - `client_id`
  - `title`
  - `service_type`
  - `scheduled_start`
  - `scheduled_end`
  - `location`
  - `estimated_value`
  - `payment_status`
  - `status`
  - `created_at`
  - `assigned_member_id`

### Supporting workspace data

- `public.workspace_members`
- `public.profiles`
- assignment display helper for member names

## Role Visibility Behavior

- `owner`, `admin`, `manager`
  - can see all workspace appointments
  - can see all workspace scheduled jobs
  - can use the team filter inside Manage view

- `staff`
  - can see scheduled jobs assigned through `jobs.assigned_member_id`
  - can see appointments they created
  - can see appointments linked to their visible assigned jobs
  - cannot use unrestricted team filtering

- `viewer`
  - remains read-only
  - sees calendar items according to existing workspace-view rules
  - no create/edit/delete actions are surfaced

## Manage View Behavior

- right-side Manage view panel is available on Calendar View
- panel stays closed by default on desktop until the user opens it
- panel can be closed by using the Manage view button again or the mobile drawer close control
- view type presets:
  - All
  - Appointments
  - Scheduled jobs
- calendar toggles:
  - Appointments
  - Scheduled jobs
- owner/admin/manager can filter by active workspace members
- search narrows the member/filter list without writing preferences to the database
- on small screens, Manage view opens as a bottom drawer instead of a fixed side panel
- Manage view can be opened and closed without taking over the full desktop page state

## Event Details Behavior

- clicking an event opens a compact details modal
- modal shows:
  - type
  - title
  - date
  - time
  - customer if available
  - location
  - assigned person if available
  - appointment notes when present
- existing edit flows are reused:
  - appointments use the current appointment editor
  - jobs use the current job editor

## Known Limitations

- `Month view` is the only active calendar layout in this patch
- `Day view` and `Week view` remain visible in the styled selector as disabled "Coming later" options and do not navigate into unfinished views
- appointment list view remains appointment-focused and preserves the existing table pattern
- multi-day events render on their start date in the month grid
- filters in Manage view are UI-state only for this patch
- browser-authenticated visual automation was not available in this session, so rendered verification was limited to static build success and code review

## Manual QA Checklist

- open `/calendar`
- verify `Calendar View` is the default active tab when `tab` is missing or invalid
- verify `Calendar Settings` is not shown by default
- verify the three tabs:
  - Calendar View
  - Appointment List View
  - Calendar Settings
- verify Today, previous, next, and the current range label update the query and rerender
- verify the native select is replaced by the styled view selector trigger
- verify Day view and Week view are disabled and labelled Coming later
- verify Month view remains selected and active
- verify toolbar actions align above the grid with Add Appointment on the same control row
- verify Month view shows a 7-column grid with trailing days
- verify an empty month still shows the calendar grid plus the honest empty-month message
- verify today is highlighted
- verify real appointments appear on their `starts_at` day
- verify real scheduled jobs appear on their `scheduled_start` day
- verify `+N more` appears on crowded days
- verify clicking an event opens the details modal
- verify owner/admin/manager see workspace-wide events
- verify staff only sees assigned/allowed events
- verify viewer remains read-only
- verify Appointment List View still supports the existing appointment table behavior

## Validation Results

- `npm run typecheck`
  - passed
- `npm run lint`
  - passed with 3 pre-existing warnings outside this patch
- `npm run build`
  - passed
