-- ============================================================
-- STAGE 1: QUOTING SYSTEM — FULL SCHEMA
-- ============================================================
-- This migration:
--   1. Renames the old simple `quotes` table to `quotes_legacy`
--   2. Creates the full versioned quoting system
--   3. Extends `tasks` with a quote_id FK and new type
-- ============================================================

-- ============================================================
-- STEP 1: PRESERVE THE OLD QUOTES TABLE
-- ============================================================
-- Rename to _legacy so any existing data survives.
-- The old table had a flat structure with line_items jsonb —
-- it is kept purely for historical reference.

alter table public.quotes rename to quotes_legacy;
alter index quotes_lead_idx rename to quotes_legacy_lead_idx;

-- ============================================================
-- STEP 2: T&Cs VERSIONING
-- ============================================================
-- When a quote is sent, it is pinned to the T&Cs version
-- that was current at that time.  Clients can't claim the
-- T&Cs changed after they accepted.

create table public.tc_versions (
  id           uuid primary key default uuid_generate_v4(),
  version_tag  text not null,               -- e.g. "v1.0", "2026-01"
  content_html text not null,               -- full T&Cs body as HTML
  is_current   boolean not null default false,
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Only one row can have is_current = true.
-- Enforced by a partial unique index.
create unique index tc_versions_current_idx on public.tc_versions(is_current)
  where is_current = true;

alter table public.tc_versions enable row level security;
create policy "tc_versions_read" on public.tc_versions
  for select using (auth.role() = 'authenticated');
create policy "tc_versions_write" on public.tc_versions
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'sales')
    )
  );
grant all on table public.tc_versions to service_role;

-- ============================================================
-- STEP 3: PRODUCT CATALOGUE
-- ============================================================
-- All configurable items and their base prices.
-- Prices stored in pence to avoid float rounding issues.

create table public.product_catalogue (
  id              uuid primary key default uuid_generate_v4(),
  category        text not null,           -- 'room_shell','window','door','bifold',
                                           -- 'internal_door','ceiling','wall','floor',
                                           -- 'electrics','cladding','extras','delivery'
  sku             text unique,             -- optional internal code
  name            text not null,
  description     text,
  unit            text not null default 'item',
                                           -- 'item','m2','linear_m','each'
  base_price_pence int not null default 0, -- 0 = price set manually / by size band
  is_active       boolean not null default true,
  is_size_banded  boolean not null default false,
                                           -- true = price comes from product_size_pricing
  vat_rate        numeric(5,4) not null default 0.2000,
                                           -- 0.2000 = 20% standard, 0.0000 = zero-rated
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index product_catalogue_category_idx on public.product_catalogue(category);
create index product_catalogue_active_idx on public.product_catalogue(is_active);

alter table public.product_catalogue enable row level security;
create policy "product_catalogue_read" on public.product_catalogue
  for select using (auth.role() = 'authenticated');
create policy "product_catalogue_write" on public.product_catalogue
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'sales')
    )
  );
grant all on table public.product_catalogue to service_role;

-- ============================================================
-- STEP 4: SIZE-BANDED PRICING
-- ============================================================
-- For items whose price per m2 varies by overall floor area
-- (e.g. the room shell is cheaper per m2 at larger sizes).

create table public.product_size_pricing (
  id               uuid primary key default uuid_generate_v4(),
  product_id       uuid not null references public.product_catalogue(id) on delete cascade,
  min_m2           numeric(8,2) not null default 0,
  max_m2           numeric(8,2),            -- null = no upper limit
  price_per_m2_pence int not null,          -- in pence
  flat_fee_pence   int not null default 0,  -- added on top of the per-m2 component
  sort_order       int not null default 0
);

create index product_size_pricing_product_idx on public.product_size_pricing(product_id);

alter table public.product_size_pricing enable row level security;
create policy "product_size_pricing_read" on public.product_size_pricing
  for select using (auth.role() = 'authenticated');
create policy "product_size_pricing_write" on public.product_size_pricing
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'sales')
    )
  );
grant all on table public.product_size_pricing to service_role;

