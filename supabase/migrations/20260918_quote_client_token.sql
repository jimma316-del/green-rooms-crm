-- Add client-facing token to quote_versions for the public acceptance link
ALTER TABLE public.quote_versions
  ADD COLUMN IF NOT EXISTS client_token text UNIQUE;

-- Index so we can look up by token quickly
CREATE INDEX IF NOT EXISTS quote_versions_token_idx ON public.quote_versions(client_token)
  WHERE client_token IS NOT NULL;
