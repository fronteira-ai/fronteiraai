-- ============================================================
-- 0022 — Connector Platform Framework
-- Status: PRONTO PARA EXECUÇÃO (Release 1.7 — Epic 1)
-- Rollback: Partial — ver database/templates/ROLLBACK_TEMPLATE.sql.
--   DROP TABLE connector_sync_runs, connectors (nessa ordem, por causa da FK)
--   é seguro enquanto nenhum código em produção os referencia; se algum sync
--   real já rodou, isso descarta o histórico de connector_sync_runs.
-- ============================================================
--
-- Cria:
-- 1. connectors — registro persistente de conectores (substitui o registro
--    apenas-em-memória de acquisition/core/registry.ts)
-- 2. connector_sync_runs — execução de sincronização (substitui import_logs
--    como fonte de verdade; import_logs recebe escrita dupla neste Epic
--    apenas para não quebrar getMerchantDashboardStats(), ver Epic 2)
--
-- SUPERSEDE: connector_configs (migration 0010) está morta — nenhum código
-- lê ou escreve nela, e sua policy RLS (`USING (false)`) bloqueia até o
-- service-role via PostgREST. Não é removida aqui (limpeza de dívida técnica
-- fora do escopo deste Epic, não uma limitação de ferramenta — Database
-- Migration System V2 já usa Supabase CLI para aplicar DDL real). Fica
-- marcada como superada para remoção em uma migration futura dedicada, uma
-- vez confirmado que nenhum código a referencia.
--
-- PRINCÍPIO:
-- Um conector é uma entidade persistente, não apenas uma instância em memória.
-- Uma execução de sincronização (SyncRun) nunca é sobrescrita — apenas criada
-- e depois atualizada (running → success/partial/failed).
--
-- Verificação: database/verification/0022_verify.sql (Database Migration
-- System V2 — verification queries live outside migrations, never embedded
-- and never auto-run; ver docs/engineering/DATABASE_ENGINEERING.md).
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — connectors
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS connectors (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_key    text        UNIQUE NOT NULL,
  name             text        NOT NULL,
  version          text        NOT NULL,
  type             text        NOT NULL
    CHECK (type IN ('json-file', 'csv-file', 'api-rest', 'xml-file', 'erp', 'manual-upload', 'crawler')),
  store_slug       text        NOT NULL,
  description      text,
  status           text        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  config           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connectors_store_slug ON connectors (store_slug);

ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (API routes autenticadas)

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — connector_sync_runs
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS connector_sync_runs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id     uuid        NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  connector_key    text        NOT NULL,
  merchant_id      uuid        REFERENCES merchants(id) ON DELETE SET NULL,
  batch_id         text        NOT NULL,
  dry_run          boolean     NOT NULL DEFAULT false,
  status           text        NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  totals           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  errors           jsonb       DEFAULT NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_connector_sync_runs_connector
  ON connector_sync_runs (connector_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_connector_sync_runs_merchant
  ON connector_sync_runs (merchant_id, started_at DESC);

ALTER TABLE connector_sync_runs ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (API routes autenticadas)
