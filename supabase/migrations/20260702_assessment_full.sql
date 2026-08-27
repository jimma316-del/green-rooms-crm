-- Full site_assessments schema — safe to run on any state, uses IF NOT EXISTS
ALTER TABLE site_assessments
  -- Dimensions
  ADD COLUMN IF NOT EXISTS width_m              numeric(5,2),
  ADD COLUMN IF NOT EXISTS depth_m              numeric(5,2),
  ADD COLUMN IF NOT EXISTS height_eaves_m       numeric(5,2),
  -- Structure
  ADD COLUMN IF NOT EXISTS roof_type            text,
  ADD COLUMN IF NOT EXISTS has_canopy           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS canopy_depth_m       numeric(5,2),
  ADD COLUMN IF NOT EXISTS has_side_canopy      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_storage          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_glass_corner     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_skylight         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS shape                text,
  ADD COLUMN IF NOT EXISTS location_notes       text,
  ADD COLUMN IF NOT EXISTS planning_type        text,
  -- Decking
  ADD COLUMN IF NOT EXISTS has_decking          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deck_w               numeric(5,2),
  ADD COLUMN IF NOT EXISTS deck_d               numeric(5,2),
  -- Cladding
  ADD COLUMN IF NOT EXISTS cladding_good        text,
  ADD COLUMN IF NOT EXISTS cladding_better      text,
  ADD COLUMN IF NOT EXISTS cladding_best        text,
  ADD COLUMN IF NOT EXISTS single_cladding      text,
  ADD COLUMN IF NOT EXISTS tiers_enabled        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cladding_walls       integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fireproofing         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fireproofing_walls   text,
  ADD COLUMN IF NOT EXISTS secondary_cladding   text,
  ADD COLUMN IF NOT EXISTS secondary_cladding_location text,
  -- Doors & Windows
  ADD COLUMN IF NOT EXISTS doors                jsonb   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS windows              jsonb   DEFAULT '[]',
  -- Electrics
  ADD COLUMN IF NOT EXISTS has_consumer_unit    boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cable_run_m          integer,
  ADD COLUMN IF NOT EXISTS downlight_count      integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS double_socket_count  integer DEFAULT 2,
  ADD COLUMN IF NOT EXISTS usb_socket_count     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS electricals          text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS climate              text    DEFAULT 'none',
  -- Site
  ADD COLUMN IF NOT EXISTS ground_type          text,
  ADD COLUMN IF NOT EXISTS access_notes         text,
  ADD COLUMN IF NOT EXISTS site_notes           text,
  ADD COLUMN IF NOT EXISTS photo_urls           text[]  DEFAULT '{}';
