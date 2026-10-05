create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  idioma_preferido text not null default 'pt-BR' check (idioma_preferido in ('pt-BR', 'en-US')),
  tema text not null default 'violet' check (tema in ('violet', 'high_contrast', 'compact')),
  densidade_do_chat text not null default 'comfortable' check (densidade_do_chat in ('comfortable', 'compact')),
  tom_da_ia text not null default 'balanced' check (tom_da_ia in ('direct', 'balanced', 'detailed')),
  modelo_preferido text check (modelo_preferido is null or modelo_preferido in ('auto', 'gpt-4o', 'gpt-4o-mini')),
  notificacoes_de_credito boolean not null default true,
  rolagem_apos_resposta text not null default 'near_bottom' check (rolagem_apos_resposta in ('near_bottom', 'always', 'never')),
  mostrar_indicadores_credito boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
drop policy if exists "Users can read own preferences" on public.user_preferences;
create policy "Users can read own preferences"
  on public.user_preferences for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own preferences" on public.user_preferences;
create policy "Users can insert own preferences"
  on public.user_preferences for insert to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own preferences" on public.user_preferences;
create policy "Users can update own preferences"
  on public.user_preferences for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update on public.user_preferences to authenticated;

alter table public.message_feedback
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists conversation_context text;

create or replace function public.touch_user_preferences_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists user_preferences_updated_at on public.user_preferences;
create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.touch_user_preferences_updated_at();

alter table public.credit_events
  drop constraint if exists credit_events_event_type_check;
alter table public.credit_events
  add constraint credit_events_event_type_check
  check (event_type = any (array['daily_free'::text, 'referral'::text, 'rewarded_ad'::text, 'usage'::text, 'refund'::text, 'adjustment'::text, 'purchase'::text]));

create unique index if not exists abacatepay_payments_external_id_uidx
  on public.abacatepay_payments (external_id)
  where external_id is not null;

create or replace function public.apply_abacatepay_payment(
  p_event_id text,
  p_user_id uuid,
  p_external_id text,
  p_amount_cents integer,
  p_credits numeric,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_payment public.abacatepay_payments%rowtype;
  v_external_id text := nullif(trim(coalesce(p_external_id, '')), '');
begin
  if p_event_id is null or length(trim(p_event_id)) < 3 then
    raise exception using errcode = '22023', message = 'event_id_required';
  end if;
  if p_user_id is null or v_external_id is null or length(v_external_id) > 200 then
    raise exception using errcode = '22023', message = 'invalid_payment_identity';
  end if;
  if p_amount_cents is distinct from 190 or p_credits is distinct from 10 then
    raise exception using errcode = '22023', message = 'invalid_payment_amount_or_credits';
  end if;

  insert into public.abacatepay_payments(event_id, external_id, user_id, amount_cents, credits, status, payload, processed_at)
  values (trim(p_event_id), v_external_id, p_user_id, p_amount_cents, p_credits, 'paid', coalesce(p_payload, '{}'::jsonb), now())
  on conflict do nothing
  returning * into v_payment;
  if not found then
    return jsonb_build_object('success', true, 'replayed', true, 'event_id', trim(p_event_id));
  end if;

  insert into public.ai_credits(user_id, free_credits, purchased_credits, total_credits)
  values (p_user_id, 0, 0, 0)
  on conflict (user_id) do nothing;
  update public.ai_credits
  set purchased_credits = coalesce(purchased_credits, 0) + 10,
      total_credits = coalesce(total_credits, 0) + 10,
      updated_at = now()
  where user_id = p_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'credit_wallet_unavailable';
  end if;

  insert into public.credit_events(user_id, event_type, amount, balance_type, reference_id, description)
  values (p_user_id, 'purchase', 10, 'purchased', v_payment.id::text, 'Compra de 10 créditos via AbacatePay');
  return jsonb_build_object(
    'success', true,
    'replayed', false,
    'event_id', v_payment.event_id,
    'payment_id', v_payment.id,
    'credits', 10
  );
end;
$$;
revoke all on function public.apply_abacatepay_payment(text, uuid, text, integer, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.apply_abacatepay_payment(text, uuid, text, integer, numeric, jsonb) to service_role;
