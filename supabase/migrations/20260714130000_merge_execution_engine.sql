-- ============================================================
-- Merge Execution Engine (Program Ω — Mission Ω-1)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: Partial — ver database/templates/ROLLBACK_TEMPLATE.sql.
--   DROP TABLE merge_executions é seguro isoladamente. Reverter as colunas
--   novas de canonical_products (is_active/merged_into_id) é seguro desde
--   que nenhuma linha tenha is_active=false no momento (senão a informação
--   "quem foi mesclado em quem" se perde). A CHECK constraint estendida de
--   merge_candidates.status pode ser revertida com segurança apenas se
--   nenhuma linha tiver status 'merged'/'rolled_back' ainda.
-- ============================================================
--
-- Contexto (Mission ΔR-2, docs/product/RELEASE_2_FOUNDATION_COMPLETE.md
-- pendências §10): 3.106 merge_candidates existem, gerados pelo
-- CanonicalMergeSuggestionService (Shadow Mode, product-identity/), mas
-- IMergeCandidateRepository nunca teve um método que efetivamente funde
-- dois canonical_products — "aprovar" só marcava um status sem efeito.
-- Esta migration cria a infraestrutura de dado para o Merge Executor
-- (código em src/domains/canonical-catalog/services/MergeExecutorService.ts)
-- poder executar e reverter uma união real.
--
-- Cria/altera:
-- 1. canonical_products.is_active / merged_into_id — merge nunca é um DELETE.
--    A linha "source" permanece para sempre, só marcada inativa e apontando
--    para a linha "target" (survivor) — garante reversibilidade total.
-- 2. merge_candidates.status — CHECK estendido para incluir 'merged' e
--    'rolled_back', os 2 estados novos que fecham a fila
--    Pending→Approved→Merged / Rejected / RolledBack pedida pela missão.
-- 3. merge_executions — log de auditoria append-only de cada execução real.
--    Guarda exatamente os offer ids movidos (moved_offer_ids) — não "todo
--    offer hoje ligado ao target", porque o target pode receber offers de
--    outras execuções depois; rollback precisa da lista exata desta
--    execução, nunca de uma inferência a partir do estado atual.
--
-- PRINCÍPIO: nenhuma linha de canonical_products é apagada por um merge.
-- Nenhuma outra tabela referencia canonical_products.id além de
-- offers.canonical_product_id (confirmado por auditoria de código antes
-- desta migration) — o raio de impacto de um merge é exatamente essa FK.
--
-- Verificação: database/verification/ — a rodar manualmente após aplicar,
-- nunca embutida aqui.
-- ============================================================

ALTER TABLE canonical_products
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS merged_into_id uuid REFERENCES canonical_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_canonical_products_inactive
  ON canonical_products (merged_into_id)
  WHERE is_active = false;

ALTER TABLE merge_candidates DROP CONSTRAINT IF EXISTS merge_candidates_status_check;
ALTER TABLE merge_candidates ADD CONSTRAINT merge_candidates_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'ignored', 'merged', 'rolled_back'));

CREATE TABLE IF NOT EXISTS merge_executions (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merge_candidate_id              uuid        NOT NULL REFERENCES merge_candidates(id) ON DELETE CASCADE,
  source_canonical_product_id     uuid        NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  target_canonical_product_id     uuid        NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  moved_offer_ids                 jsonb       NOT NULL DEFAULT '[]'::jsonb,
  status                          text        NOT NULL DEFAULT 'executed'
    CHECK (status IN ('executed', 'rolled_back')),
  executed_at                     timestamptz NOT NULL DEFAULT now(),
  executed_by                     text,
  rolled_back_at                  timestamptz,
  rolled_back_by                  text,
  UNIQUE (merge_candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_merge_executions_status ON merge_executions (status, executed_at DESC);

ALTER TABLE merge_executions ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (API routes autenticadas) —
-- mesmo padrão de merge_candidates (migration 0025).
