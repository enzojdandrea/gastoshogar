-- Ejecuta este script en Supabase: SQL Editor > New query > Run

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  service text not null,
  description text not null default '',
  amount numeric(12,2) not null check (amount >= 0),
  paid_date date not null,
  due_day smallint not null check (due_day between 1 and 31),
  created_at timestamptz not null default now()
);

create index if not exists payments_user_date_idx on public.payments (user_id, paid_date desc);

alter table public.payments enable row level security;

create policy "Ver mis pagos" on public.payments
  for select using (auth.uid() = user_id);
create policy "Crear mis pagos" on public.payments
  for insert with check (auth.uid() = user_id);
create policy "Editar mis pagos" on public.payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Eliminar mis pagos" on public.payments
  for delete using (auth.uid() = user_id);
