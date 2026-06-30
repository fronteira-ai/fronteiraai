-- ============================================================
-- 0018 — Analytics Platform: Event Store + Sessions + Merchant Daily
-- Status: PRONTO PARA EXECUÇÃO (Release 1.6)
-- ============================================================
--
-- Cria:
-- 1. buyer_events      — log imutável de eventos comportamentais (append-only)
-- 2. buyer_sessions    — sessões de navegação (mutable, updated por events)
-- 3. merchant_analytics_daily — agregações diárias pré-computadas por merchant
--
-- Filosofia:
-- - Eventos são IMUTÁVEIS: sem UPDATE, sem DELETE em buyer_events
-- - Histórico é PERMANENTE: nenhum dado é apagado
-- - Índices cobrindo as queries analíticas mais comuns
-- - Preparado para particionamento por mês em buyer_events (comentário abaixo)
--
-- PARTICIONAMENTO FUTURO:
-- Quando buyer_events ultrapassar ~10M linhas, converter para tabela particionada:
--   ALTER TABLE buyer_events RENAME TO buyer_events_legacy;
--   CREATE TABLE buyer_events (LIKE buyer_events_legacy) PARTITION BY RANGE (occurred_at);
--   CREATE TABLE buyer_events_2026_06 PARTITION OF buyer_events
--     FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
-- Fazer isso via nova migration sem perder dados históricos.
--
-- APÓS APLICAR:
-- 1. Verificar criação: SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'buyer%' OR table_name LIKE 'merchant_analytics%';
-- 2. Testar INSERT em buyer_events via API POST /api/analytics/events
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — buyer_sessions (criado primeiro, referenciado por events)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_sessions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id     text        NOT NULL,
  device_type      text        DEFAULT NULL,
  browser          text        DEFAULT NULL,
  country          text        DEFAULT NULL,
  city             text        DEFAULT NULL,
  language         text        DEFAULT NULL,
  entry_page       text        DEFAULT NULL,
  exit_page        text        DEFAULT NULL,
  event_count      integer     NOT NULL DEFAULT 0,
  started_at       timestamptz NOT NULL DEFAULT now(),
  last_event_at    timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz DEFAULT NULL,
  duration_seconds integer     DEFAULT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — buyer_events (append-only event log)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_events (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       text        NOT NULL,
  session_id       uuid        REFERENCES buyer_sessions(id) ON DELETE SET NULL,
  buyer_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id     text        NOT NULL,
  merchant_id      uuid        REFERENCES merchants(id) ON DELETE SET NULL,
  store_id         uuid        REFERENCES stores(id) ON DELETE SET NULL,
  product_id       uuid        REFERENCES products(id) ON DELETE SET NULL,
  search_query     text        DEFAULT NULL,
  page_url         text        NOT NULL,
  referrer         text        DEFAULT NULL,
  metadata         jsonb       DEFAULT '{}'::jsonb,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- PARTE 3 — merchant_analytics_daily (pre-aggregated)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_analytics_daily (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id          uuid    NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  date                 date    NOT NULL,
  views                integer NOT NULL DEFAULT 0,
  unique_visitors      integer NOT NULL DEFAULT 0,
  product_impressions  integer NOT NULL DEFAULT 0,
  product_clicks       integer NOT NULL DEFAULT 0,
  contact_clicks       integer NOT NULL DEFAULT 0,
  whatsapp_clicks      integer NOT NULL DEFAULT 0,
  phone_clicks         integer NOT NULL DEFAULT 0,
  website_clicks       integer NOT NULL DEFAULT 0,
  offer_saves          integer NOT NULL DEFAULT 0,
  search_appearances   integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, date)
);

-- ──────────────────────────────────────────────────────────
-- ÍNDICES — buyer_events
-- ──────────────────────────────────────────────────────────

-- Queries analíticas de merchant (mais comuns)
CREATE INDEX IF NOT EXISTS idx_buyer_events_merchant_time
  ON buyer_events (merchant_id, occurred_at DESC)
  WHERE merchant_id IS NOT NULL;

-- Reconstrução de stream por sessão
CREATE INDEX IF NOT EXISTS idx_buyer_events_session
  ON buyer_events (session_id, occurred_at ASC)
  WHERE session_id IS NOT NULL;

-- Queries por tipo de evento (funnel analysis)
CREATE INDEX IF NOT EXISTS idx_buyer_events_type_time
  ON buyer_events (event_type, occurred_at DESC);

-- Analytics por produto
CREATE INDEX IF NOT EXISTS idx_buyer_events_product_time
  ON buyer_events (product_id, occurred_at DESC)
  WHERE product_id IS NOT NULL;

-- Jornada de compradores autenticados
CREATE INDEX IF NOT EXISTS idx_buyer_events_buyer_time
  ON buyer_events (buyer_id, occurred_at DESC)
  WHERE buyer_id IS NOT NULL;

-- Jornada de compradores anônimos
CREATE INDEX IF NOT EXISTS idx_buyer_events_anon_time
  ON buyer_events (anonymous_id, occurred_at DESC);

-- Search analytics
CREATE INDEX IF NOT EXISTS idx_buyer_events_search
  ON buyer_events (event_type, occurred_at DESC)
  WHERE event_type = 'SearchPerformed';

-- ──────────────────────────────────────────────────────────
-- ÍNDICES — buyer_sessions
-- ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_buyer_sessions_anon
  ON buyer_sessions (anonymous_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyer_sessions_buyer
  ON buyer_sessions (buyer_id, started_at DESC)
  WHERE buyer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_buyer_sessions_started
  ON buyer_sessions (started_at DESC);

-- ──────────────────────────────────────────────────────────
-- ÍNDICES — merchant_analytics_daily
-- ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_merchant_analytics_daily_merchant_date
  ON merchant_analytics_daily (merchant_id, date DESC);

-- ──────────────────────────────────────────────────────────
-- RLS — buyer_events
-- ──────────────────────────────────────────────────────────

ALTER TABLE buyer_events ENABLE ROW LEVEL SECURITY;

-- Escrita: qualquer um pode inserir (evento público, sem auth obrigatória)
-- NOTA: A API valida rate limit + sanitização. RLS permite insert para supabase anon key.
CREATE POLICY buyer_events_insert ON buyer_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Leitura: somente service_role (analytics APIs usam service key)
-- Nenhuma policy de SELECT pública — dados comportamentais são privados

-- ──────────────────────────────────────────────────────────
-- RLS — buyer_sessions
-- ──────────────────────────────────────────────────────────

ALTER TABLE buyer_sessions ENABLE ROW LEVEL SECURITY;

-- Escrita: qualquer um pode criar/atualizar (stateless session management)
CREATE POLICY buyer_sessions_insert ON buyer_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY buyer_sessions_update ON buyer_sessions
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ──────────────────────────────────────────────────────────
-- RLS — merchant_analytics_daily
-- ──────────────────────────────────────────────────────────

ALTER TABLE merchant_analytics_daily ENABLE ROW LEVEL SECURITY;

-- Leitura: merchant lê apenas seus próprios dados (verificado via API + service role)
-- Escrita: somente service_role (computação server-side)

-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ──────────────────────────────────────────────────────────

SELECT table_name, row_security
FROM information_schema.tables
WHERE table_name IN ('buyer_events', 'buyer_sessions', 'merchant_analytics_daily')
  AND table_schema = 'public'
ORDER BY table_name;

SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('buyer_events', 'buyer_sessions', 'merchant_analytics_daily')
ORDER BY tablename, indexname;
