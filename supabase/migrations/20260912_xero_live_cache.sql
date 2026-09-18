-- Cache for live Xero data (invoices, supplier spend, metrics)
-- Populated during sync, read on Finance page load (no live Xero calls on page load)
CREATE TABLE IF NOT EXISTS public.xero_live_cache (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}',
  synced_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xero_live_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xero_live_cache_read" ON public.xero_live_cache
  FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON TABLE public.xero_live_cache TO service_role;
