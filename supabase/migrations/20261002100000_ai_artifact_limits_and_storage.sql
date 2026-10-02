-- Preços server-side e armazenamento privado para artefatos opcionais.
-- PDF=1 crédito pelo arquivo (+ uso normal da IA no conteúdo), imagem IA=2.5,
-- imagem básica=0.5. Limites diários independentes por categoria e plano.

alter table public.credit_operations
  add column if not exists request_id uuid,
  add column if not exists artifact_type text,
  add column if not exists usage_date date,
  add column if not exists quota_group text;

alter table public.messages
  add column if not exists tool_id text,
  add column if not exists tool_label text;

create unique index if not exists credit_operations_user_request_id_idx
  on public.credit_operations (user_id, request_id)
  where request_id is not null;

create index if not exists credit_operations_artifact_daily_usage_idx
  on public.credit_operations (user_id, usage_date, quota_group, status);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'decidlyai-artifacts',
  'decidlyai-artifacts',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "DecidlyAI artifacts user read" on storage.objects;
create policy "DecidlyAI artifacts user read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'decidlyai-artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "DecidlyAI artifacts user upload" on storage.objects;
create policy "DecidlyAI artifacts user upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'decidlyai-artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "DecidlyAI artifacts user update" on storage.objects;
create policy "DecidlyAI artifacts user update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'decidlyai-artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'decidlyai-artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "DecidlyAI artifacts user delete" on storage.objects;
create policy "DecidlyAI artifacts user delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'decidlyai-artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.reserve_ai_artifact(
  p_request_id uuid,
  p_artifact_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_operation_id uuid;
  v_operation public.credit_operations%rowtype;
  v_wallet public.ai_credits%rowtype;
  v_daily_limit numeric := 5;
  v_daily_balance numeric := 0;
  v_free_balance numeric := 0;
  v_purchased_balance numeric := 0;
  v_daily_debit numeric := 0;
  v_free_debit numeric := 0;
  v_purchased_debit numeric := 0;
  v_cost numeric := 0;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_previous_date date;
  v_elapsed_days integer;
  v_daily_grant numeric;
  v_new_daily numeric;
  v_new_free numeric;
  v_new_purchased numeric;
  v_existing boolean := false;
  v_stale_request_id uuid;
  v_plan text := 'free';
  v_quota_group text;
  v_daily_quota integer := 0;
  v_usage_count integer := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_request_id is null then
    raise exception using errcode = '22023', message = 'request_id_required';
  end if;

  select lower(coalesce(plan, 'free')) into v_plan
  from public.profiles
  where id = v_user_id;
  v_plan := coalesce(v_plan, 'free');

  case p_artifact_type
    when 'pdf_create' then
      v_cost := 1;
      v_quota_group := 'pdf';
    when 'image' then
      v_cost := 2.5;
      v_quota_group := 'professional_image';
    when 'text_image' then
      v_cost := 0.5;
      v_quota_group := 'basic_image';
    else
      raise exception using errcode = '22023', message = 'unsupported_artifact_type';
  end case;

  select * into v_operation
  from public.credit_operations
  where user_id = v_user_id and request_id = p_request_id
  for update;

  if found then
    v_existing := true;
    if v_operation.artifact_type is distinct from p_artifact_type then
      raise exception using errcode = '22023', message = 'request_id_type_mismatch';
    end if;
    if v_operation.status = 'settled'
      or (v_operation.status = 'reserved' and v_operation.created_at >= now() - interval '10 minutes') then
      return jsonb_build_object(
        'success', true,
        'operation_id', v_operation.id,
        'request_id', p_request_id,
        'status', v_operation.status,
        'replayed', true,
        'metadata', v_operation.metadata
      );
    end if;
  end if;

  -- Serializa operações do mesmo usuário antes de conferir saldo e cota.
  select * into v_wallet
  from public.ai_credits
  where user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'credit_wallet_unavailable';
  end if;

  -- Uma mesma requisição pode ter sido criada enquanto esta transação aguardava
  -- o lock da carteira; revalida para manter a reserva idempotente sob concorrência.
  if not v_existing then
    select * into v_operation
    from public.credit_operations
    where user_id = v_user_id and request_id = p_request_id
    for update;
    if found then
      v_existing := true;
      if v_operation.artifact_type is distinct from p_artifact_type then
        raise exception using errcode = '22023', message = 'request_id_type_mismatch';
      end if;
      if v_operation.status = 'settled'
        or (v_operation.status = 'reserved' and v_operation.created_at >= now() - interval '10 minutes') then
        return jsonb_build_object(
          'success', true,
          'operation_id', v_operation.id,
          'request_id', p_request_id,
          'status', v_operation.status,
          'replayed', true,
          'metadata', v_operation.metadata
        );
      end if;
    end if;
  end if;

  -- Recupera reservas sem finalização (aba fechada ou conexão interrompida).
  for v_stale_request_id in
    select request_id
    from public.credit_operations
    where user_id = v_user_id
      and status = 'reserved'
      and request_id is not null
      and created_at < now() - interval '10 minutes'
    for update
  loop
    perform public.release_ai_artifact(v_stale_request_id, 'stale_reservation');
  end loop;

  -- A carteira já recebe o limite correspondente ao plano no fluxo de assinatura.
  v_daily_limit := greatest(5, coalesce(v_wallet.daily_credits_limit, 5));

  v_daily_quota := case
    when v_plan in ('vip', 'premium') and v_quota_group = 'pdf' then 3
    when v_plan in ('vip', 'premium') and v_quota_group = 'professional_image' then 9
    when v_plan in ('vip', 'premium') and v_quota_group = 'basic_image' then 15
    when v_quota_group = 'pdf' then 1
    when v_quota_group = 'professional_image' then 3
    else 5
  end;

  select count(*)::integer into v_usage_count
  from public.credit_operations op
  where op.user_id = v_user_id
    and op.usage_date = v_today
    and op.quota_group = v_quota_group
    and op.status in ('reserved', 'settled')
    and (not v_existing or op.id <> v_operation.id);
  if v_usage_count >= v_daily_quota then
    raise exception using errcode = 'P0001',
      message = 'daily_artifact_limit:' || v_quota_group || ':' || v_daily_quota::text;
  end if;

  v_previous_date := nullif(v_wallet.daily_credits_reset_at::text, '')::date;
  if v_previous_date is null then
    v_daily_balance := least(v_daily_limit, 5);
  elsif v_previous_date >= v_today then
    v_daily_balance := least(v_daily_limit, coalesce(v_wallet.daily_credits_used, 0));
  else
    v_elapsed_days := greatest(1, v_today - v_previous_date);
    v_daily_grant := case when v_daily_limit >= 100 then 10 else 5 end;
    v_daily_balance := least(
      v_daily_limit,
      coalesce(v_wallet.daily_credits_used, 0) + v_elapsed_days * v_daily_grant
    );
  end if;

  v_free_balance := greatest(0, coalesce(v_wallet.free_credits, 0));
  v_purchased_balance := greatest(0, coalesce(v_wallet.purchased_credits, 0));
  if v_daily_balance + v_free_balance + v_purchased_balance < v_cost then
    raise exception using errcode = 'P0001', message = 'insufficient_credits';
  end if;

  v_daily_debit := least(v_daily_balance, v_cost);
  v_free_debit := least(v_free_balance, v_cost - v_daily_debit);
  v_purchased_debit := greatest(0, v_cost - v_daily_debit - v_free_debit);
  v_new_daily := v_daily_balance - v_daily_debit;
  v_new_free := v_free_balance - v_free_debit;
  v_new_purchased := v_purchased_balance - v_purchased_debit;

  update public.ai_credits
  set daily_credits_used = v_new_daily,
      daily_credits_limit = v_daily_limit,
      daily_credits_reset_at = v_today,
      free_credits = v_new_free,
      purchased_credits = v_new_purchased,
      total_credits = v_new_free + v_new_purchased
  where user_id = v_user_id;

  if v_existing then
    v_operation_id := v_operation.id;
    update public.credit_operations
    set operation_type = p_artifact_type,
        artifact_type = p_artifact_type,
        request_id = p_request_id,
        usage_date = v_today,
        quota_group = v_quota_group,
        status = 'reserved',
        estimated_credits = v_cost,
        reserved_credits = v_cost,
        actual_credits = null,
        metadata = jsonb_build_object(
          'daily_debit', v_daily_debit,
          'free_debit', v_free_debit,
          'purchased_debit', v_purchased_debit,
          'quota_group', v_quota_group,
          'daily_quota', v_daily_quota,
          'plan', v_plan
        ),
        created_at = now(),
        settled_at = null
    where id = v_operation_id;
  else
    insert into public.credit_operations (
      user_id, operation_type, artifact_type, request_id, usage_date, quota_group,
      status, estimated_credits, reserved_credits, metadata
    ) values (
      v_user_id, p_artifact_type, p_artifact_type, p_request_id, v_today, v_quota_group,
      'reserved', v_cost, v_cost,
      jsonb_build_object(
        'daily_debit', v_daily_debit,
        'free_debit', v_free_debit,
        'purchased_debit', v_purchased_debit,
        'quota_group', v_quota_group,
        'daily_quota', v_daily_quota,
        'plan', v_plan
      )
    ) returning id into v_operation_id;
  end if;

  insert into public.credit_events (
    user_id, event_type, amount, balance_type, reference_id, description
  ) values (
    v_user_id,
    'usage',
    -v_cost,
    case when v_daily_debit + v_free_debit > 0 then 'free' else 'purchased' end,
    v_operation_id::text,
    case p_artifact_type
      when 'pdf_create' then 'Geração de PDF'
      when 'image' then 'Geração de imagem por IA'
      else 'Geração de imagem de texto'
    end
  );

  return jsonb_build_object(
    'success', true,
    'operation_id', v_operation_id,
    'request_id', p_request_id,
    'status', 'reserved',
    'replayed', false,
    'credits_charged', v_cost,
    'daily_credits', v_new_daily,
    'free_credits', v_new_free,
    'purchased_credits', v_new_purchased
  );
