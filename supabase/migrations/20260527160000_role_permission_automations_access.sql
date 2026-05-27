alter table public.workspace_role_permissions
  add column if not exists can_view_automations boolean not null default false;

update public.workspace_role_permissions
set can_view_automations = true
where role in ('admin', 'manager');