-- ============================================================
-- STEP 5: QUOTE TEMPLATES
-- ============================================================
-- Saved starting configurations so the salesperson doesn't
-- build from scratch on every site visit.

create table public.quote_templates (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  description   text,
  is_active     boolean not null default true,
  -- Ordered array of section configs, each section has a title,
  -- sort_order, and array of default line item product_ids to pre-populate.
  default_config jsonb not null default '{
    "sections": [],
    "payment_schedule": [
      {"milestone": "deposit",    "label": "Deposit on booking",          "percentage": 10},
      {"milestone": "day_1",      "label": "Day 1 — materials delivery",  "percentage": 50},
      {"milestone": "plastering", "label": "Plastering / second fix",     "percentage": 30},
      {"milestone": "completion", "label": "Balance on completion",       "percentage": 10}
    ]
  }'::jsonb,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.quote_templates enable row level security;
create policy "quote_templates_read" on public.quote_templates
  for select using (auth.role() = 'authenticated');
create policy "quote_templates_write" on public.quote_templates
  for all using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role in ('admin', 'sales')
    )
  );
grant all on table public.quote_templates to service_role;

-- ============================================================
-- STEP 6: NEW QUOTES TABLE (PARENT RECORD)
-- ============================================================
-- One row per enquiry/project. Multiple versions hang off this.
-- Uses TGR-YYYY-NNN reference format (vs the old GR- prefix).

create sequence tgr_quote_number_seq start 1;

create or replace function public.next_tgr_quote_ref()
returns text language plpgsql as $$
begin
  return 'TGR-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('tgr_quote_number_seq')::text, 3, '0');
end;
$$;

create table public.quotes (
  id              uuid primary key default uuid_generate_v4(),
  lead_id         uuid not null references public.leads(id) on delete cascade,
  quote_ref       text not null unique default public.next_tgr_quote_ref(),
  template_id     uuid references public.quote_templates(id) on delete set null,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  archived_at     timestamptz   -- set when project is complete or abandoned
);

create index quotes_lead_idx on public.quotes(lead_id);
create index quotes_created_at_idx on public.quotes(created_at desc);

alter table public.quotes enable row level security;
create policy "quotes_all_authenticated" on public.quotes
  for all using (auth.role() = 'authenticated');
grant all on table public.quotes to service_role;

-- ============================================================
-- STEP 7: QUOTE VERSIONS
-- ============================================================
-- Each revision of the quote. version_number increments from 1.
-- Only one version per quote should be is_current = true.

create table public.quote_versions (
  id              uuid primary key default uuid_generate_v4(),
  quote_id        uuid not null references public.quotes(id) on delete cascade,
  version_number  int not null default 1,
  status          text not null default 'draft'
                    check (status in ('draft','sent','viewed','accepted','rejected','superseded')),
  title           text,                    -- optional label e.g. "Revised spec - Oct 2026"
  internal_notes  text,
  cover_letter    text,                    -- personalised intro paragraph sent to client
  total_pence     int not null default 0,  -- stored/updated when line items change
  tc_version_id   uuid references public.tc_versions(id) on delete restrict,
  is_current      boolean not null default true,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz,
  viewed_at       timestamptz,
  responded_at    timestamptz,
  pdf_url         text,                    -- generated PDF stored in Supabase Storage
  unique (quote_id, version_number)
);

create index quote_versions_quote_idx on public.quote_versions(quote_id);
create index quote_versions_status_idx on public.quote_versions(status);

alter table public.quote_versions enable row level security;
create policy "quote_versions_all_authenticated" on public.quote_versions
  for all using (auth.role() = 'authenticated');
grant all on table public.quote_versions to service_role;

-- ============================================================
-- STEP 8: QUOTE SECTIONS
-- ============================================================
-- Sections group line items within a version.
-- e.g. "Room Shell", "Glazing", "Internal Fit-Out",
--      "Electrical", "Extras", "Sundries"

