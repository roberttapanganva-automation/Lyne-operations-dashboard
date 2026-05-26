alter table public.leads
add column if not exists assigned_member_id uuid references public.workspace_members(id) on delete set null,
add column if not exists assigned_at timestamptz,
add column if not exists assigned_by uuid references auth.users(id) on delete set null;

alter table public.jobs
add column if not exists assigned_member_id uuid references public.workspace_members(id) on delete set null,
add column if not exists assigned_at timestamptz,
add column if not exists assigned_by uuid references auth.users(id) on delete set null;

alter table public.tasks
add column if not exists assigned_member_id uuid references public.workspace_members(id) on delete set null,
add column if not exists assigned_at timestamptz,
add column if not exists assigned_by uuid references auth.users(id) on delete set null;

create table if not exists public.assignment_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entity_type text not null check (entity_type in ('lead', 'job', 'task')),
  strategy text not null default 'round_robin' check (strategy in ('round_robin')),
  enabled boolean not null default false,
  auto_create_task boolean not null default false,
  task_due_offset_minutes integer not null default 1440,
  notify_assignee boolean not null default true,
  last_assigned_member_id uuid references public.workspace_members(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, entity_type)
);

create table if not exists public.assignment_rule_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  assignment_rule_id uuid not null references public.assignment_rules(id) on delete cascade,
  workspace_member_id uuid not null references public.workspace_members(id) on delete cascade,
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_rule_id, workspace_member_id)
);

create trigger set_assignment_rules_updated_at
before update on public.assignment_rules
for each row
execute function public.handle_updated_at();

create trigger set_assignment_rule_members_updated_at
before update on public.assignment_rule_members
for each row
execute function public.handle_updated_at();

create index if not exists leads_assigned_member_id_idx
on public.leads (assigned_member_id);

create index if not exists jobs_assigned_member_id_idx
on public.jobs (assigned_member_id);

create index if not exists tasks_assigned_member_id_idx
on public.tasks (assigned_member_id);

create index if not exists assignment_rules_workspace_id_idx
on public.assignment_rules (workspace_id);

create index if not exists assignment_rule_members_workspace_id_idx
on public.assignment_rule_members (workspace_id);

create index if not exists assignment_rule_members_assignment_rule_id_idx
on public.assignment_rule_members (assignment_rule_id);

create index if not exists assignment_rule_members_workspace_member_id_idx
on public.assignment_rule_members (workspace_member_id);

alter table public.assignment_rules enable row level security;
alter table public.assignment_rule_members enable row level security;

grant select, insert, update, delete on public.assignment_rules to authenticated;
grant select, insert, update, delete on public.assignment_rule_members to authenticated;

create policy "Workspace members can read assignment rules"
on public.assignment_rules
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace leaders can insert assignment rules"
on public.assignment_rules
for insert
to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'manager']));

create policy "Workspace leaders can update assignment rules"
on public.assignment_rules
for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'manager']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin', 'manager']));

create policy "Workspace leaders can delete assignment rules"
on public.assignment_rules
for delete
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'manager']));

create policy "Workspace members can read assignment rule members"
on public.assignment_rule_members
for select
to authenticated
using (public.is_workspace_member(workspace_id));

create policy "Workspace leaders can insert assignment rule members"
on public.assignment_rule_members
for insert
to authenticated
with check (
  public.has_workspace_role(workspace_id, array['owner', 'admin', 'manager'])
  and exists (
    select 1
    from public.assignment_rules rule
    where rule.id = assignment_rule_id
      and rule.workspace_id = assignment_rule_members.workspace_id
  )
  and exists (
    select 1
    from public.workspace_members member
    where member.id = workspace_member_id
      and member.workspace_id = assignment_rule_members.workspace_id
      and member.status = 'active'
      and member.role in ('admin', 'manager', 'staff')
  )
);

create policy "Workspace leaders can update assignment rule members"
on public.assignment_rule_members
for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'manager']))
with check (
  public.has_workspace_role(workspace_id, array['owner', 'admin', 'manager'])
  and exists (
    select 1
    from public.assignment_rules rule
    where rule.id = assignment_rule_id
      and rule.workspace_id = assignment_rule_members.workspace_id
  )
  and exists (
    select 1
    from public.workspace_members member
    where member.id = workspace_member_id
      and member.workspace_id = assignment_rule_members.workspace_id
      and member.status = 'active'
      and member.role in ('admin', 'manager', 'staff')
  )
);

create policy "Workspace leaders can delete assignment rule members"
on public.assignment_rule_members
for delete
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin', 'manager']));
