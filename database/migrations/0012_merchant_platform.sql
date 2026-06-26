-- Migration 0012: Merchant Operating System — Self-Service Platform
-- Release 1.2 — 2026-06-26
--
-- Módulos cobertos:
--   M01 Onboarding | M02 Dashboard | M03 Import Engine | M04 Import Wizard
--   M05 Merchant Score | M06 Trust Score | M07 Verified Stores
--   M08 Audit | M09 Analytics Foundation | M10 Plans Engine
--   M11 Growth Engine | M12 Merchant Success Engine | M13 Future Ready

-- ── 0. Ampliar profiles.role para incluir 'merchant' ──────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'operator', 'merchant'));

-- ── 1. merchant_plans (Plans Engine — M10) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_plans (
  plan                 text PRIMARY KEY,
  display_name         text NOT NULL,
  max_stores           integer NOT NULL DEFAULT 1,
  max_products         integer NOT NULL DEFAULT 100,
  max_imports_month    integer NOT NULL DEFAULT 5,
  has_api_access       boolean NOT NULL DEFAULT false,
  has_analytics        boolean NOT NULL DEFAULT false,
  has_connectors       boolean NOT NULL DEFAULT false,
  has_priority_rank    boolean NOT NULL DEFAULT false,
  price_monthly        numeric NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

INSERT INTO merchant_plans
  (plan, display_name, max_stores, max_products, max_imports_month, has_api_access, has_analytics, has_connectors, has_priority_rank, price_monthly)
VALUES
  ('free',       'Grátis',     1,   100,   5,   false, false, false, false, 0),
  ('pro',        'Pro',        3,   1000,  30,  true,  true,  false, false, 49),
  ('business',   'Business',   10,  10000, 100, true,  true,  true,  false, 199),
  ('enterprise', 'Enterprise', 999, 999999,9999,true,  true,  true,  true,  999)
ON CONFLICT (plan) DO NOTHING;

-- ── 2. merchants (perfil de empresa do lojista) ───────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name     text NOT NULL DEFAULT '',
  company_doc      text,
  company_website  text,
  contact_phone    text,
  contact_whatsapp text,
  contact_email    text,
  -- Onboarding state
  onboarding_step  integer NOT NULL DEFAULT 0,
  onboarding_done  boolean NOT NULL DEFAULT false,
  -- Status & Plan (M01, M10)
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','pending','active','suspended','blocked')),
  plan             text NOT NULL DEFAULT 'free' REFERENCES merchant_plans(plan),
  -- Scores (M05, M06)
  merchant_score   integer NOT NULL DEFAULT 0,
  trust_score      integer NOT NULL DEFAULT 0,
  -- Verified store status (M07)
  verified_level   text NOT NULL DEFAULT 'none'
                   CHECK (verified_level IN ('none','verified','premium','official')),
  -- Timestamps
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 3. merchant_stores (M:N — Future Ready M13) ───────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, store_id)
);

-- ── 4. merchant_audit_logs (M08 Auditoria) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  payload     jsonb,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 5. merchant_analytics_events (M09 Analytics Foundation) ──────────────────
CREATE TABLE IF NOT EXISTS merchant_analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  store_id    uuid REFERENCES stores(id) ON DELETE SET NULL,
  product_id  uuid REFERENCES products(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 6. merchant_recommendations (M12 Success Engine) ─────────────────────────
CREATE TABLE IF NOT EXISTS merchant_recommendations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  type        text NOT NULL,
  priority    text NOT NULL DEFAULT 'info'
              CHECK (priority IN ('critical','warning','info')),
  title       text NOT NULL,
  body        text NOT NULL,
  metadata    jsonb,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 7. Índices de performance ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS merchants_user_id_idx            ON merchants(user_id);
CREATE INDEX IF NOT EXISTS merchant_stores_merchant_id_idx  ON merchant_stores(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_stores_store_id_idx     ON merchant_stores(store_id);
CREATE INDEX IF NOT EXISTS merchant_audit_merchant_id_idx   ON merchant_audit_logs(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_audit_created_at_idx    ON merchant_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS merchant_analytics_merchant_idx  ON merchant_analytics_events(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_recs_merchant_id_idx    ON merchant_recommendations(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_recs_read_at_idx        ON merchant_recommendations(read_at) WHERE read_at IS NULL;

-- ── 8. updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 9. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE merchants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_plans           ENABLE ROW LEVEL SECURITY;

-- merchant_plans: public read (lojistas veem os planos)
CREATE POLICY "plans_public_read" ON merchant_plans FOR SELECT USING (true);

-- merchants: cada lojista vê e edita apenas o seu registro
CREATE POLICY "merchants_self_access" ON merchants
  FOR ALL USING (auth.uid() = user_id);

-- merchant_stores: lojista acessa stores da sua merchant
CREATE POLICY "merchant_stores_access" ON merchant_stores
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- merchant_audit_logs: lojista lê próprios logs
CREATE POLICY "merchant_audit_read" ON merchant_audit_logs
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- merchant_analytics_events: lojista lê próprios eventos
CREATE POLICY "merchant_analytics_read" ON merchant_analytics_events
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- merchant_recommendations: lojista lê e atualiza (marcar como lida) as próprias
CREATE POLICY "merchant_recs_access" ON merchant_recommendations
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- ── 10. Verificação ──────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('merchants','merchant_stores','merchant_audit_logs',
                     'merchant_analytics_events','merchant_recommendations','merchant_plans');
