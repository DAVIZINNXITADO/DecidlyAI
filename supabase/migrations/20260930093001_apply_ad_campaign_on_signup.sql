-- Apply the public ad campaign bonus during email/password signup as well as OAuth signup.
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
  initial_limit := case when lower(coalesce(new.raw_user_meta_data->>'plan','free')) = 'vip' then 100 else 5 end;
  initial_daily := case when initial_limit = 100 then 10 else 5 end;

  insert into public.ai_credits(user_id, free_credits, purchased_credits, total_credits, daily_credits_used, daily_credits_limit, daily_credits_reset_at)
  values (new.id, 25, 0, 25, initial_daily, initial_limit, (timezone('America/Sao_Paulo', now()))::date)
  on conflict (user_id) do nothing;

  insert into public.credit_events(user_id, event_type, amount, balance_type, description)
  values (new.id, 'adjustment', 25, 'free', 'Bônus inicial de cadastro');

  if new.raw_user_meta_data->>'referral_campaign' = 'ad-25' then
    update public.ai_credits
    set free_credits = free_credits + 25,
        total_credits = total_credits + 25
    where user_id = new.id;

    insert into public.credit_events(user_id, event_type, amount, balance_type, description)
    values (new.id, 'adjustment', 25, 'free', 'Bônus da campanha pública ad-25');
  end if;

  invited_code := new.raw_user_meta_data->>'referral_code';
  if invited_code is not null and invited_code <> '' then
    select user_id into inviter from public.referral_codes where code = invited_code limit 1;
    if inviter is not null and inviter <> new.id then
      reward := case when new.raw_user_meta_data->>'referral_campaign' = 'invite-30' then 30 else 25 end;
      insert into public.referral_events(inviter_user_id, invited_user_id, code, reward_credits)
      values (inviter, new.id, invited_code, reward)
      on conflict do nothing;
      perform public.qualify_referral_for_user(new.id);
    end if;
  end if;

  return new;
end;
$$;
