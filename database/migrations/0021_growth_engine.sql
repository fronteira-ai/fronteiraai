-- ============================================================
-- 0021 — Growth Engine: Recommendation History
-- Status: PRONTO PARA EXECUÇÃO (Release 1.6 — Epic 5)
-- ============================================================
--
-- Cria:
-- 1. merchant_growth_history — log append-only de eventos de recomendação de crescimento
--
-- PRINCÍPIO:
-- Recomendações de crescimento são computadas on-demand (nunca armazenadas).
-- O que persiste é o EVENTO de interação do merchant com cada recomendação.
-- Nunca deletar histórico. Sempre append-only.
-- Usar recommendation_id (determinístico: strategy_id:subcategory:merchant_id) como chave natural.
--
-- APÓS APLICAR:
-- Verificar: SELECT table_name FROM information_schema.tables WHERE table_name = 'merchant_growth_history';
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — merchant_growth_history
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_growth_history (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id       uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  recommendation_id text        NOT NULL,
  strategy_id       text        NOT NULL,
  category          text        NOT NULL,
  title             text        NOT NULL,
  event_type        text        NOT NULL
    CHECK (event_type IN ('viewed', 'accepted', 'ignored', 'completed')),
  occurred_at       timestamptz NOT NULL DEFAULT now(),
  metadata          jsonb       NOT NULL DEFAULT '{}'::jsonb
);

-- ──────────────────────────────────────────────────────────
-- ÍNDICES
-- ──────────────────────────────────────────────────────────

-- Timeline por merchant (ordenado por data — uso principal)
CREATE INDEX IF NOT EXISTS idx_merchant_growth_history_timeline
  ON merchant_growth_history (merchant_id, occurred_at DESC);

-- Consulta por recommendation_id (para evitar views duplicadas)
CREATE INDEX IF NOT EXISTS idx_merchant_growth_history_recommendation
  ON merchant_growth_history (merchant_id, recommendation_id);

-- Consulta por event_type (para Impact Tracking)
CREATE INDEX IF NOT EXISTS idx_merchant_growth_history_event
  ON merchant_growth_history (merchant_id, event_type, occurred_at DESC);

-- ──────────────────────────────────────────────────────────
-- RLS
-- ──────────────────────────────────────────────────────────

ALTER TABLE merchant_growth_history ENABLE ROW LEVEL SECURITY;

-- Leitura/escrita exclusivamente via service_role (API routes autenticadas)

-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ──────────────────────────────────────────────────────────

SELECT table_name, row_security
FROM information_schema.tables
WHERE table_name = 'merchant_growth_history'
  AND table_schema = 'public';

SELECT indexname FROM pg_indexes
WHERE tablename = 'merchant_growth_history'
ORDER BY indexname;
