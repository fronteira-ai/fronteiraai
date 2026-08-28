-- Migration 0018: Merchant Authorization Records (internal audit trail)
-- Sprint "MERCHANT CONSOLE V1 — PARTNER EXPERIENCE" — §7 / §34/35.
--
-- Persiste o MerchantAuthorizationRecord da Sprint de onboarding. NÃO é
-- aprovação legal — é trilha de auditoria interna do consentimento do lojista
-- para o ParaguAI usar o feed/API dele. Tenant-scoped por merchant_id (RLS):
-- cada lojista vê apenas as autorizações das suas lojas; admin de plataforma
-- via service_role.

CREATE TABLE IF NOT EXISTS merchant_authorizations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id            uuid REFERENCES stores(id) ON DELETE SET NULL,
  -- Quem, no ParaguAI, obteve o consentimento do lojista (nome/ref do operador).
  authorized_by       text NOT NULL DEFAULT '',
  authorization_date  date NOT NULL,
  -- URL/arquivo de feed que o lojista autorizou (não-sensível, para trilha).
  source_url          text NOT NULL DEFAULT '',
  -- Uso permitido, ex.: {"display_offers","price_history","catalog"}.
  allowed_usage       text[] NOT NULL DEFAULT '{}',
  evidence_reference  text,
  contact_reference   text,
  status              text NOT NULL DEFAULT 'PENDING_LEGAL'
                      CHECK (status IN ('ACTIVE','PENDING_LEGAL','REVOKED')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, merchant_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS merchant_authz_merchant_id_idx ON merchant_authorizations(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_authz_store_id_idx    ON merchant_authorizations(store_id);

-- updated_at
DROP TRIGGER IF EXISTS merchant_authorizations_updated_at ON merchant_authorizations;
CREATE TRIGGER merchant_authorizations_updated_at
  BEFORE UPDATE ON merchant_authorizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RLS (tenant isolation) ────────────────────────────────────────────────────
ALTER TABLE merchant_authorizations ENABLE ROW LEVEL SECURITY;

-- Cada lojista lê as autorizações das lojas da sua merchant (não expõe
-- authorized_by interno de forma sensível? o próprio registro é do lojista).
CREATE POLICY "merchant_authz_own"
  ON merchant_authorizations FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

-- service_role (operador de plataforma) administra via função/service client.

-- ── Verificação ──────────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'merchant_authorizations';
