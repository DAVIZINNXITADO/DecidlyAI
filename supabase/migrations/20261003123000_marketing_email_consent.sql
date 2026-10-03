alter table public.profiles
  add column if not exists marketing_email_opt_in boolean not null default false,
  add column if not exists marketing_email_consent_at timestamptz,
  add column if not exists marketing_email_consent_source text;

comment on column public.profiles.marketing_email_opt_in is
  'Consentimento explícito do usuário para receber e-mails de marketing do DecidlyAI.';
comment on column public.profiles.marketing_email_consent_at is
  'Momento em que o usuário alterou pela última vez o consentimento de marketing.';
comment on column public.profiles.marketing_email_consent_source is
  'Origem do consentimento: signup, google_first_login ou settings.';