create table public.quote_sections (
  id               uuid primary key default uuid_generate_v4(),
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  title            text not null,
  sort_order       int not null default 0,
  show_subtotal    boolean not null default true,
  notes            text                     -- printed on quote under section header
);

create index quote_sections_version_idx on public.quote_sections(quote_version_id);

alter table public.quote_sections enable row level security;
create policy "quote_sections_all_authenticated" on public.quote_sections
  for all using (auth.role() = 'authenticated');
grant all on table public.quote_sections to service_role;

-- ============================================================
-- STEP 9: QUOTE LINE ITEMS
-- ============================================================
-- Individual priced rows within a section.

create table public.quote_line_items (
  id               uuid primary key default uuid_generate_v4(),
  section_id       uuid not null references public.quote_sections(id) on delete cascade,
  product_id       uuid references public.product_catalogue(id) on delete set null,
                                            -- null = custom / one-off item
  name             text not null,
  description      text,                    -- printed spec detail on quote
  quantity         numeric(10,3) not null default 1,
  unit             text not null default 'item',
  unit_price_pence int not null default 0,
  line_total_pence int not null default 0,  -- quantity * unit_price_pence (maintained by app)
  is_optional      boolean not null default false,
  is_included      boolean not null default true,
                                            -- for optional items: whether included in total
  sort_order       int not null default 0,
  internal_notes   text                     -- not printed on client-facing quote
);

create index quote_line_items_section_idx on public.quote_line_items(section_id);
create index quote_line_items_product_idx on public.quote_line_items(product_id);

alter table public.quote_line_items enable row level security;
create policy "quote_line_items_all_authenticated" on public.quote_line_items
  for all using (auth.role() = 'authenticated');
grant all on table public.quote_line_items to service_role;

-- ============================================================
-- STEP 10: QUOTE ASSETS
-- ============================================================
-- Photos, floor plan PDFs, and SVG elevation diagrams
-- attached to a quote version.

create table public.quote_assets (
  id               uuid primary key default uuid_generate_v4(),
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  asset_type       text not null
                     check (asset_type in (
                       'site_photo','floorplan','elevation_svg',
                       'render','spec_sheet','other'
                     )),
  storage_path     text,                    -- path in Supabase Storage bucket
  public_url       text,
  caption          text,
  sort_order       int not null default 0,
  -- SVG-specific: which face of the building this elevation shows
  elevation_face   text check (elevation_face in ('front','rear','left','right','internal')),
  svg_data         text,                    -- raw SVG markup (stored directly for easy re-render)
  width_mm         int,                     -- drawn dimensions in mm (for annotations)
  height_mm        int,
  created_at       timestamptz not null default now()
);

create index quote_assets_version_idx on public.quote_assets(quote_version_id);

alter table public.quote_assets enable row level security;
create policy "quote_assets_all_authenticated" on public.quote_assets
  for all using (auth.role() = 'authenticated');
grant all on table public.quote_assets to service_role;

-- ============================================================
-- STEP 11: PAYMENT SCHEDULES
-- ============================================================
-- Milestone-based payment plan for each quote version.
-- When a deposit is paid, the first Xero invoice is pushed.
-- Each subsequent milestone creates its own Xero invoice.

create table public.payment_schedules (
  id                   uuid primary key default uuid_generate_v4(),
  quote_version_id     uuid not null references public.quote_versions(id) on delete cascade,
  milestone            text not null,
                         -- 'deposit','day_1','first_fix','plastering',
                         -- 'second_fix','completion','other'
  label                text not null,           -- client-facing label
  amount_pence         int not null default 0,  -- absolute amount (derived from % of total)
  percentage           numeric(5,2),            -- percentage of total quote (informational)
  due_trigger          text not null,
                         -- 'on_booking','on_start','on_plastering',
                         -- 'on_second_fix','on_completion','on_date'
  due_date             date,                    -- used when due_trigger = 'on_date'
  sort_order           int not null default 0,
  -- Xero integration — populated when invoice is created
  xero_invoice_id      text,
  xero_invoice_number  text,
  xero_pushed_at       timestamptz,
  -- Payment tracking
  paid_at              timestamptz,
  payment_ref          text                     -- bank transfer reference or cheque number
);

