create table if not exists public.workspace_api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_suffix text not null,
  scopes text[] not null default '{}',
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  constraint workspace_api_keys_status_check
    check (status in ('active', 'revoked', 'expired')),
  constraint workspace_api_keys_name_check
    check (char_length(trim(name)) between 1 and 100),
  constraint workspace_api_keys_key_prefix_check
    check (char_length(key_prefix) between 8 and 32),
  constraint workspace_api_keys_key_suffix_check
    check (char_length(key_suffix) = 4)
);

create table if not exists public.workspace_api_key_secrets (
  api_key_id uuid primary key references public.workspace_api_keys(id) on delete cascade,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  constraint workspace_api_key_secrets_key_hash_check
    check (char_length(key_hash) >= 64)
);

create index if not exists idx_workspace_api_keys_workspace_created
on public.workspace_api_keys(workspace_id, created_at desc);

create index if not exists idx_workspace_api_keys_workspace_status
on public.workspace_api_keys(workspace_id, status);

create trigger workspace_api_keys_updated_at
before update on public.workspace_api_keys
for each row
execute function public.handle_updated_at();

alter table public.workspace_api_keys enable row level security;
alter table public.workspace_api_key_secrets enable row level security;

create policy "Workspace admins can read API key metadata"
on public.workspace_api_keys
for select
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "Workspace admins can create API key metadata"
on public.workspace_api_keys
for insert
to authenticated
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "Workspace admins can update API key metadata"
on public.workspace_api_keys
for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'admin']))
with check (public.has_workspace_role(workspace_id, array['owner', 'admin']));

create policy "Workspace admins can create API key secrets"
on public.workspace_api_key_secrets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.workspace_api_keys key_metadata
    where key_metadata.id = api_key_id
      and public.has_workspace_role(
        key_metadata.workspace_id,
        array['owner', 'admin']
      )
  )
);

revoke all on public.workspace_api_keys from anon;
revoke all on public.workspace_api_key_secrets from anon;
revoke all on public.workspace_api_key_secrets from authenticated;

grant select, insert, update on public.workspace_api_keys to authenticated;
grant insert on public.workspace_api_key_secrets to authenticated;

create or replace function public.verify_workspace_api_key_by_hash(
  target_key_hash text
)
returns table (
  api_key_id uuid,
  workspace_id uuid,
  workspace_name text,
  scopes text[],
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.workspace_api_keys key_metadata
  set last_used_at = now()
  from public.workspace_api_key_secrets key_secret,
    public.workspaces workspace
  where key_secret.api_key_id = key_metadata.id
    and workspace.id = key_metadata.workspace_id
    and key_secret.key_hash = target_key_hash
    and key_metadata.status = 'active'
    and key_metadata.revoked_at is null
    and (
      key_metadata.expires_at is null
      or key_metadata.expires_at > now()
    )
  returning
    key_metadata.id,
    key_metadata.workspace_id,
    workspace.name,
    key_metadata.scopes,
    key_metadata.status;
end;
$$;

revoke all on function public.verify_workspace_api_key_by_hash(text) from public;
grant execute on function public.verify_workspace_api_key_by_hash(text) to anon;
