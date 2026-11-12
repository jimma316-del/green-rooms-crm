alter table public.site_assessments
  add column if not exists landscaping_notes text,
  add column if not exists sketch_data       text,
  add column if not exists decking_material  text,
  add column if not exists has_existing_swa  boolean default false;
