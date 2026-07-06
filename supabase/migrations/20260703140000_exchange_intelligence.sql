-- ============================================================
-- Exchange Intelligence Platform (Release 1.8 — Program A — Wave 1)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: Partial — estruturalmente removível (nenhuma FK aponta para
--   estas três tabelas), mas destruiria histórico Core Asset INSERT-only
--   (STRATEGIC_ASSETS.md Anti-Pattern 5: "dados de Core Assets são
--   INSERT-only... um dia de dados perdidos não pode ser recuperado").
--   Declarado Partial e desaconselhado, não Possible.
-- Depends on: offers, products, categories (pré-existentes, apenas lidas,
--   nunca escritas por este domínio — offers.currency é reaproveitada como
--   "moeda original", ver ADR em docs/operations/DECISIONS.md).
-- ============================================================
--
-- Cria:
-- 1. exchange_rates — cotações capturadas, INSERT-only (mesma disciplina de
--    price_history). Nunca uma UPDATE: uma correção é uma nova linha.
-- 2. exchange_provider_runs — log de tentativas de fetch por provedor,
--    mesmo padrão de connector_sync_runs — alimenta ExchangeProviderHealthService.
-- 3. exchange_conversion_log — contagem de conversões via API pública,
--    INSERT-only, mínima (sem PII — from/to/amount apenas), evita acoplar
--    este domínio à taxonomia de eventos de merchant-analytics (Epic 1:
--    "exchange jamais depende de outros domínios").
--
-- PRINCÍPIO:
-- offers.currency já significa "moeda original do preço" (default 'USD' em
-- todo conector hoje) — NÃO se cria uma coluna original_currency nova. Toda
-- conversão (rate_used, converted_price, conversion_date, rate_version) é
-- computada sob demanda por AutomaticCurrencyService, nunca persistida em
-- offers/price_history — "nunca alterar o preço original" (mandato do CTO)
-- é garantido estruturalmente: não há coluna para alterar.
--
-- Verificação: database/verification/exchange_intelligence_verify.sql —
-- nunca embutida aqui, nunca executada automaticamente.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — exchange_rates
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_rates (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  pair         text         NOT NULL CHECK (pair IN ('USD/PYG', 'USD/BRL', 'BRL/PYG')),
  rate         numeric(18,6) NOT NULL,
  source       text         NOT NULL,
  captured_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_captured_at
  ON exchange_rates (pair, captured_at DESC);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role — mesmo padrão de
-- canonical_products (RLS habilitada, zero policy pública; rotas públicas
-- de /api/exchange/* leem no servidor com o client de service_role, mesmo
-- caminho já usado por /api/canonical-catalog/[slug], ADR-036).

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — exchange_provider_runs
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_provider_runs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id       text        NOT NULL,
  status            text        NOT NULL CHECK (status IN ('success', 'failure')),
  response_time_ms  integer,
  error_message     text,
  attempted_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_provider_runs_provider_attempted
  ON exchange_provider_runs (provider_id, attempted_at DESC);

ALTER TABLE exchange_provider_runs ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (dashboard admin apenas —
-- nunca exposta bruta em /api/exchange/providers, que retorna campos
-- reduzidos, ver route handler).

-- ──────────────────────────────────────────────────────────
-- PARTE 3 — exchange_conversion_log
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_conversion_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency  text        NOT NULL,
  to_currency    text        NOT NULL,
  amount         numeric(18,2) NOT NULL,
  converted_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exchange_conversion_log_converted_at
  ON exchange_conversion_log (converted_at DESC);

ALTER TABLE exchange_conversion_log ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role — POST /api/exchange/convert
-- grava no servidor, nunca diretamente do client.
