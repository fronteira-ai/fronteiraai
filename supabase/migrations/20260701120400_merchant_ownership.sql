-- ============================================================
-- 0026 — Merchant Acquisition & Ownership Platform (Release 1.7 — Wave 5)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: Partial — ver database/templates/ROLLBACK_TEMPLATE.sql.
--   DROP TABLE store_claims/merchant_delegates/merchant_upgrade_leads é
--   seguro isoladamente, mas descarta todo o histórico de claims/delegações/
--   leads acumulado. Reverter o CHECK constraint de merchant_verifications
--   (remover 'store_claim') só é seguro se nenhuma linha usar esse tipo.
-- ============================================================
--
-- Cria:
-- 1. store_claims — o fluxo de Smart Claim (Epic B) + Progressive
--    Verification (Epic C). Reaproveita merchant_verifications (Sprint
--    1.5.1/1.5.2) via um novo VerificationType — 'store_claim' — em vez de
--    duplicar uma segunda máquina de estados de verificação.
-- 2. merchant_delegates — Delegated Management (Epic E). Ownership
--    (a linha em `merchants`) nunca é delegada — apenas permissões de
--    gestão, por papel fixo (manager/marketing/agency/administrator/
--    operator).
-- 3. merchant_upgrade_leads — Premium Upgrade Journey (Epic H), append-only.
--    Lead-capture apenas — sem gateway de pagamento (ADR-035 já existente).
-- 4. Extensão do CHECK constraint de merchant_verifications.verification_type
--    (+ catálogo verification_types) com o novo tipo 'store_claim', mesmo
--    idioma da migration 0015.
--
-- PRINCÍPIO:
-- Uma claim é sempre uma sugestão de propriedade pendente de verificação —
-- nunca uma união automática. Mesmo "aprovar" só cria o vínculo
-- `merchant_stores` — nunca reatribui histórico, nunca remove um Product,
-- nunca quebra uma URL existente.
--
-- Verificação: database/verification/0026_verify.sql — nunca embutida
-- aqui, nunca executada automaticamente.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — Extensão de merchant_verifications (mesmo idioma da 0015)
-- ──────────────────────────────────────────────────────────

ALTER TABLE merchant_verifications
  DROP CONSTRAINT IF EXISTS merchant_verifications_verification_type_check;

ALTER TABLE merchant_verifications
  ADD CONSTRAINT merchant_verifications_verification_type_check
  CHECK (verification_type IN (
    'document', 'address', 'phone', 'email', 'bank', 'social_media', 'manual',
    'identity', 'company', 'location', 'contact', 'hours', 'operation', 'partner', 'documentation',
    'store_claim'
  ));

-- Idempotent insert without relying on an ON CONFLICT target (verification_types
-- has no UNIQUE constraint on `label` to conflict against — same gap already
-- present in migration 0015's own seed, not introduced here, not fixed here
-- either since 0015 is frozen history; this WHERE NOT EXISTS guard is what
-- makes THIS insert safe to replay).
INSERT INTO verification_types (label, description, category, requires_evidence, validity_days, sort_order)
SELECT 'Reivindicação de Loja', 'Verificação progressiva automática de propriedade de loja (Wave 5)', 'business', false, NULL, 200
WHERE NOT EXISTS (SELECT 1 FROM verification_types WHERE label = 'Reivindicação de Loja');

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — store_claims
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS store_claims (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id           uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id              uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  status                text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'awaiting_review', 'approved', 'rejected', 'cancelled')),
  claimant_name         text        NOT NULL,
  claimant_phone        text        NOT NULL,
  claimant_email        text        NOT NULL,
  claimant_role         text        NOT NULL,
  automated_confidence  numeric(5,2) NOT NULL DEFAULT 0,
  signal_breakdown      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  verification_id       uuid        REFERENCES merchant_verifications(id) ON DELETE SET NULL,
  rejection_reason      text,
  admin_note            text,
  reviewed_at           timestamptz,
  reviewed_by           uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_claims_store ON store_claims (store_id);
CREATE INDEX IF NOT EXISTS idx_store_claims_merchant ON store_claims (merchant_id);
CREATE INDEX IF NOT EXISTS idx_store_claims_status ON store_claims (status, created_at DESC);

ALTER TABLE store_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_claims_merchant_read_own" ON store_claims;
CREATE POLICY "store_claims_merchant_read_own" ON store_claims
  FOR SELECT
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));
-- Escrita exclusivamente via service_role (API routes autenticadas)

-- ──────────────────────────────────────────────────────────
-- PARTE 3 — merchant_delegates
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_delegates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  invited_email  text        NOT NULL,
  user_id        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  role           text        NOT NULL
    CHECK (role IN ('manager', 'marketing', 'agency', 'administrator', 'operator')),
  status         text        NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'revoked')),
  invite_token   text        NOT NULL UNIQUE,
  invited_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at     timestamptz NOT NULL DEFAULT now(),
  accepted_at    timestamptz,
  revoked_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_merchant_delegates_merchant_status ON merchant_delegates (merchant_id, status);

ALTER TABLE merchant_delegates ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (API routes autenticadas) —
-- inclusive a resolução por invite_token no fluxo de aceite, feita com o
-- service client, nunca com o client anônimo do convidado.

-- ──────────────────────────────────────────────────────────
-- PARTE 4 — merchant_upgrade_leads (append-only)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_upgrade_leads (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  trigger_context  text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_upgrade_leads_merchant ON merchant_upgrade_leads (merchant_id, created_at DESC);

ALTER TABLE merchant_upgrade_leads ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (API routes autenticadas)
