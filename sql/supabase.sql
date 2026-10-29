-- Ejecutar completo en Supabase → SQL Editor → New query → Run

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  service text not null,
  description text not null default '',
  amount numeric(12,2) not null check (amount >= 0),
  paid_date date not null default current_date,
  due_day smallint not null check (due_day between 1 and 31),
  created_at timestamptz not null default now()
);
create index payments_user_date_idx on payments (user_id, paid_date desc);

-- Seguridad: cada usuario ve y modifica solo sus propios pagos.
alter table payments enable row level security;
create policy "ver mis pagos" on payments for select to authenticated using (user_id = auth.uid());
create policy "crear mis pagos" on payments for insert to authenticated with check (user_id = auth.uid());
create policy "editar mis pagos" on payments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eliminar mis pagos" on payments for delete to authenticated using (user_id = auth.uid());

-- Actualización en vivo entre dispositivos.
alter publication supabase_realtime add table payments;
