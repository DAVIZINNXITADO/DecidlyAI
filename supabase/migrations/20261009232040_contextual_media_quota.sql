-- Reserva idempotente de uma busca visual por conversa; é um ledger de operação, não analytics.
create table if not exists public.contextual_media_uses (
  conversation_id uuid primary key references public.conversations(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.contextual_media_uses enable row level security;
revoke all on table public.contextual_media_uses from public, anon, authenticated;
grant all on table public.contextual_media_uses to service_role;

create or replace function public.claim_contextual_media_use(
  p_user_id uuid,
  p_conversation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  inserted_rows integer;
begin
  if not exists (
    select 1
    from public.conversations
    where id = p_conversation_id and user_id = p_user_id
  ) then
    return false;
  end if;

  insert into public.contextual_media_uses (conversation_id)
  values (p_conversation_id)
  on conflict (conversation_id) do nothing;

  get diagnostics inserted_rows = row_count;
  return inserted_rows = 1;
end;
$$;

revoke all on function public.claim_contextual_media_use(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_contextual_media_use(uuid, uuid) to service_role;
