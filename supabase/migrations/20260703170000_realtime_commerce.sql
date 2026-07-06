-- ============================================================
-- Real-Time Commerce Engine (Release 1.8 — Program A — Wave 2)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: Partial — estruturalmente removível (nenhuma FK de outras
--   tabelas aponta para estas três), mas destruiria o ledger append-only de
--   mudanças de mercado (market_changes é o Core Asset desta Wave — mesma
--   disciplina de price_history/exchange_rates). Declarado Partial e
--   desaconselhado, não Possible.
-- Depends on: offers, products, stores, categories (pré-existentes, apenas
--   lidas — este domínio nunca escreve em nenhuma delas).
-- ============================================================
--
-- Cria:
-- 1. market_changes — ledger append-only de toda mudança de mercado
--    detectada (preço, estoque, catálogo, imagem, descrição, categoria,
--    marca, criação/remoção de oferta ou produto). Fonte única de verdade
--    de que Volatility, Freshness, Store Update Intelligence e Market Pulse
--    são todos DERIVADOS por leitura — nenhuma dessas engines mantém seu
--    próprio estado duplicado (Epic 1: "jamais criar lógica duplicada").
-- 2. market_pulse_snapshots — rollup diário (mesmo padrão upsert-by-date de
--    marketplace_health_snapshots), cache de performance para o Market Pulse
--    Engine e a futura Home — nunca fonte de verdade, sempre recomputável a
--    partir de market_changes.
-- 3. buyer_alert_candidates — fundação do Buyer Alert Engine (Epic 8).
--    Somente modelo/pipeline/priorização/rate-limiting nesta Wave — status
--    nunca avança além de 'pending'/'suppressed'/'expired'; não existe
--    mecanismo de envio (sem coluna sent_at, sem canal).
--
-- Verificação: database/verification/realtime_commerce_verify.sql — nunca
-- embutida aqui, nunca executada automaticamente.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — market_changes
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_changes (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  change_type    text         NOT NULL CHECK (change_type IN (
    'price_increased', 'price_decreased',
    'stock_returned', 'stock_out', 'stock_quantity_changed',
    'product_created', 'product_removed',
    'offer_created', 'offer_removed',
    'image_changed', 'description_changed',
    'category_changed', 'brand_changed',
    'promotion_detected', 'canonical_updated'
  )),
  entity_type    text         NOT NULL CHECK (entity_type IN ('offer', 'product')),
  entity_id      uuid         NOT NULL,
  product_id     uuid         REFERENCES products(id) ON DELETE CASCADE,
  store_id       uuid         REFERENCES stores(id) ON DELETE CASCADE,
  field          text         NOT NULL,
  previous_value text,
  current_value  text,
  confidence     numeric(4,3) NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source         text         NOT NULL DEFAULT 'crawler',
  detected_at    timestamptz  NOT NULL DEFAULT now()
);

-- Market Pulse / Live Activity Feed: "o que mudou hoje", ordenado por tempo.
CREATE INDEX IF NOT EXISTS idx_market_changes_detected_at
  ON market_changes (detected_at DESC);

-- Volatility Engine: histórico de um produto específico.
CREATE INDEX IF NOT EXISTS idx_market_changes_product_detected
  ON market_changes (product_id, detected_at DESC);

-- Store Update Intelligence / Live Activity Feed: histórico de uma loja.
CREATE INDEX IF NOT EXISTS idx_market_changes_store_detected
  ON market_changes (store_id, detected_at DESC);

-- Freshness Engine: última mudança conhecida de uma offer específica.
CREATE INDEX IF NOT EXISTS idx_market_changes_entity
  ON market_changes (entity_type, entity_id, detected_at DESC);

-- Market Pulse: agregações por tipo de mudança.
CREATE INDEX IF NOT EXISTS idx_market_changes_type_detected
  ON market_changes (change_type, detected_at DESC);

ALTER TABLE market_changes ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role — mesmo padrão de
-- exchange_rates/price_history. Nenhuma policy pública: dashboards e APIs
-- públicas leem no servidor com o client de service_role.

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — market_pulse_snapshots
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS market_pulse_snapshots (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date               date        NOT NULL,
  prices_changed_count        integer     NOT NULL DEFAULT 0,
  prices_dropped_count        integer     NOT NULL DEFAULT 0,
  prices_raised_count         integer     NOT NULL DEFAULT 0,
  products_added_count        integer     NOT NULL DEFAULT 0,
  products_removed_count      integer     NOT NULL DEFAULT 0,
  top_categories              jsonb       NOT NULL DEFAULT '[]'::jsonb,
  top_stores                  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  cheapest_category           jsonb,
  most_expensive_move_category jsonb,
  generated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date)
);

ALTER TABLE market_pulse_snapshots ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (cron de snapshot +
-- dashboard admin; futura Home lerá via API pública server-side, ADR-036).

-- ──────────────────────────────────────────────────────────
-- PARTE 3 — buyer_alert_candidates
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_alert_candidates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type     text        NOT NULL CHECK (alert_type IN (
    'price_drop', 'stock_returned', 'new_promotion', 'new_product', 'relevant_change'
  )),
  product_id     uuid        REFERENCES products(id) ON DELETE CASCADE,
  offer_id       uuid,
  store_id       uuid        REFERENCES stores(id) ON DELETE CASCADE,
  market_change_id uuid      REFERENCES market_changes(id) ON DELETE CASCADE,
  priority       integer     NOT NULL DEFAULT 0,
  payload        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  rate_limit_key text        NOT NULL,
  status         text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'suppressed', 'expired')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Rate limiting (Epic 8): um candidato por chave por dia — a chave inclui a
-- data para não exigir uma varredura/expiração ativa.
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyer_alert_candidates_rate_limit_key
  ON buyer_alert_candidates (rate_limit_key);

CREATE INDEX IF NOT EXISTS idx_buyer_alert_candidates_status_created
  ON buyer_alert_candidates (status, created_at DESC);

ALTER TABLE buyer_alert_candidates ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role. Sem policy pública: não
-- existe envio nesta Wave, apenas o modelo/pipeline (Epic 8 explicitamente
-- proíbe notificações reais nesta Wave).
