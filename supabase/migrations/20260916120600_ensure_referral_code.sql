create or replace function public.ensure_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_code text;
  generated_code text;
begin
  if current_user_id is null then
    return null;
  end if;

  select code into existing_code
  from public.referral_codes
  where user_id = current_user_id
  limit 1;

  if existing_code is not null then
    return existing_code;
  end if;

  generated_code := 'DECIDLY-' || upper(substr(replace(current_user_id::text, '-', ''), 1, 8));

  insert into public.referral_codes (user_id, code)
  values (current_user_id, generated_code)
  on conflict (user_id) do nothing;

  select code into existing_code
  from public.referral_codes
  where user_id = current_user_id
  limit 1;

  return existing_code;
end;
$$;

grant execute on function public.ensure_referral_code() to authenticated;
