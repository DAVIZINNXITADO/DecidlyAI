-- Preserve the standard 25-credit referral reward and support the workspace campaign at 30.
create or replace function public.initialize_ai_credit_wallet()
returns trigger
language plpgsql
security definer
set search_path to public
as $$
declare
  invited_code text;
  inviter uuid;
  initial_daily numeric;
  initial_limit numeric;
  reward numeric;
begin
  initial_limit := case when lower(coalesce(new.raw_user_meta_data->>'plan','free')) = 'vip' then 100 else 10 end;
  initial_daily := case when initial_limit = 100 then 10 else 5 end;
  insert into public.ai_credits(user_id, free_credits, purchased_credits, total_credits, daily_credits_used, daily_credits_limit, daily_credits_reset_at)
  values (new.id, 25, 0, 25, initial_daily, initial_limit, (timezone('America/Sao_Paulo', now()))::date)
  on conflict (user_id) do nothing;
  insert into public.credit_events(user_id, event_type, amount, balance_type, description)
  values (new.id, 'adjustment', 25, 'free', 'Bônus inicial de cadastro');
  invited_code := new.raw_user_meta_data->>'referral_code';
  if invited_code is not null and invited_code <> '' then
    select user_id into inviter from public.referral_codes where code = invited_code limit 1;
    if inviter is not null and inviter <> new.id then
      reward := case when new.raw_user_meta_data->>'referral_campaign' = 'invite-30' then 30 else 25 end;
      insert into public.referral_events(inviter_user_id, invited_user_id, code, reward_credits)
      values (inviter, new.id, invited_code, reward)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.qualify_referral_for_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path to public
as $$
declare
  event_row record;
  reward numeric;
begin
  select * into event_row from public.referral_events
  where invited_user_id = target_user and status = 'pending'
  order by created_at asc limit 1;
  if event_row.id is null then return; end if;
  reward := coalesce(event_row.reward_credits, 25);
  update public.referral_events set status = 'qualified', qualified_at = now() where id = event_row.id;
  update public.ai_credits set free_credits = free_credits + reward, total_credits = total_credits + reward
  where user_id in (event_row.inviter_user_id, event_row.invited_user_id);
  insert into public.credit_events(user_id, event_type, amount, balance_type, reference_id, description)
  values
    (event_row.inviter_user_id, 'referral', reward, 'free', event_row.id::text, 'Convite qualificado após primeira mensagem'),
    (event_row.invited_user_id, 'referral', reward, 'free', event_row.id::text, 'Bônus de indicação após primeira mensagem');
end;
$$;
