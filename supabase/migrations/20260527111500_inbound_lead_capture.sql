create or replace function public.record_inbound_automation_log_by_key(
  target_key_hash text,
  automation_type text,
  automation_status text,
  automation_message text,
  automation_error_message text default null,
  automation_payload jsonb default '{}'::jsonb,
  related_type text default 'lead',
  related_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  log_workspace_id uuid;
  created_log_id uuid;
begin
  select key_metadata.workspace_id
  into log_workspace_id
  from public.workspace_api_key_secrets key_secret
  join public.workspace_api_keys key_metadata
    on key_metadata.id = key_secret.api_key_id
  where key_secret.key_hash = target_key_hash
    and key_metadata.status = 'active'
    and key_metadata.revoked_at is null
    and (
      key_metadata.expires_at is null
      or key_metadata.expires_at > now()
    )
  limit 1;

  if log_workspace_id is null then
    return null;
  end if;

  insert into public.automation_logs (
    automation_type,
    error_message,
    message,
    payload,
    related_id,
    related_type,
    status,
    workspace_id
  )
  values (
    automation_type,
    automation_error_message,
    automation_message,
    coalesce(automation_payload, '{}'::jsonb),
    related_id,
    related_type,
    automation_status,
    log_workspace_id
  )
  returning id into created_log_id;

  return created_log_id;
end;
$$;

revoke all on function public.record_inbound_automation_log_by_key(text, text, text, text, text, jsonb, text, uuid) from public;
grant execute on function public.record_inbound_automation_log_by_key(text, text, text, text, text, jsonb, text, uuid) to anon;

create or replace function public.create_inbound_lead_with_api_key(
  target_key_hash text,
  lead_title text,
  lead_source text default 'Automation',
  lead_notes text default null,
  lead_estimated_value numeric default 0,
  lead_next_follow_up_at timestamptz default null,
  contact_name text default null,
  contact_email text default null,
  contact_phone text default null
)
returns table (
  lead_id uuid,
  workspace_id uuid,
  assigned_member_id uuid,
  auto_created_task_id uuid,
  assignment_status text,
  assignment_message text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  client_id uuid;
  created_lead_id uuid;
  created_task_id uuid;
  rule_auto_create_task boolean;
  rule_id uuid;
  rule_last_assigned_member_id uuid;
  rule_task_due_offset_minutes integer;
  selected_member_id_value uuid;
  verified_api_key_id uuid;
  verified_workspace_id uuid;
  last_member_order_index integer;
  normalized_contact_email text := nullif(lower(left(btrim(contact_email), 320)), '');
  normalized_contact_name text := nullif(left(btrim(contact_name), 120), '');
  normalized_contact_phone text := nullif(left(regexp_replace(btrim(contact_phone), '\s+', ' ', 'g'), 32), '');
  normalized_estimated_value numeric(12,2) := greatest(coalesce(lead_estimated_value, 0), 0);
  normalized_notes text := nullif(left(btrim(lead_notes), 2000), '');
  normalized_source text := coalesce(nullif(left(btrim(lead_source), 80), ''), 'Automation');
  normalized_title text := nullif(left(btrim(lead_title), 160), '');
  safe_payload jsonb;
begin
  select
    key_metadata.id,
    key_metadata.workspace_id
  into verified_api_key_id, verified_workspace_id
  from public.workspace_api_key_secrets key_secret
  join public.workspace_api_keys key_metadata
    on key_metadata.id = key_secret.api_key_id
  where key_secret.key_hash = target_key_hash
    and key_metadata.status = 'active'
    and key_metadata.revoked_at is null
    and (
      key_metadata.expires_at is null
      or key_metadata.expires_at > now()
    )
    and 'lead:create' = any(key_metadata.scopes)
  limit 1;

  if verified_api_key_id is null or verified_workspace_id is null or normalized_title is null then
    return;
  end if;

  if normalized_contact_email is not null then
    select existing_client.id
    into client_id
    from public.clients existing_client
    where existing_client.workspace_id = verified_workspace_id
      and lower(existing_client.email) = normalized_contact_email
    order by existing_client.created_at desc
    limit 1;
  end if;

  if client_id is null and normalized_contact_phone is not null then
    select existing_client.id
    into client_id
    from public.clients existing_client
    where existing_client.workspace_id = verified_workspace_id
      and existing_client.phone = normalized_contact_phone
    order by existing_client.created_at desc
    limit 1;
  end if;

  if client_id is null and (
    normalized_contact_name is not null
    or normalized_contact_email is not null
    or normalized_contact_phone is not null
  ) then
    insert into public.clients (
      created_by,
      email,
      name,
      phone,
      source,
      updated_by,
      workspace_id
    )
    values (
      null,
      normalized_contact_email,
      coalesce(normalized_contact_name, normalized_title),
      normalized_contact_phone,
      normalized_source,
      null,
      verified_workspace_id
    )
    returning id into client_id;
  end if;

  insert into public.leads (
    client_id,
    created_by,
    estimated_value,
    next_follow_up_at,
    notes,
    priority,
    source,
    status,
    title,
    updated_by,
    workspace_id
  )
  values (
    client_id,
    null,
    normalized_estimated_value,
    lead_next_follow_up_at,
    normalized_notes,
    'normal',
    normalized_source,
    'open',
    normalized_title,
    null,
    verified_workspace_id
  )
  returning id into created_lead_id;

  safe_payload := jsonb_strip_nulls(
    jsonb_build_object(
      'api_key_id', verified_api_key_id,
      'estimated_value', normalized_estimated_value,
      'has_email', normalized_contact_email is not null,
      'has_phone', normalized_contact_phone is not null,
      'preferred_date_present', lead_next_follow_up_at is not null,
      'source', normalized_source
    )
  );

  insert into public.audit_logs (
    action,
    actor_user_id,
    entity_id,
    entity_type,
    metadata,
    workspace_id
  )
  values (
    'lead.created',
    null,
    created_lead_id,
    'lead',
    jsonb_build_object('source', normalized_source, 'title', normalized_title),
    verified_workspace_id
  );

  insert into public.automation_logs (
    automation_type,
    error_message,
    message,
    payload,
    related_id,
    related_type,
    status,
    workspace_id
  )
  values (
    'inbound.lead.create',
    null,
    'Inbound lead created via API key.',
    safe_payload,
    created_lead_id,
    'lead',
    'success',
    verified_workspace_id
  );

  assignment_status := 'skipped';
  assignment_message := 'No enabled assignment rule is configured.';
  assigned_member_id := null;
  auto_created_task_id := null;

  begin
    select
      rule.id,
      rule.auto_create_task,
      rule.last_assigned_member_id,
      rule.task_due_offset_minutes
    into rule_id, rule_auto_create_task, rule_last_assigned_member_id, rule_task_due_offset_minutes
    from public.assignment_rules rule
    where rule.workspace_id = verified_workspace_id
      and rule.entity_type = 'lead'
      and rule.enabled = true
    limit 1;

    if rule_id is null then
      insert into public.automation_logs (
        automation_type,
        error_message,
        message,
        payload,
        related_id,
        related_type,
        status,
        workspace_id
      )
      values (
        'lead.auto_assigned',
        null,
        assignment_message,
        jsonb_build_object('api_key_id', verified_api_key_id),
        created_lead_id,
        'lead',
        'skipped',
        verified_workspace_id
      );
    else
      if rule_last_assigned_member_id is not null then
        select rule_member.order_index
        into last_member_order_index
        from public.assignment_rule_members rule_member
        where rule_member.assignment_rule_id = rule_id
          and rule_member.workspace_id = verified_workspace_id
          and rule_member.workspace_member_id = rule_last_assigned_member_id
          and rule_member.active = true
        limit 1;
      end if;

      if last_member_order_index is not null then
        select member.id
        into selected_member_id_value
        from public.assignment_rule_members rule_member
        join public.workspace_members member
          on member.id = rule_member.workspace_member_id
        where rule_member.assignment_rule_id = rule_id
          and rule_member.workspace_id = verified_workspace_id
          and rule_member.active = true
          and member.workspace_id = verified_workspace_id
          and member.status = 'active'
          and member.role in ('admin', 'manager', 'staff')
          and rule_member.order_index > last_member_order_index
        order by rule_member.order_index asc, rule_member.created_at asc
        limit 1;
      end if;

      if selected_member_id_value is null then
        select member.id
        into selected_member_id_value
        from public.assignment_rule_members rule_member
        join public.workspace_members member
          on member.id = rule_member.workspace_member_id
        where rule_member.assignment_rule_id = rule_id
          and rule_member.workspace_id = verified_workspace_id
          and rule_member.active = true
          and member.workspace_id = verified_workspace_id
          and member.status = 'active'
          and member.role in ('admin', 'manager', 'staff')
        order by rule_member.order_index asc, rule_member.created_at asc
        limit 1;
      end if;

      if selected_member_id_value is null then
        assignment_message := 'Assignment rule has no eligible active members.';

        insert into public.automation_logs (
          automation_type,
          error_message,
          message,
          payload,
          related_id,
          related_type,
          status,
          workspace_id
        )
        values (
          'lead.auto_assigned',
          null,
          assignment_message,
          jsonb_build_object('api_key_id', verified_api_key_id),
          created_lead_id,
          'lead',
          'skipped',
          verified_workspace_id
        );
      else
        update public.leads
        set assigned_at = now(),
            assigned_by = null,
            assigned_member_id = selected_member_id_value,
            updated_by = null
        where id = created_lead_id
          and workspace_id = verified_workspace_id;

        update public.assignment_rules
        set last_assigned_member_id = selected_member_id_value,
            updated_by = null
        where id = rule_id
          and workspace_id = verified_workspace_id;

        assigned_member_id := selected_member_id_value;
        assignment_status := 'assigned';
        assignment_message := 'Lead auto-assigned.';

        insert into public.audit_logs (
          action,
          actor_user_id,
          entity_id,
          entity_type,
          metadata,
          workspace_id
        )
        values (
          'lead.auto_assigned',
          null,
          created_lead_id,
          'lead',
          jsonb_build_object('assigned_member_id', selected_member_id_value),
          verified_workspace_id
        );

        insert into public.automation_logs (
          automation_type,
          error_message,
          message,
          payload,
          related_id,
          related_type,
          status,
          workspace_id
        )
        values (
          'lead.auto_assigned',
          null,
          assignment_message,
          jsonb_build_object(
            'api_key_id', verified_api_key_id,
            'assigned_member_id', selected_member_id_value
          ),
          created_lead_id,
          'lead',
          'success',
          verified_workspace_id
        );

        if rule_auto_create_task then
          begin
            insert into public.tasks (
              assigned_at,
              assigned_by,
              assigned_member_id,
              created_by,
              description,
              due_at,
              priority,
              related_id,
              related_type,
              status,
              title,
              updated_by,
              workspace_id
            )
            values (
              now(),
              null,
              selected_member_id_value,
              null,
              'Automatically created after inbound lead assignment.',
              now() + make_interval(mins => rule_task_due_offset_minutes),
              'normal',
              created_lead_id,
              'lead',
              'todo',
              'Follow up with lead: ' || normalized_title,
              null,
              verified_workspace_id
            )
            returning id into created_task_id;

            auto_created_task_id := created_task_id;

            insert into public.audit_logs (
              action,
              actor_user_id,
              entity_id,
              entity_type,
              metadata,
              workspace_id
            )
            values (
              'task.auto_created',
              null,
              created_task_id,
              'task',
              jsonb_build_object(
                'assigned_member_id', selected_member_id_value,
                'lead_id', created_lead_id
              ),
              verified_workspace_id
            );

            insert into public.automation_logs (
              automation_type,
              error_message,
              message,
              payload,
              related_id,
              related_type,
              status,
              workspace_id
            )
            values (
              'task.auto_created',
              null,
              'Follow-up task created from inbound lead assignment.',
              jsonb_build_object(
                'assigned_member_id', selected_member_id_value,
                'lead_id', created_lead_id
              ),
              created_task_id,
              'task',
              'success',
              verified_workspace_id
            );
          exception when others then
            insert into public.automation_logs (
              automation_type,
              error_message,
              message,
              payload,
              related_id,
              related_type,
              status,
              workspace_id
            )
            values (
              'task.auto_created',
              SQLERRM,
              'Follow-up task could not be created after inbound lead assignment.',
              jsonb_build_object(
                'assigned_member_id', selected_member_id_value,
                'lead_id', created_lead_id
              ),
              created_lead_id,
              'lead',
              'failed',
              verified_workspace_id
            );
          end;
        end if;
      end if;
    end if;
  exception when others then
    assignment_status := 'failed';
    assignment_message := SQLERRM;

    insert into public.automation_logs (
      automation_type,
      error_message,
      message,
      payload,
      related_id,
      related_type,
      status,
      workspace_id
    )
    values (
      'lead.auto_assigned',
      SQLERRM,
      'Lead was created but auto-assignment failed.',
      jsonb_build_object('api_key_id', verified_api_key_id),
      created_lead_id,
      'lead',
      'failed',
      verified_workspace_id
    );
  end;

  lead_id := created_lead_id;
  workspace_id := verified_workspace_id;
  return next;
end;
$$;

revoke all on function public.create_inbound_lead_with_api_key(text, text, text, text, numeric, timestamptz, text, text, text) from public;
grant execute on function public.create_inbound_lead_with_api_key(text, text, text, text, numeric, timestamptz, text, text, text) to anon;
