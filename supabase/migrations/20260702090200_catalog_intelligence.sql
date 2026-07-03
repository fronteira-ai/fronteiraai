-- ============================================================
-- 0020 — Catalog Intelligence: Per-Product Health Snapshots
-- Status: PRONTO PARA EXECUÇÃO (Release 1.6 — Epic 4)
-- ============================================================
--
-- Cria:
-- 1. merchant_catalog_snapshots — histórico diário de saúde do catálogo
--
-- PRINCÍPIO:
-- Saúde por produto é computada on-demand (não armazenada).
-- O que persiste é o SNAPSHOT DIÁRIO do score agregado.
-- Um snapshot por merchant por dia (UNIQUE constraint).
-- Upsert: re-processar o mesmo dia atualiza os números.
--
-- Verificação: database/verification/0020_verify.sql (Database Migration
-- System V2 — verification queries live outside migrations, never embedded
-- and never auto-run; ver docs/engineering/DATABASE_ENGINEERING.md).
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — merchant_catalog_snapshots
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_catalog_snapshots (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id          uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  snapshot_date        date        NOT NULL DEFAULT CURRENT_DATE,
  health_score         integer     NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
  products_ideal       integer     NOT NULL DEFAULT 0 CHECK (products_ideal >= 0),
  products_attention   integer     NOT NULL DEFAULT 0 CHECK (products_attention >= 0),
  products_critical    integer     NOT NULL DEFAULT 0 CHECK (products_critical >= 0),
  total_products       integer     NOT NULL DEFAULT 0 CHECK (total_products >= 0),
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, snapshot_date)
);

-- ──────────────────────────────────────────────────────────
-- ÍNDICES
-- ──────────────────────────────────────────────────────────

-- Consultas de histórico por merchant (últimos N dias)
CREATE INDEX IF NOT EXISTS idx_merchant_catalog_snapshots_merchant_date
  ON merchant_catalog_snapshots (merchant_id, snapshot_date DESC);

-- ──────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────

ALTER TABLE merchant_catalog_snapshots ENABLE ROW LEVEL SECURITY;

-- Leitura/escrita apenas via service_role (API routes)
-- Merchants acessam seus dados exclusivamente via API autenticada
