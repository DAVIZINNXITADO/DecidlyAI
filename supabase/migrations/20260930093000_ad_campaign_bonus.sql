-- Grants the public ad campaign bonus once for a newly created account.
create or replace function public.claim_ad_campaign_bonus(campaign text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  account_created_at timestamptz;
  already_claimed boolean;
begin
  if current_user_id is null or campaign <> 'ad-25' then
    return false;
  end if;

  select created_at into account_created_at
  from auth.users
  where id = current_user_id;

  if account_created_at is null or account_created_at < now() - interval '15 minutes' then
    return false;
  end if;

  select exists(
    select 1 from public.credit_events
    where user_id = current_user_id
      and event_type = 'adjustment'
      and description = 'Bônus da campanha pública ad-25'
  ) into already_claimed;

  if already_claimed then
    return false;
  end if;

  update public.ai_credits
  set free_credits = free_credits + 25,
      total_credits = total_credits + 25
  where user_id = current_user_id;

  if not found then
    return false;
  end if;

  insert into public.credit_events(user_id, event_type, amount, balance_type, description)
  values (current_user_id, 'adjustment', 25, 'free', 'Bônus da campanha pública ad-25');

  return true;
end;
$$;

grant execute on function public.claim_ad_campaign_bonus(text) to authenticated;
