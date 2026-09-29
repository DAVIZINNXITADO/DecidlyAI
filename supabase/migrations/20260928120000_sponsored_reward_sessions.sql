create table if not exists public.sponsored_reward_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sponsored_reward_sessions_user_day_idx on public.sponsored_reward_sessions(user_id, created_at desc);
alter table public.sponsored_reward_sessions enable row level security;
create policy "Users can read own sponsored sessions" on public.sponsored_reward_sessions for select using (auth.uid() = user_id);

create or replace function public.start_sponsored_reward()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare session_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if (select count(*) from public.sponsored_reward_sessions where user_id = auth.uid() and claimed_at is not null and (created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date) >= 2 then
    raise exception 'DAILY_SPONSORED_LIMIT';
  end if;
  insert into public.sponsored_reward_sessions(user_id) values (auth.uid()) returning id into session_id;
  return session_id;
end;
$$;

grant execute on function public.start_sponsored_reward() to authenticated;

create or replace function public.claim_sponsored_reward(session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare session_row public.sponsored_reward_sessions%rowtype;
reward numeric := 1.25;
claimed_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into session_row from public.sponsored_reward_sessions where id = session_id and user_id = auth.uid() for update;
  if session_row.id is null then raise exception 'SESSION_NOT_FOUND'; end if;
  if session_row.claimed_at is not null then raise exception 'SESSION_ALREADY_CLAIMED'; end if;
  if extract(epoch from (now() - session_row.started_at)) < 15 then raise exception 'WAIT_REQUIRED'; end if;
  select count(*) into claimed_count from public.sponsored_reward_sessions where user_id = auth.uid() and claimed_at is not null and (created_at at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date;
  if claimed_count >= 2 then raise exception 'DAILY_SPONSORED_LIMIT'; end if;
  update public.sponsored_reward_sessions set claimed_at = now() where id = session_id;
  update public.ai_credits set free_credits = coalesce(free_credits, 0) + reward, total_credits = coalesce(total_credits, 0) + reward where user_id = auth.uid();
  insert into public.credit_events(user_id, event_type, amount, balance_type, description) values (auth.uid(), 'rewarded_ad', reward, 'free', 'Visita patrocinada concluída');
  return jsonb_build_object('credits', reward, 'claims_today', claimed_count + 1, 'daily_limit', 2);
end;
$$;

grant execute on function public.claim_sponsored_reward(uuid) to authenticated;
