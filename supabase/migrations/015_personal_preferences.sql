alter table public.profiles
add column if not exists timezone text default 'UTC',
add column if not exists date_format text not null default 'MMM d, yyyy',
add column if not exists time_format text not null default '12h',
add column if not exists week_starts_on text not null default 'monday',
add column if not exists default_landing_page text not null default '/dashboard',
add column if not exists table_density text not null default 'comfortable',
add column if not exists reduce_motion boolean not null default false,
add column if not exists in_app_notifications_enabled boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_time_format_valid'
  ) then
    alter table public.profiles
    add constraint profiles_time_format_valid
    check (time_format in ('12h', '24h'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_week_starts_on_valid'
  ) then
    alter table public.profiles
    add constraint profiles_week_starts_on_valid
    check (week_starts_on in ('sunday', 'monday'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_default_landing_page_valid'
  ) then
    alter table public.profiles
    add constraint profiles_default_landing_page_valid
    check (
      default_landing_page in (
        '/dashboard',
        '/leads',
        '/jobs',
        '/tasks',
        '/calendar',
        '/pipelines',
        '/automations'
      )
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_table_density_valid'
  ) then
    alter table public.profiles
    add constraint profiles_table_density_valid
    check (table_density in ('compact', 'comfortable', 'spacious'));
  end if;
end $$;

grant select, insert, update on public.profiles to authenticated;

drop policy if exists "Users can read own profile"
on public.profiles;

drop policy if exists "Users can insert own profile"
on public.profiles;

drop policy if exists "Users can update own profile"
on public.profiles;

create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
