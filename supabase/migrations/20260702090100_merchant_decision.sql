-- ============================================================
-- 0019 — Merchant Decision Engine: Action Center
-- Status: PRONTO PARA EXECUÇÃO (Release 1.6 — Epic 3)
-- ============================================================
--
-- Cria:
-- 1. merchant_decision_actions — histórico permanente de ações sobre recomendações
--
-- PRINCÍPIO:
-- Recomendações são computadas on-demand (não armazenadas).
-- O que persiste é a AÇÃO do merchant sobre a recomendação.
-- O histórico de ações é append-preferred: nunca apagar, apenas atualizar status.
-- Usar rule_id (não FK) para rastrear qual regra gerou a recomendação.
--
-- Verificação: database/verification/0019_verify.sql (Database Migration
-- System V2 — verification queries live outside migrations, never embedded
-- and never auto-run; ver docs/engineering/DATABASE_ENGINEERING.md).
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — merchant_decision_actions
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_decision_actions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  rule_id           text        NOT NULL,
  recommendation_id text        NOT NULL,
  title             text        NOT NULL,
  category          text        NOT NULL,
  priority          text        NOT NULL,
  status            text        NOT NULL
    CHECK (status IN ('pending', 'completed', 'ignored', 'postponed')),
  notes             text        DEFAULT NULL,
  acted_at          timestamptz DEFAULT NULL,
  scheduled_for     timestamptz DEFAULT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- ÍNDICES
-- ──────────────────────────────────────────────────────────

-- Consultas por merchant + status (Action Center)
CREATE INDEX IF NOT EXISTS idx_merchant_decision_actions_merchant_status
  ON merchant_decision_actions (merchant_id, status, created_at DESC);

-- Consultas por rule_id (para evitar duplicação de ações pendentes)
CREATE INDEX IF NOT EXISTS idx_merchant_decision_actions_rule
  ON merchant_decision_actions (merchant_id, rule_id, status);

-- Timeline histórica
CREATE INDEX IF NOT EXISTS idx_merchant_decision_actions_timeline
  ON merchant_decision_actions (merchant_id, acted_at DESC)
  WHERE acted_at IS NOT NULL;

-- ──────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────

ALTER TABLE merchant_decision_actions ENABLE ROW LEVEL SECURITY;

-- Merchant lê apenas suas próprias ações (verificado via API com service_role)
-- Escrita apenas via service_role (PATCH /api/merchant/actions/[id])
