-- Allows an authenticated OAuth signup to claim the referral captured on the login page.
create or replace function public.claim_referral_for_user(invited_code text, campaign text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  inviter uuid;
  reward numeric;
  event_id uuid;
begin
  if current_user_id is null or invited_code is null or invited_code = '' then
    return false;
  end if;

  select user_id into inviter
  from public.referral_codes
  where code = invited_code
  limit 1;

  if inviter is null or inviter = current_user_id then
    return false;
  end if;

  select id into event_id
  from public.referral_events
  where invited_user_id = current_user_id
  limit 1;

  if event_id is not null then
    return false;
  end if;

  reward := case when campaign = 'invite-30' then 30 else 25 end;
  insert into public.referral_events(inviter_user_id, invited_user_id, code, reward_credits)
  values (inviter, current_user_id, invited_code, reward)
  returning id into event_id;

  perform public.qualify_referral_for_user(current_user_id);
  return true;
end;
$$;

grant execute on function public.claim_referral_for_user(text, text) to authenticated;