create index payment_schedules_version_idx on public.payment_schedules(quote_version_id);
create index payment_schedules_unpaid_idx  on public.payment_schedules(paid_at)
  where paid_at is null;

alter table public.payment_schedules enable row level security;
create policy "payment_schedules_all_authenticated" on public.payment_schedules
  for all using (auth.role() = 'authenticated');
grant all on table public.payment_schedules to service_role;

-- ============================================================
-- STEP 12: QUOTE EMAILS
-- ============================================================
-- Audit log of every email sent to the client with a quote.
-- One row per send (including resends and follow-ups).

create table public.quote_emails (
  id               uuid primary key default uuid_generate_v4(),
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  sent_by          uuid references public.users(id) on delete set null,
  sent_at          timestamptz not null default now(),
  recipient_email  text not null,
  recipient_name   text,
  subject          text not null,
  body_html        text,
  quote_pdf_url    text,                    -- S3/storage URL of the attached PDF
  -- Open/click tracking (populated by webhook from email provider)
  opened_at        timestamptz,
  email_provider_id text                   -- Resend / SendGrid message ID for tracking
);

create index quote_emails_version_idx on public.quote_emails(quote_version_id);
create index quote_emails_sent_at_idx on public.quote_emails(sent_at desc);

alter table public.quote_emails enable row level security;
create policy "quote_emails_all_authenticated" on public.quote_emails
  for all using (auth.role() = 'authenticated');
grant all on table public.quote_emails to service_role;

-- ============================================================
-- STEP 13: QUOTE VARIATIONS (CHANGE ORDERS)
-- ============================================================
-- Post-booking amendments raised during the build.
-- These are separate from quote versions — a variation is a
-- delta to the agreed spec, potentially requiring client sign-off
-- and an additional Xero invoice.

create table public.quote_variations (
  id               uuid primary key default uuid_generate_v4(),
  quote_id         uuid not null references public.quotes(id) on delete cascade,
  lead_id          uuid not null references public.leads(id) on delete cascade,
  variation_number int not null default 1,
  variation_ref    text not null unique,    -- e.g. TGR-2026-001-VO1
  title            text not null,
  description      text,
  status           text not null default 'draft'
                     check (status in ('draft','sent','approved','rejected')),
  total_pence      int not null default 0,  -- net change amount (can be negative for credits)
  -- Flat line items for simplicity (variations tend to be brief)
  line_items       jsonb not null default '[]',
  created_by       uuid references public.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  sent_at          timestamptz,
  approved_at      timestamptz,
  approved_by      text,                    -- client name / initials
  -- Xero
  xero_invoice_id  text,
  xero_invoice_number text,
  unique (quote_id, variation_number)
);

create index quote_variations_quote_idx  on public.quote_variations(quote_id);
create index quote_variations_lead_idx   on public.quote_variations(lead_id);
create index quote_variations_status_idx on public.quote_variations(status);

alter table public.quote_variations enable row level security;
create policy "quote_variations_all_authenticated" on public.quote_variations
  for all using (auth.role() = 'authenticated');
grant all on table public.quote_variations to service_role;

-- ============================================================
-- STEP 14: EXTEND TASKS TABLE
-- ============================================================
-- Add a quote_id FK so tasks can be linked to a specific quote.
-- Add 'quote_followup' to the type enum.

alter table public.tasks
  add column if not exists quote_id uuid
    references public.quotes(id) on delete set null;

create index tasks_quote_idx on public.tasks(quote_id) where quote_id is not null;

-- Extend type constraint to include quote_followup
alter table public.tasks drop constraint if exists tasks_type_check;
alter table public.tasks add constraint tasks_type_check
  check (type in (
    'quote','amend_quote','amend_design','in_person_meeting',
    'send_info','whatsapp','call','email','quote_followup'
  ))
  not valid;

-- ============================================================
-- STEP 15: SEED — DEFAULT PRODUCT CATALOGUE
-- ============================================================
-- Initial items matching the standard TGR quote structure.
-- Prices are illustrative; update via the CRM Product Catalogue UI.
-- All prices in pence, ex-VAT.

