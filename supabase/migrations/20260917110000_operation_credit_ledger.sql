create table if not exists public.credit_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_type text not null,
  status text not null default 'reserved' check (status in ('reserved', 'settled', 'released', 'failed')),
  estimated_credits numeric(12,4) not null default 0,
  reserved_credits numeric(12,4) not null default 0,
  actual_credits numeric(12,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create index if not exists credit_operations_user_created_idx on public.credit_operations(user_id, created_at desc);
alter table public.credit_operations enable row level security;
create policy "Users can read own credit operations" on public.credit_operations for select using (auth.uid() = user_id);

comment on table public.credit_operations is 'Ledger de reserva e ajuste de créditos por operação, separado de tokens.';
