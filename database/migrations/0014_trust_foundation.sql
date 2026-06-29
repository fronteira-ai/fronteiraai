-- Migration: 0014_trust_foundation
-- Sprint: 1.5.1 — Trust Infrastructure
-- Descrição: Cria o domínio de Trust com 5 tabelas permanentes.
-- Dependência: migration 0012_merchant_platform (merchants, profiles tabelas existem)
-- Rollback: ver seção ROLLBACK no final deste arquivo

BEGIN;

-- ── 1. merchant_trust ─────────────────────────────────────────────────────────
-- Estado de confiança por merchant. Um registro por merchant.
-- trust_score não é computado aqui — será computado por Sprint futura (ADR-041).

CREATE TABLE IF NOT EXISTS merchant_trust (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  trust_score        integer     NOT NULL DEFAULT 0
                                 CHECK (trust_score >= 0 AND trust_score <= 100),
  status             text        NOT NULL DEFAULT 'unverified'
                                 CHECK (status IN ('unverified','pending','verified','suspended','rejected')),
  badge_level        text        NOT NULL DEFAULT 'none'
                                 CHECK (badge_level IN ('none','basic','verified','premium')),
  last_verified_at   timestamptz,
  last_event_at      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_trust_merchant_unique UNIQUE (merchant_id)
);

COMMENT ON TABLE merchant_trust IS 'Estado de confiança atual de cada merchant. Um registro por merchant.';
COMMENT ON COLUMN merchant_trust.trust_score IS 'Score 0-100. Não computado automaticamente nesta migration — resultado de algoritmo definido em ADR-041.';
COMMENT ON COLUMN merchant_trust.badge_level IS 'Badge público exibido ao comprador. Concedido manualmente pelo admin até Sprint 1.5.5.';

-- ── 2. merchant_trust_events ──────────────────────────────────────────────────
-- Log imutável de todos os eventos que afetam o trust de um merchant.
-- Alimenta o ParaguAI Brain: ativos HistoricalData + MerchantTrust.

CREATE TABLE IF NOT EXISTS merchant_trust_events (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  merchant_trust_id  uuid        REFERENCES merchant_trust(id) ON DELETE SET NULL,
  event_type         text        NOT NULL,
  source             text        NOT NULL
                                 CHECK (source IN ('system','admin','merchant','buyer','crawler')),
  reason             text,
  delta              integer     NOT NULL DEFAULT 0,
  score_before       integer,
  score_after        integer,
  metadata           jsonb       NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE merchant_trust_events IS 'Log imutável de eventos de trust. Fonte primária do ParaguAI Brain para MerchantTrust e HistoricalData.';
COMMENT ON COLUMN merchant_trust_events.delta IS 'Variação do trust_score causada por este evento. 0 = evento informacional sem impacto em score.';
COMMENT ON COLUMN merchant_trust_events.metadata IS 'Payload livre por tipo de evento. Schema por event_type documentado em src/domains/trust/events/event-registry.ts.';

-- ── 3. merchant_verifications ─────────────────────────────────────────────────
-- Verificações formais de documentos e identidade do merchant.

CREATE TABLE IF NOT EXISTS merchant_verifications (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  verification_type  text        NOT NULL
                                 CHECK (verification_type IN ('document','address','phone','email','bank','social_media','manual')),
  status             text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','approved','rejected','expired')),
  submitted_at       timestamptz NOT NULL DEFAULT now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason   text,
  expires_at         timestamptz,
  metadata           jsonb       NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE merchant_verifications IS 'Verificações formais de identidade e documentação do merchant.';

-- ── 4. merchant_badges ────────────────────────────────────────────────────────
-- Badges públicos concedidos a merchants. Histórico completo (incluindo revogados).

CREATE TABLE IF NOT EXISTS merchant_badges (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  badge_type         text        NOT NULL
                                 CHECK (badge_type IN ('none','basic','verified','premium')),
  granted_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  revoked_at         timestamptz,
  revoke_reason      text,
  granted_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  is_active          boolean     NOT NULL DEFAULT true,
  metadata           jsonb       NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE merchant_badges IS 'Badges públicos de merchants. is_active = true indica badge vigente. Apenas um badge ativo por merchant.';

-- ── 5. trust_history ─────────────────────────────────────────────────────────
-- Snapshots diários do estado de trust por merchant.
-- INSERT-ONLY: nunca atualizar ou deletar entradas históricas.
-- Alimenta o ParaguAI Brain: ativo HistoricalData (C-1).

CREATE TABLE IF NOT EXISTS trust_history (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id          uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  snapshot_date        date        NOT NULL DEFAULT CURRENT_DATE,
  trust_score          integer     NOT NULL,
  status               text        NOT NULL,
  badge_level          text,
  event_count          integer     NOT NULL DEFAULT 0,
  verification_count   integer     NOT NULL DEFAULT 0,
  metadata             jsonb       NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trust_history_merchant_date_unique UNIQUE (merchant_id, snapshot_date)
);

COMMENT ON TABLE trust_history IS 'Histórico permanente de snapshots diários de trust. INSERT-ONLY — nunca atualizar ou deletar entradas históricas.';

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_merchant_trust_merchant_id
  ON merchant_trust(merchant_id);

CREATE INDEX IF NOT EXISTS idx_merchant_trust_status
  ON merchant_trust(status);

CREATE INDEX IF NOT EXISTS idx_trust_events_merchant_id
  ON merchant_trust_events(merchant_id);

CREATE INDEX IF NOT EXISTS idx_trust_events_type
  ON merchant_trust_events(event_type);

CREATE INDEX IF NOT EXISTS idx_trust_events_created_at
  ON merchant_trust_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_merchant_id
  ON merchant_verifications(merchant_id);

CREATE INDEX IF NOT EXISTS idx_verifications_status
  ON merchant_verifications(status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_badges_merchant_id
  ON merchant_badges(merchant_id);

CREATE INDEX IF NOT EXISTS idx_badges_active
  ON merchant_badges(merchant_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_trust_history_merchant_date
  ON trust_history(merchant_id, snapshot_date DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────

-- merchant_trust
ALTER TABLE merchant_trust ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_admin_all" ON merchant_trust
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "trust_public_read_verified" ON merchant_trust
  FOR SELECT
  USING (status = 'verified');

-- merchant_trust_events (admin only — log sensível)
ALTER TABLE merchant_trust_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_events_admin_all" ON merchant_trust_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- merchant_verifications
ALTER TABLE merchant_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verifications_admin_all" ON merchant_verifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "verifications_merchant_read_own" ON merchant_verifications
  FOR SELECT
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- merchant_badges
ALTER TABLE merchant_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_admin_all" ON merchant_badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "badges_public_read_active" ON merchant_badges
  FOR SELECT
  USING (is_active = true);

-- trust_history (admin only — dados estratégicos)
ALTER TABLE trust_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_history_admin_all" ON trust_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- Executar APENAS se necessário reverter esta migration.
-- Ação destrutiva — todos os dados de trust serão perdidos.
--
-- BEGIN;
-- DROP TABLE IF EXISTS trust_history CASCADE;
-- DROP TABLE IF EXISTS merchant_badges CASCADE;
-- DROP TABLE IF EXISTS merchant_verifications CASCADE;
-- DROP TABLE IF EXISTS merchant_trust_events CASCADE;
-- DROP TABLE IF EXISTS merchant_trust CASCADE;
-- COMMIT;
