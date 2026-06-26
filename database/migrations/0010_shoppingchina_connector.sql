-- Migration 0010: Shopping China — First Live Connector
-- Adds the store record and connector_configs table used by the acquisition engine

-- ── 1. Store: shopping-china ──────────────────────────────────────────────────
INSERT INTO stores (slug, name, website, country, city, description, active)
VALUES (
  'shopping-china',
  'Shopping China',
  'https://www.shoppingchina.com.py',
  'PY',
  'Ciudad del Este',
  'Loja de eletrônicos e informática em Ciudad del Este, Paraguai.',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  website     = EXCLUDED.website,
  country     = EXCLUDED.country,
  city        = EXCLUDED.city,
  description = EXCLUDED.description,
  active      = EXCLUDED.active;

-- ── 2. connector_configs — tracks registered connectors (optional metadata) ───
CREATE TABLE IF NOT EXISTS connector_configs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id     text NOT NULL UNIQUE,
  store_slug       text NOT NULL REFERENCES stores(slug),
  enabled          boolean NOT NULL DEFAULT true,
  max_products     integer NOT NULL DEFAULT 10,
  request_delay_ms integer NOT NULL DEFAULT 500,
  config           jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE connector_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "connector_configs_service_only"
  ON connector_configs
  FOR ALL
  USING (false)
  WITH CHECK (false);

INSERT INTO connector_configs (connector_id, store_slug, enabled, max_products, request_delay_ms, config)
VALUES (
  'shoppingchina',
  'shopping-china',
  true,
  10,
  500,
  '{"baseUrl": "https://www.shoppingchina.com.py", "categories": ["electronicos", "informatica", "celulares"]}'
)
ON CONFLICT (connector_id) DO NOTHING;

-- ── 3. Verify ─────────────────────────────────────────────────────────────────
SELECT slug, name, website FROM stores WHERE slug = 'shopping-china';
SELECT connector_id, store_slug, enabled FROM connector_configs WHERE connector_id = 'shoppingchina';