end;
$$;

create or replace function public.settle_ai_artifact(
  p_request_id uuid,
  p_result_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_operation public.credit_operations%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  select * into v_operation
  from public.credit_operations
  where user_id = v_user_id and request_id = p_request_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'artifact_operation_not_found';
  end if;
  if v_operation.status = 'settled' then
    return jsonb_build_object('success', true, 'status', 'settled', 'metadata', v_operation.metadata);
  end if;
  if v_operation.status <> 'reserved' then
    raise exception using errcode = 'P0001', message = 'artifact_operation_not_reserved';
  end if;

  update public.credit_operations
  set status = 'settled',
      actual_credits = reserved_credits,
      metadata = metadata || coalesce(p_result_metadata, '{}'::jsonb),
      settled_at = now()
  where id = v_operation.id;

  return jsonb_build_object('success', true, 'status', 'settled');
end;
$$;

create or replace function public.release_ai_artifact(
  p_request_id uuid,
  p_reason text default 'generation_failed'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_operation public.credit_operations%rowtype;
  v_wallet public.ai_credits%rowtype;
  v_daily_refund numeric := 0;
  v_free_refund numeric := 0;
  v_purchased_refund numeric := 0;
  v_daily_balance numeric := 0;
  v_free_balance numeric := 0;
  v_purchased_balance numeric := 0;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  v_reset_date date;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  select * into v_operation
  from public.credit_operations
  where user_id = v_user_id and request_id = p_request_id
  for update;
  if not found then
    return jsonb_build_object('success', true, 'status', 'missing');
  end if;
  if v_operation.status in ('released', 'failed') then
    return jsonb_build_object('success', true, 'status', v_operation.status);
  end if;
  if v_operation.status = 'settled' then
    raise exception using errcode = 'P0001', message = 'artifact_already_settled';
  end if;

  select * into v_wallet
  from public.ai_credits
  where user_id = v_user_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'credit_wallet_unavailable';
  end if;

  v_daily_refund := coalesce((v_operation.metadata ->> 'daily_debit')::numeric, 0);
  v_free_refund := coalesce((v_operation.metadata ->> 'free_debit')::numeric, 0);
  v_purchased_refund := coalesce((v_operation.metadata ->> 'purchased_debit')::numeric, 0);
  v_reset_date := nullif(v_wallet.daily_credits_reset_at::text, '')::date;
  v_daily_balance := coalesce(v_wallet.daily_credits_used, 0);
  v_free_balance := coalesce(v_wallet.free_credits, 0);
  v_purchased_balance := coalesce(v_wallet.purchased_credits, 0);

  if v_reset_date = v_today then
    v_daily_balance := v_daily_balance + v_daily_refund;
  else
    -- Uma reserva que falhou após a virada do dia volta como crédito grátis, sem
    -- reescrever o saldo diário já renovado.
    v_free_balance := v_free_balance + v_daily_refund;
  end if;
  v_free_balance := v_free_balance + v_free_refund;
  v_purchased_balance := v_purchased_balance + v_purchased_refund;

  update public.ai_credits
  set daily_credits_used = v_daily_balance,
      free_credits = v_free_balance,
      purchased_credits = v_purchased_balance,
      total_credits = v_free_balance + v_purchased_balance
  where user_id = v_user_id;

  update public.credit_operations
  set status = 'released',
      actual_credits = 0,
      metadata = metadata || jsonb_build_object('release_reason', left(coalesce(p_reason, 'generation_failed'), 200)),
      settled_at = now()
  where id = v_operation.id;

  insert into public.credit_events (
    user_id, event_type, amount, balance_type, reference_id, description
  ) values (
    v_user_id,
    'adjustment',
    v_operation.reserved_credits,
    case when v_daily_refund + v_free_refund > 0 then 'free' else 'purchased' end,
    v_operation.id::text,
    'Estorno de artefato não concluído'
  );

  return jsonb_build_object('success', true, 'status', 'released');
end;
$$;

revoke all on function public.reserve_ai_artifact(uuid, text) from public, anon;
revoke all on function public.settle_ai_artifact(uuid, jsonb) from public, anon;
revoke all on function public.release_ai_artifact(uuid, text) from public, anon;
grant execute on function public.reserve_ai_artifact(uuid, text) to authenticated;
grant execute on function public.settle_ai_artifact(uuid, jsonb) to authenticated;
grant execute on function public.release_ai_artifact(uuid, text) to authenticated;
