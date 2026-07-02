-- Assessment form v2: new columns for richer spec data
-- Run in Supabase SQL Editor (no RLS needed, service role)

ALTER TABLE site_assessments
  ADD COLUMN IF NOT EXISTS cladding_walls         integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fireproofing            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fireproofing_walls      text,
  ADD COLUMN IF NOT EXISTS secondary_cladding      text,
  ADD COLUMN IF NOT EXISTS secondary_cladding_location text,
  ADD COLUMN IF NOT EXISTS single_cladding         text,
  ADD COLUMN IF NOT EXISTS tiers_enabled           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS electricals             text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS climate                 text    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS doors                   jsonb   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS deck_w                  numeric(5,2),
  ADD COLUMN IF NOT EXISTS deck_d                  numeric(5,2),
  ADD COLUMN IF NOT EXISTS location_notes          text,
  ADD COLUMN IF NOT EXISTS planning_type           text,
  ADD COLUMN IF NOT EXISTS shape                   text;
