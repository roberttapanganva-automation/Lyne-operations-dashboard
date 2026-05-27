alter table public.workspace_api_keys
  add column if not exists last_failed_at timestamptz;

create table if not exists public.inbound_api_rate_limits (
  identifier_type text not null,
  identifier_hash text not null,
  route text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  last_request_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inbound_api_rate_limits_pkey
    primary key (identifier_type, identifier_hash, route, window_started_at),
  constraint inbound_api_rate_limits_identifier_type_check
    check (identifier_type in ('api_key', 'fingerprint')),
  constraint inbound_api_rate_limits_request_count_check
    check (request_count >= 0),
  constraint inbound_api_rate_limits_route_check
    check (char_length(trim(route)) between 1 and 120)
);

create index if not exists idx_inbound_api_rate_limits_last_request
on public.inbound_api_rate_limits(last_request_at desc);

create trigger inbound_api_rate_limits_updated_at
before update on public.inbound_api_rate_limits
for each row
execute function public.handle_updated_at();

alter table public.inbound_api_rate_limits enable row level security;

revoke all on public.inbound_api_rate_limits from anon;
revoke all on public.inbound_api_rate_limits from authenticated;

create or replace function public.consume_inbound_api_rate_limit(
  target_identifier_type text,
  target_identifier_hash text,
  target_route text,
  target_limit integer,
  target_window_seconds integer
)
returns table (
  allowed boolean,
  request_count integer,
  retry_after_seconds integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  bucket_start timestamptz;
  current_time timestamptz := now();
  current_count integer;
  bucket_reset_at timestamptz;
begin
  if target_identifier_type not in ('api_key', 'fingerprint')
    or nullif(btrim(target_identifier_hash), '') is null
    or nullif(btrim(target_route), '') is null
    or coalesce(target_limit, 0) <= 0
    or coalesce(target_window_seconds, 0) <= 0 then
    allowed := false;
    request_count := 0;
    retry_after_seconds := greatest(target_window_seconds, 1);
    reset_at := current_time;
    return next;
    return;
  end if;

  bucket_start := to_timestamp(
    floor(extract(epoch from current_time) / target_window_seconds) * target_window_seconds
  );
  bucket_reset_at := bucket_start + make_interval(secs => target_window_seconds);

  insert into public.inbound_api_rate_limits (
    identifier_type,
    identifier_hash,
    route,
    window_started_at,
    request_count,
    last_request_at,
    created_at,
    updated_at
  )
  values (
    target_identifier_type,
    target_identifier_hash,
    target_route,
    bucket_start,
    1,
    current_time,
    current_time,
    current_time
  )
  on conflict (identifier_type, identifier_hash, route, window_started_at)
  do update
    set request_count = public.inbound_api_rate_limits.request_count + 1,
        last_request_at = excluded.last_request_at,
        updated_at = excluded.updated_at
  returning public.inbound_api_rate_limits.request_count
  into current_count;

  allowed := current_count <= target_limit;
  request_count := current_count;
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from (bucket_reset_at - current_time)))::integer
  );
  reset_at := bucket_reset_at;
  return next;
end;
$$;

revoke all on function public.consume_inbound_api_rate_limit(text, text, text, integer, integer) from public;
grant execute on function public.consume_inbound_api_rate_limit(text, text, text, integer, integer) to anon;

create or replace function public.mark_workspace_api_key_failed_by_hash(
  target_key_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_api_key_id uuid;
begin
  update public.workspace_api_keys key_metadata
  set last_failed_at = now()
  from public.workspace_api_key_secrets key_secret
  where key_secret.api_key_id = key_metadata.id
    and key_secret.key_hash = target_key_hash
  returning key_metadata.id into matched_api_key_id;

  return matched_api_key_id;
end;
$$;

revoke all on function public.mark_workspace_api_key_failed_by_hash(text) from public;
grant execute on function public.mark_workspace_api_key_failed_by_hash(text) to anon;
