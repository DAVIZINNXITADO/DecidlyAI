-- Contagens diárias agregadas; nenhuma chave de usuário, sessão, mensagem, prompt ou domínio externo é armazenada.
create table if not exists public.site_analytics_daily (
  event_day date not null default (timezone('America/Sao_Paulo', now()))::date,
  event_name text not null check (event_name in ('page_view', 'auth_success', 'chat_topic')),
  page_path text not null default '',
  source_category text not null default '',
  topic text not null default '',
  event_count bigint not null default 0 check (event_count >= 0),
  primary key (event_day, event_name, page_path, source_category, topic)
);
create index if not exists site_analytics_daily_event_day_idx
  on public.site_analytics_daily (event_day desc);

alter table public.site_analytics_daily enable row level security;
revoke all on table public.site_analytics_daily from public, anon, authenticated;
grant all on table public.site_analytics_daily to service_role;

-- Allowlist independente das colunas de perfil, inacessível ao frontend.
create table if not exists public.analytics_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.analytics_admins enable row level security;
revoke all on table public.analytics_admins from public, anon, authenticated;
grant all on table public.analytics_admins to service_role;
-- A allowlist começa vazia. Um administrador só é inserido após confirmação
-- explícita da conta autorizada; campos de perfil não são prova de identidade.

-- Protege plano e modo desenvolvedor contra autoelevação via update do próprio perfil.
-- A aplicação só atualiza os campos listados abaixo pelo cliente; funções de backend
-- continuam usando service_role e podem atualizar campos protegidos quando necessário.
revoke update on table public.profiles from public, anon, authenticated;
grant update (full_name, marketing_email_opt_in, marketing_email_consent_at, marketing_email_consent_source)
  on table public.profiles to authenticated;

create or replace function public.record_site_analytics_event(
  p_event_name text,
  p_page_path text default '',
  p_source_category text default '',
  p_topic text default ''
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_day date := (timezone('America/Sao_Paulo', now()))::date;
  v_path text := '';
  v_source_category text := '';
  v_topic text := '';
begin
  if p_event_name not in ('page_view', 'auth_success', 'chat_topic') then
    raise exception 'unsupported analytics event';
  end if;

  if p_event_name = 'page_view' then
    if p_page_path in (
      '/', '/workspace', '/login', '/reset-password', '/credits', '/credits/buy',
      '/credits/free', '/credits/history', '/auth/confirm', '/settings', '/settings/account',
      '/settings/appearance', '/settings/language', '/settings/preferences', '/blog',
      '/como-funciona', '/como-tomar-decisoes-dificeis', '/ia-para-empreendedores',
      '/ajuda-para-escolher-faculdade', '/tecnologia', '/privacy', '/cookies', '/terms',
      '/promo', '/vip', '/referral-history', '/analytics', '/ai-test',
      '/pt-br/credits', '/pt-br/login', '/pt-br/settings', '/pt-br/workspace'
    ) then
      v_path := p_page_path;
    else
      v_path := '/other';
    end if;
    if coalesce(p_source_category, '') = '' then
      v_source_category := '';
    elsif p_source_category in (
      'direct', 'google', 'bing', 'yahoo', 'duckduckgo', 'facebook', 'instagram',
      'reddit', 'linkedin', 'youtube', 'tiktok', 'whatsapp', 'other_referrer'
    ) then
      v_source_category := p_source_category;
    else
      raise exception 'unsupported source category';
    end if;
  elsif p_event_name = 'chat_topic' then
    if p_topic not in (
      'work_and_study', 'business_and_technology', 'decision_and_planning',
      'creative_and_media', 'sports', 'other'
    ) then
      raise exception 'unsupported analytics topic';
    end if;
    v_topic := p_topic;
  end if;

  insert into public.site_analytics_daily(
    event_day, event_name, page_path, source_category, topic, event_count
  )
  values (v_day, p_event_name, v_path, v_source_category, v_topic, 1)
  on conflict (event_day, event_name, page_path, source_category, topic)
  do update set event_count = public.site_analytics_daily.event_count + 1;
end;
$$;
revoke all on function public.record_site_analytics_event(text, text, text, text) from public, anon, authenticated;
grant execute on function public.record_site_analytics_event(text, text, text, text) to service_role;

create or replace function public.get_site_analytics_period(p_since date)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select jsonb_build_object(
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'event_name', grouped.event_name,
        'page_path', grouped.page_path,
        'source_category', grouped.source_category,
        'topic', grouped.topic,
        'event_count', grouped.event_count
      ) order by grouped.event_name, grouped.page_path, grouped.source_category, grouped.topic)
      from (
        select event_name, page_path, source_category, topic, sum(event_count)::bigint as event_count
        from public.site_analytics_daily
        where event_day >= p_since
        group by event_name, page_path, source_category, topic
      ) as grouped
    ), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('event_day', daily.event_day, 'event_count', daily.event_count)
        order by daily.event_day)
      from (
        select event_day, sum(event_count)::bigint as event_count
        from public.site_analytics_daily
        where event_day >= p_since and event_name = 'page_view'
        group by event_day
      ) as daily
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.get_site_analytics_period(date) from public, anon, authenticated;
grant execute on function public.get_site_analytics_period(date) to service_role;
