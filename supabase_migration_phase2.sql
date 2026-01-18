-- Migration: Phase 2 - Investments and Business Entities

-- 1. Create Investments Table
create table if not exists public.investments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  ticker text,
  type text not null, -- 'stock', 'crypto', 'real_estate', etc.
  strategy text not null, -- 'passive', 'active'
  quantity numeric default 0,
  cost_basis numeric default 0,
  current_price numeric default 0,
  currency text default 'USD',
  last_updated timestamptz default now(),
  notes text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.investments enable row level security;

-- Policies
create policy "Users can view their own investments"
  on public.investments for select
  using (auth.uid() = user_id);

create policy "Users can insert their own investments"
  on public.investments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own investments"
  on public.investments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own investments"
  on public.investments for delete
  using (auth.uid() = user_id);


-- 2. Create Business Entities Table
create table if not exists public.business_entities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  type text not null, -- 'store', 'channel', etc.
  parent_id uuid references public.business_entities(id),
  custom_metrics_config jsonb default '[]'::jsonb,
  custom_metrics_values jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.business_entities enable row level security;

-- Policies
create policy "Users can view their own business entities"
  on public.business_entities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own business entities"
  on public.business_entities for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own business entities"
  on public.business_entities for update
  using (auth.uid() = user_id);

create policy "Users can delete their own business entities"
  on public.business_entities for delete
  using (auth.uid() = user_id);
