-- Quote system enhancements: build date, expiry, include_in_pdf, messages

-- ─── quote_versions: add build date + expiry ─────────────────────────────────
ALTER TABLE quote_versions
  ADD COLUMN IF NOT EXISTS build_date        DATE,
  ADD COLUMN IF NOT EXISTS expires_at        DATE,
  ADD COLUMN IF NOT EXISTS accepted_by_name  TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acceptance_ip     TEXT;

-- ─── quote_assets: include in PDF flag ───────────────────────────────────────
ALTER TABLE quote_assets
  ADD COLUMN IF NOT EXISTS include_in_pdf BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── quote_messages: client query thread ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id      UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  from_client   BOOLEAN NOT NULL DEFAULT TRUE,
  message       TEXT NOT NULL,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quote_messages_quote_id_idx ON quote_messages(quote_id);

ALTER TABLE quote_messages ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY IF NOT EXISTS "service_role_all_quote_messages"
  ON quote_messages FOR ALL USING (TRUE) WITH CHECK (TRUE);

GRANT SELECT, INSERT, UPDATE, DELETE ON quote_messages TO service_role;
GRANT SELECT ON quote_messages TO authenticated;

-- ─── tc_versions: ensure is_current + clauses columns exist ──────────────────
-- tc_versions was created in the main migration; just verify clauses column exists
ALTER TABLE tc_versions
  ADD COLUMN IF NOT EXISTS clauses JSONB;

COMMENT ON COLUMN tc_versions.clauses IS 'Array of {title, body} objects for T&Cs in the PDF';

-- ─── Storage: quote-assets bucket ────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-assets', 'quote-assets', false)
ON CONFLICT (id) DO NOTHING;

-- Allow service role to manage files
CREATE POLICY IF NOT EXISTS "service_role_quote_assets_storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'quote-assets')
  WITH CHECK (bucket_id = 'quote-assets');

-- quote_assets: add image_url for photo assets
ALTER TABLE quote_assets
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN quote_assets.image_url IS 'Public/signed URL for uploaded photo assets';
