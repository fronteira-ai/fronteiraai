-- ============================================================
-- 0024 — Product Identity Engine (Shadow Mode) (Release 1.7 — Wave 3)
-- Status: PRONTO PARA EXECUÇÃO
-- ============================================================
--
-- Cria:
-- 1. product_identity_match_log — trilha de auditoria do motor de
--    correspondência (src/domains/product-identity/). Shadow Mode: nenhum
--    Product é fundido, nenhum slug muda, nenhuma Offer é remanejada — este
--    log apenas registra o que o motor teria sugerido, com confidence,
--    atributos batidos/não batidos, penalidades e decisão sugerida, para
--    validar a qualidade do algoritmo antes de qualquer impacto real no
--    catálogo (aprovação do CTO).
--
-- PRINCÍPIO:
-- Falso positivo (unir dois produtos diferentes) é inaceitável. Falso
-- negativo (deixar um duplicado sem unir) é aceitável e corrigível depois.
-- Por isso o motor é conservador: toda decisão é rastreável a atributos
-- nomeados e penalidades explícitas, nunca um número opaco.
--
-- EXPLAINABILITY (revisão do CTO, pré-commit da Wave 3): esta tabela é um
-- ativo estratégico permanente que alimentará o ParaguAI Brain, não apenas
-- uma ferramenta de depuração. Linhas são append-only por design — não existe
-- UPDATE nesta tabela em nenhum código do domínio. Uma avaliação histórica
-- nunca é recalculada; toda evolução futura do algoritmo deve incrementar
-- algorithm_version, e as linhas antigas permanecem interpretáveis
-- exatamente como foram produzidas.
--
-- APÓS APLICAR, execute as SELECTs de verificação ao final deste arquivo.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_identity_match_log (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                text        NOT NULL,
  connector_id            text        NOT NULL,
  candidate_slug          text        NOT NULL,
  candidate_store_slug    text        NOT NULL,
  suggested_product_id    uuid        REFERENCES products(id) ON DELETE SET NULL,
  suggested_product_slug  text,
  algorithm_version       text        NOT NULL,
  confidence_score        numeric(5,2) NOT NULL,
  tier                    text        NOT NULL
    CHECK (tier IN ('auto', 'probable', 'possible', 'new_product')),
  strategy                text        NOT NULL
    CHECK (strategy IN ('exact-slug', 'fuzzy-attribute')),
  matched_attributes      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  mismatched_attributes   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  penalties               jsonb       NOT NULL DEFAULT '[]'::jsonb,
  final_decision          text        NOT NULL
    CHECK (final_decision IN ('auto-merge', 'review', 'new-product')),
  explainability_reason   text        NOT NULL,
  processing_time_ms      integer     NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_identity_match_log_suggested_product
  ON product_identity_match_log (suggested_product_id);

CREATE INDEX IF NOT EXISTS idx_product_identity_match_log_tier
  ON product_identity_match_log (tier);

CREATE INDEX IF NOT EXISTS idx_product_identity_match_log_algorithm_version
  ON product_identity_match_log (algorithm_version);

CREATE INDEX IF NOT EXISTS idx_product_identity_match_log_created_at
  ON product_identity_match_log (created_at DESC);

ALTER TABLE product_identity_match_log ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (sem policy pública) —
-- mesmo padrão de connectors/connector_sync_runs (migration 0022). Inspeção
-- nesta Wave é feita via Supabase SQL Editor; UI dedicada fica para uma Wave
-- futura, uma vez validado o algoritmo com dados reais.

-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ──────────────────────────────────────────────────────────

SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'product_identity_match_log'
  AND schemaname = 'public';

SELECT indexname FROM pg_indexes
WHERE tablename = 'product_identity_match_log'
ORDER BY indexname;
