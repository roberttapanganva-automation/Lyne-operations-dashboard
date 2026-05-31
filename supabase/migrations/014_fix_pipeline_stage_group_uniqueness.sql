do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select constraint_name
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'pipeline_stages'
      and constraint_type = 'UNIQUE'
      and constraint_name in (
        select tc.constraint_name
        from information_schema.table_constraints tc
        join information_schema.key_column_usage kcu
          on kcu.constraint_schema = tc.constraint_schema
          and kcu.constraint_name = tc.constraint_name
          and kcu.table_schema = tc.table_schema
          and kcu.table_name = tc.table_name
        where tc.table_schema = 'public'
          and tc.table_name = 'pipeline_stages'
          and tc.constraint_type = 'UNIQUE'
        group by tc.constraint_name
        having array_agg(kcu.column_name::text order by kcu.ordinal_position) =
          array['workspace_id', 'entity_type', 'name']::text[]
      )
  loop
    execute format(
      'alter table public.pipeline_stages drop constraint if exists %I',
      constraint_record.constraint_name
    );
  end loop;
end $$;

do $$
declare
  index_record record;
begin
  for index_record in
    select index_class.relname as index_name
    from pg_index idx
    join pg_class table_class on table_class.oid = idx.indrelid
    join pg_namespace table_namespace on table_namespace.oid = table_class.relnamespace
    join pg_class index_class on index_class.oid = idx.indexrelid
    where table_namespace.nspname = 'public'
      and table_class.relname = 'pipeline_stages'
      and idx.indisunique
      and array(
        select attribute.attname::text
        from unnest(idx.indkey) with ordinality as indexed_column(attnum, ordinality)
        join pg_attribute attribute
          on attribute.attrelid = table_class.oid
          and attribute.attnum = indexed_column.attnum
        order by indexed_column.ordinality
      ) = array['workspace_id', 'entity_type', 'name']::text[]
  loop
    execute format('drop index if exists public.%I', index_record.index_name);
  end loop;
end $$;

create index if not exists idx_pipeline_stages_pipeline_group_id
on public.pipeline_stages (pipeline_group_id);

create unique index if not exists idx_pipeline_stages_group_name_unique
on public.pipeline_stages (workspace_id, pipeline_group_id, name);