insert into public.product_catalogue
  (category, sku, name, description, unit, base_price_pence, is_size_banded, sort_order)
values
  -- Room shell — price depends on floor area; base_price_pence = 0 (use size bands)
  ('room_shell', 'SHELL-001', 'Garden Room Shell',
   'Timber-frame structure, OSB sheathing, breathable membrane, insulated wall, roof and floor',
   'm2', 0, true, 10),

  -- Cladding
  ('cladding', 'CLAD-LARCH', 'Larch Featheredge Cladding',
   'Pressure-treated larch featheredge vertical or horizontal, including battens and fixings',
   'm2', 9000, false, 20),
  ('cladding', 'CLAD-COMP', 'Composite Cladding',
   'Low-maintenance composite board cladding, various colours',
   'm2', 14000, false, 21),
  ('cladding', 'CLAD-RENDER', 'Render Finish',
   'Base coat + through-colour silicone render on insulation board',
   'm2', 8500, false, 22),

  -- Windows
  ('window', 'WIN-UPVC-FIXED', 'uPVC Fixed Window',
   'White uPVC fixed light, A-rated double glazed unit',
   'item', 55000, false, 30),
  ('window', 'WIN-UPVC-CASM', 'uPVC Casement Window',
   'White uPVC casement opening window, A-rated double glazed',
   'item', 65000, false, 31),
  ('window', 'WIN-ALU-FIXED', 'Aluminium Fixed Window',
   'Powder-coated aluminium fixed light, slim sightlines',
   'item', 75000, false, 32),
  ('window', 'WIN-ALU-CASM', 'Aluminium Casement Window',
   'Powder-coated aluminium casement, slim sightlines',
   'item', 85000, false, 33),
  ('window', 'WIN-ROOF', 'Roof Light / Velux',
   'Flat roof light or pitched Velux, double glazed, opening',
   'item', 80000, false, 35),

  -- Bi-fold / sliding doors
  ('bifold', 'BIFOLD-2P', 'Bi-fold Doors — 2 Panel',
   'White uPVC or aluminium bi-fold, double glazed, threshold',
   'item', 220000, false, 40),
  ('bifold', 'BIFOLD-3P', 'Bi-fold Doors — 3 Panel',
   'White uPVC or aluminium bi-fold, double glazed, threshold',
   'item', 310000, false, 41),
  ('bifold', 'BIFOLD-4P', 'Bi-fold Doors — 4 Panel',
   'White uPVC or aluminium bi-fold, double glazed, threshold',
   'item', 390000, false, 42),
  ('bifold', 'SLIDE-2P', 'Sliding Patio Doors — 2 Panel',
   'Aluminium slim-frame sliding patio doors',
   'item', 280000, false, 45),

  -- Internal doors
  ('internal_door', 'DOOR-INT-SOLID', 'Internal Solid-Core Door',
   'Solid-core primed door, white frame, satin chrome ironmongery',
   'item', 45000, false, 50),

  -- External door
  ('door', 'DOOR-EXT-COMP', 'Composite External Door',
   'Composite entrance door, multipoint lock, satin chrome handles',
   'item', 120000, false, 55),

  -- Internal finish — ceiling
  ('ceiling', 'CEIL-PB', 'Plasterboard Ceiling',
   'Plasterboard, skim-coat, ready to paint',
   'm2', 3500, false, 60),
  ('ceiling', 'CEIL-TIMBER', 'Timber-Lined Ceiling',
   'Tongue-and-groove timber panel ceiling, lacquered or painted',
   'm2', 5500, false, 61),

  -- Internal finish — walls
  ('wall', 'WALL-PB', 'Plasterboard Walls',
   'Plasterboard, skim-coat or jointed and filled, ready to paint',
   'm2', 3000, false, 70),
  ('wall', 'WALL-TIMBER', 'Timber Wall Panelling',
   'Tongue-and-groove or shiplap timber panels',
   'm2', 5000, false, 71),

  -- Internal finish — floor
  ('floor', 'FLOOR-LVT', 'LVT Flooring',
   'Luxury vinyl tile, click system, including underlay',
   'm2', 4500, false, 80),
  ('floor', 'FLOOR-TIMBER', 'Engineered Timber Floor',
   'Engineered oak or similar, floating, including underlay',
   'm2', 8500, false, 81),
  ('floor', 'FLOOR-TILE', 'Ceramic / Porcelain Tiling',
   'Floor tiles including adhesive, grout and edge trims',
   'm2', 7000, false, 82),
  ('floor', 'FLOOR-SCREED', 'Liquid Screed',
   'Anhydrite liquid screed, including primer and expansion strips',
   'm2', 3000, false, 83),

  -- Electrics
  ('electrics', 'ELEC-PKG-STD', 'Standard Electrical Package',
   'Consumer unit, armoured cable run, sockets, switches, downlights, heating circuit',
   'item', 280000, false, 90),
  ('electrics', 'ELEC-PKG-PRE', 'Premium Electrical Package',
   'All standard items plus underfloor heating, data points, TV point, external socket',
   'item', 380000, false, 91),
  ('electrics', 'ELEC-UFH', 'Electric Underfloor Heating',
   'Electric UFH mat under LVT or tile (add-on to standard package)',
   'm2', 5000, false, 92),
  ('electrics', 'ELEC-SOLAR', 'Solar Panel Provision',
   'Structural uplift + pre-wiring for future solar (panels excluded)',
   'item', 45000, false, 93),

  -- Extras / sundries
  ('extras', 'EXTRA-DECKING', 'Hardwood Decking',
   'Hardwood decking boards, joists, fascia, balustrade if required',
   'm2', 22000, false, 100),
  ('extras', 'EXTRA-STEP', 'Timber Steps',
   'Matching hardwood steps with riser, 2-3 treads',
   'item', 35000, false, 101),
  ('extras', 'EXTRA-BASE', 'Concrete Base (supply only)',
   'Supply and pour concrete slab, DPM, mesh — customer organises groundworks separately if preferred',
   'm2', 9500, false, 102),
  ('extras', 'EXTRA-WASTE', 'Skip Hire / Waste Removal',
   'Skip for construction waste during installation',
   'item', 35000, false, 103),

  -- Delivery
  ('delivery', 'DEL-STD', 'Delivery & Installation',
   'Full installation by TGR team, includes two-day build and snagging visit',
   'item', 0, false, 200)
