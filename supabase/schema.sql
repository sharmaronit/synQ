create extension if not exists pgcrypto;

create table if not exists public.dashboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dataset_name text not null,
  plan jsonb not null,
  kpis jsonb not null,
  charts jsonb not null,
  table_columns jsonb not null,
  insights jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dashboards_user_id_idx on public.dashboards(user_id);
create index if not exists dashboards_updated_at_idx on public.dashboards(updated_at desc);

create or replace function public.update_dashboards_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dashboards_set_updated_at on public.dashboards;
create trigger dashboards_set_updated_at
before update on public.dashboards
for each row
execute function public.update_dashboards_updated_at();

alter table public.dashboards enable row level security;

create policy "Users can read own dashboards"
on public.dashboards
for select
using (auth.uid() = user_id);

create policy "Users can insert own dashboards"
on public.dashboards
for insert
with check (auth.uid() = user_id);

create policy "Users can update own dashboards"
on public.dashboards
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own dashboards"
on public.dashboards
for delete
using (auth.uid() = user_id);
