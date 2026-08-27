-- ============================================================
-- XERO INTEGRATION TABLES
-- ============================================================

-- Single-row connection record (tokens never exposed to browser)
CREATE TABLE public.xero_connection (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token       text NOT NULL,
  refresh_token      text NOT NULL,
  token_expires_at   timestamptz NOT NULL,
  tenant_id          text NOT NULL,
  org_name           text NOT NULL,
  connected_at       timestamptz NOT NULL DEFAULT now(),
  last_sync_at       timestamptz,
  last_sync_error    text
);

-- No RLS policies — only service_role (admin client) can access tokens
ALTER TABLE public.xero_connection ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.xero_connection TO service_role;

-- Cached chart of accounts from Xero
CREATE TABLE public.xero_accounts (
  account_id  text PRIMARY KEY,
  code        text,
  name        text NOT NULL,
  type        text NOT NULL,   -- REVENUE, DIRECTCOSTS, EXPENSE, etc.
  class       text,            -- REVENUE, EXPENSE, ASSET, LIABILITY, EQUITY
  status      text NOT NULL DEFAULT 'ACTIVE',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xero_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xero_accounts_read" ON public.xero_accounts
  FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON TABLE public.xero_accounts TO service_role;

-- CRM treatment overrides per account (set by user in Stage 4)
CREATE TABLE public.xero_account_mappings (
  account_id  text PRIMARY KEY REFERENCES public.xero_accounts(account_id) ON DELETE CASCADE,
  treatment   text NOT NULL CHECK (treatment IN ('revenue','direct_cost','operating','non_operating','exclude')),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xero_account_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xero_mappings_read" ON public.xero_account_mappings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "xero_mappings_write" ON public.xero_account_mappings
  FOR ALL USING (auth.role() = 'authenticated');
GRANT ALL ON TABLE public.xero_account_mappings TO service_role;

-- Cached P&L figures by month and account (stored in pence to avoid float issues)
CREATE TABLE public.xero_financial_cache (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  period       text NOT NULL,         -- YYYY-MM
  account_id   text,                  -- null if account not matched to chart
  account_name text NOT NULL,
  account_type text,
  net_amount_pence bigint NOT NULL DEFAULT 0,
  synced_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period, account_name)
);

ALTER TABLE public.xero_financial_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xero_cache_read" ON public.xero_financial_cache
  FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON TABLE public.xero_financial_cache TO service_role;
