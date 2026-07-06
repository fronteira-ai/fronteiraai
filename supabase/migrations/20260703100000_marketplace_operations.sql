-- ============================================================
-- Marketplace Operations Platform (Release 1.8 — Program 0 — Wave 1)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: Possible — DROP TABLE em ambas as tabelas é seguro isoladamente;
--   nenhum outro código depende delas (domínio novo, sem consumidores
--   existentes). marketplace_health_snapshots é um cache derivado de
--   dados já existentes (recriável rodando o snapshot job de novo);
--   marketplace_alerts perde histórico de alertas já resolvidos, mas nada
--   externo referencia essas linhas.
-- Depends on: connector_platform, canonical_catalog, merchant_ownership,
--   analytics_platform (todas já aplicadas — este domínio só lê essas
--   tabelas, nunca escreve nelas).
-- ============================================================
--
-- Cria:
-- 1. marketplace_health_snapshots — snapshot diário do Marketplace Health
--    Score (Epic 2), marketplace-wide. Mesmo padrão de
--    merchant_catalog_snapshots (Release 1.6), mas sem a dimensão
--    merchant_id — uma linha por dia para o marketplace inteiro.
-- 2. marketplace_alerts — ciclo de vida de alertas operacionais (Epic 8).
--    Mesmo padrão de merchant_decision_actions: dedupe na criação por
--    (alert_type, subject_type, subject_id), nunca apagar, apenas
--    atualizar status.
--
-- PRINCÍPIO:
-- Merchant Priority (Epic 3) é deliberadamente compute-on-read, sem tabela
-- própria — ver src/domains/marketplace-operations/services/MerchantPriorityService.ts
-- e docs/engineering/MARKETPLACE_FOUNDATION_SCALE_AUDIT.md para o
-- raciocínio completo (uma segunda fonte de verdade persistida arriscaria
-- divergir do score mostrado ao vivo).
--
-- Verificação: database/verification/marketplace_operations_verify.sql —
-- nunca embutida aqui, nunca executada automaticamente.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — marketplace_health_snapshots
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_health_snapshots (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date    date        NOT NULL,
  overall_score    numeric     NOT NULL,
  factor_breakdown jsonb       NOT NULL,
  metrics          jsonb       NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date)
);

ALTER TABLE marketplace_health_snapshots ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (rotas /api/admin/marketplace-operations/*)

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — marketplace_alerts
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS marketplace_alerts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type   text        NOT NULL
    CHECK (alert_type IN (
      'connector_down', 'store_not_syncing', 'low_coverage', 'discovery_stalled',
      'claim_pending', 'canonical_merge_backlog', 'health_score_dropped', 'low_freshness'
    )),
  severity     text        NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  status       text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acknowledged', 'resolved', 'ignored')),
  subject_type text        CHECK (subject_type IN ('connector', 'store', 'category', 'brand', 'marketplace')),
  subject_id   text,
  title        text        NOT NULL,
  details      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);

-- Dedupe-on-create (MarketplaceAlertService.sync) queries open alerts by
-- this exact key before inserting a new one.
CREATE INDEX IF NOT EXISTS idx_marketplace_alerts_open_key
  ON marketplace_alerts (alert_type, subject_type, subject_id, status);

-- Alert list, filterable by status (Marketplace Operations dashboard)
CREATE INDEX IF NOT EXISTS idx_marketplace_alerts_status_created
  ON marketplace_alerts (status, created_at DESC);

ALTER TABLE marketplace_alerts ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (rotas /api/admin/marketplace-operations/*)
