create table if not exists public.abacatepay_payments (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  external_id text,
  user_id uuid not null references auth.users(id) on delete restrict,
  amount_cents integer,
  credits numeric(12,4) not null,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists abacatepay_payments_user_created_idx on public.abacatepay_payments(user_id, created_at desc);
alter table public.abacatepay_payments enable row level security;
drop policy if exists "Users can read own AbacatePay payments" on public.abacatepay_payments;
create policy "Users can read own AbacatePay payments" on public.abacatepay_payments for select to authenticated using (auth.uid() = user_id);

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
set search_path = public, auth
as $$
declare
  v_payment public.abacatepay_payments%rowtype;
begin
  if p_event_id is null or length(trim(p_event_id)) < 3 then raise exception using errcode = '22023', message = 'event_id_required'; end if;
  if p_user_id is null or p_credits is null or p_credits <= 0 then raise exception using errcode = '22023', message = 'invalid_payment'; end if;
  insert into public.abacatepay_payments(event_id, external_id, user_id, amount_cents, credits, payload)
  values (trim(p_event_id), nullif(trim(coalesce(p_external_id, '')), ''), p_user_id, p_amount_cents, p_credits, coalesce(p_payload, '{}'::jsonb))
  on conflict (event_id) do nothing
  returning * into v_payment;
  if not found then
    return jsonb_build_object('success', true, 'replayed', true, 'event_id', trim(p_event_id));
  end if;
  update public.ai_credits
  set purchased_credits = coalesce(purchased_credits, 0) + p_credits,
      total_credits = coalesce(total_credits, 0) + p_credits
  where user_id = p_user_id;
  if not found then raise exception using errcode = 'P0001', message = 'credit_wallet_unavailable'; end if;
  insert into public.credit_events(user_id, event_type, amount, balance_type, reference_id, description)
  values (p_user_id, 'purchase', p_credits, 'purchased', v_payment.id::text, 'Compra AbacatePay confirmada');
  return jsonb_build_object('success', true, 'replayed', false, 'event_id', v_payment.event_id, 'payment_id', v_payment.id, 'credits', p_credits);
end;
$$;
revoke all on function public.apply_abacatepay_payment(text, uuid, text, integer, numeric, jsonb) from public, anon, authenticated;