;

-- ============================================================
-- STEP 16: SEED — DEFAULT PAYMENT SCHEDULE TEMPLATE
-- ============================================================
-- This is baked into quote_templates.default_config above.
-- Inserted here as a named template for reference.

insert into public.quote_templates (name, description, default_config)
values (
  'Standard Garden Room',
  'Default template for a standard garden room build',
  '{
    "sections": [
      {"title": "Room Shell",       "sort_order": 1, "sku_defaults": ["SHELL-001"]},
      {"title": "Cladding",         "sort_order": 2, "sku_defaults": ["CLAD-LARCH"]},
      {"title": "Glazing",          "sort_order": 3, "sku_defaults": ["WIN-UPVC-FIXED","BIFOLD-3P"]},
      {"title": "Internal Fit-Out", "sort_order": 4, "sku_defaults": ["CEIL-PB","WALL-PB","FLOOR-LVT"]},
      {"title": "Electrical",       "sort_order": 5, "sku_defaults": ["ELEC-PKG-STD"]},
      {"title": "Extras",           "sort_order": 6, "sku_defaults": []}
    ],
    "payment_schedule": [
      {"milestone": "deposit",    "label": "Deposit on booking",          "percentage": 10},
      {"milestone": "day_1",      "label": "Day 1 — materials delivery",  "percentage": 50},
      {"milestone": "plastering", "label": "Plastering / second fix",     "percentage": 30},
      {"milestone": "completion", "label": "Balance on completion",       "percentage": 10}
    ]
  }'::jsonb
);
