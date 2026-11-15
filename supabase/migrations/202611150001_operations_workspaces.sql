create table if not exists public.operations_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  data jsonb not null default '{"opportunities":[],"projects":[],"risks":[],"kpis":[],"costCenters":[],"expenses":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint operations_workspaces_data_is_object check (jsonb_typeof(data) = 'object')
);

alter table public.operations_workspaces enable row level security;

drop policy if exists "Users can read their own operations workspace" on public.operations_workspaces;
create policy "Users can read their own operations workspace"
  on public.operations_workspaces for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own operations workspace" on public.operations_workspaces;
create policy "Users can create their own operations workspace"
  on public.operations_workspaces for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own operations workspace" on public.operations_workspaces;
create policy "Users can update their own operations workspace"
  on public.operations_workspaces for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.operations_workspaces to authenticated;
