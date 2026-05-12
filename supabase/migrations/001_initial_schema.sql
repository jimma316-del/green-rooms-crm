-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (mirrors auth.users with extra fields)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'sales' check (role in ('admin', 'sales', 'operations')),
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Users can read all team members, update only themselves
create policy "users_read_all" on public.users for select using (auth.role() = 'authenticated');
create policy "users_update_own" on public.users for update using (auth.uid() = id);
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);

-- Auto-create user record on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- LEADS
-- ============================================================
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Contact
  name text not null,
  mobile text,
  email text,
  address text,
  postcode text,

  -- Project
  project_type text check (project_type in ('garden_room','office','gym','golf_sim','studio','other')),
  budget_min int,
  budget_max int,
  approx_size_sqm decimal,
  notes text,

  -- Pipeline
  stage text not null default 'new_lead',
  pipeline text not null default 'sales' check (pipeline in ('sales','project','lost')),
  lost_reason text,
  lost_notes text,

  -- Source
  lead_source text default 'manual',
  source_referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,

  -- Assignment
  assigned_to uuid references public.users(id) on delete set null,

  -- Calculator data
  calculator_data jsonb,

  -- Flags
  is_hot boolean not null default false,
  tags text[] not null default '{}'
);

alter table public.leads enable row level security;
create policy "leads_all_authenticated" on public.leads for all using (auth.role() = 'authenticated');

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on public.leads
  for each row execute procedure public.update_updated_at();

-- Indexes
create index leads_stage_idx on public.leads(stage);
create index leads_pipeline_idx on public.leads(pipeline);
create index leads_assigned_to_idx on public.leads(assigned_to);
create index leads_postcode_idx on public.leads(postcode);
create index leads_is_hot_idx on public.leads(is_hot);
create index leads_created_at_idx on public.leads(created_at desc);

-- ============================================================
-- STAGE HISTORY
-- ============================================================
create table public.stage_history (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  changed_by uuid references public.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  note text
);

alter table public.stage_history enable row level security;
create policy "stage_history_all_authenticated" on public.stage_history for all using (auth.role() = 'authenticated');

create index stage_history_lead_idx on public.stage_history(lead_id);

-- ============================================================
-- ACTIVITIES
-- ============================================================
create table public.activities (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null,
  type text not null,
  body text,
  metadata jsonb
);

alter table public.activities enable row level security;
create policy "activities_all_authenticated" on public.activities for all using (auth.role() = 'authenticated');

create index activities_lead_idx on public.activities(lead_id);
create index activities_created_at_idx on public.activities(created_at desc);

-- ============================================================
-- TASKS
-- ============================================================
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  assigned_to uuid references public.users(id) on delete set null,
  title text not null,
  due_date timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.users(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  type text not null default 'other' check (type in ('call','email','followup','site_survey','other'))
);

alter table public.tasks enable row level security;
create policy "tasks_all_authenticated" on public.tasks for all using (auth.role() = 'authenticated');

create index tasks_lead_idx on public.tasks(lead_id);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_completed_at_idx on public.tasks(completed_at);

-- ============================================================
-- QUOTES
-- ============================================================
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  quote_number text not null unique,
  status text not null default 'draft' check (status in ('draft','sent','viewed','accepted','rejected')),
  total_amount int not null default 0,
  line_items jsonb not null default '[]',
  notes text,
  sent_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  file_url text
);

alter table public.quotes enable row level security;
create policy "quotes_all_authenticated" on public.quotes for all using (auth.role() = 'authenticated');

create index quotes_lead_idx on public.quotes(lead_id);

-- Quote number sequence
create sequence quote_number_seq start 1;

create or replace function public.next_quote_number()
returns text language plpgsql as $$
begin
  return 'GR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quote_number_seq')::text, 3, '0');
end;
$$;

-- ============================================================
-- PAYMENTS
-- ============================================================
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null check (type in ('deposit','final','other')),
  amount int not null,
  received_at timestamptz not null default now(),
  recorded_by uuid references public.users(id) on delete set null,
  notes text
);

alter table public.payments enable row level security;
create policy "payments_all_authenticated" on public.payments for all using (auth.role() = 'authenticated');

create index payments_lead_idx on public.payments(lead_id);
