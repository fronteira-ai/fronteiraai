-- ============================================================
-- Canonical Suggestion Outbox (Program Ω — Mission Ω-Canonical Integration)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: total e seguro — `canonical_suggestion_outbox` é uma tabela nova
--   e aditiva, de propriedade exclusiva de connectors/. DROP TABLE em
--   qualquer momento não quebra nada fora desta migration. Nenhuma tabela
--   existente (canonical_products, merge_candidates, merge_executions,
--   products, offers) é alterada em schema — esta Missão só LÊ essas
--   tabelas através dos serviços públicos já existentes
--   (CanonicalProductService, ICanonicalCatalogRepository.linkOffer,
--   CanonicalMergeSuggestionService), nunca escreve diretamente nelas.
-- ============================================================
--
-- Contexto: a Mission Ω-COMPARISON AUDIT encontrou uma lacuna
-- arquitetural — o Sync Pipeline nunca vincula offers ao Canonical
-- Catalog, e o único caminho que já vinculou foi um script manual rodado
-- pela última vez em 2026-07-12. A Mission Ω-Canonical Integration fecha
-- essa lacuna com um novo stage síncrono (CanonicalLinkStage — barato,
-- O(1) por item: bootstrap + link) e um Transactional Outbox que
-- desacopla a etapa cara (Product Identity: suggestMergesFor) do caminho
-- crítico da sincronização, com contrato explícito de AT LEAST ONCE
-- DELIVERY (aprovado na Fase 1 desta Missão).

CREATE TABLE IF NOT EXISTS canonical_suggestion_outbox (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  canonical_product_id  uuid        NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,

  status                text        NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'done', 'failed', 'dead_letter'
  )),

  -- Contador de tentativas reais de processamento — nunca resetado,
  -- cresce a cada falha, usado para decidir backoff e o limite de
  -- MAX_ATTEMPTS antes de dead_letter.
  attempts              integer     NOT NULL DEFAULT 0,

  last_error            text,
  last_attempted_at     timestamptz,

  -- Agendamento de retry (backoff exponencial com teto, calculado em
  -- aplicação — nunca antes desta data o item é elegível para novo claim).
  next_attempt_at       timestamptz NOT NULL DEFAULT now(),

  -- Marca quando um worker reivindicou este item — usado para detectar
  -- claims travados (worker morreu no meio do processamento) e liberá-los
  -- para reprocessamento após uma janela de staleness, sem lock distribuído.
  claimed_at            timestamptz,

  -- Versão do PRODUCT_IDENTITY_ALGORITHM_VERSION usada na última
  -- tentativa real de processamento (Fase 1, refinamento 1) — permite
  -- auditoria histórica, reprocessamento seletivo por versão, e
  -- comparação de comportamento entre versões do algoritmo. Mesmo nome e
  -- semântica de merge_candidates.algorithm_version — nunca um conceito
  -- paralelo de "versão do worker".
  algorithm_version     text,

  -- Rastreabilidade de origem: qual sync enfileirou este item
  -- (formato "{connectorId}:{batchId}") — nunca um campo opaco.
  source                text        NOT NULL,

  enqueued_at           timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Nunca duas linhas ATIVAS (pending ou processing) para o mesmo canonical
-- product ao mesmo tempo — um segundo enqueue enquanto uma já está em
-- andamento é idempotente (no-op), garantido pelo próprio banco, não só
-- pela aplicação. Uma vez que uma linha chega a done/failed/dead_letter,
-- uma nova linha pending PODE ser criada para o mesmo canonical_product_id
-- (ex.: relinkado num sync futuro) — isso é esperado, nunca um erro.
CREATE UNIQUE INDEX IF NOT EXISTS idx_cso_active_per_canonical
  ON canonical_suggestion_outbox (canonical_product_id)
  WHERE status IN ('pending', 'processing');

-- A leitura do claim: candidatos pending devidos, na ordem certa.
CREATE INDEX IF NOT EXISTS idx_cso_claim_pending
  ON canonical_suggestion_outbox (next_attempt_at)
  WHERE status = 'pending';

-- A leitura do claim: claims travados (processing há mais que a janela de
-- staleness).
CREATE INDEX IF NOT EXISTS idx_cso_claim_stale
  ON canonical_suggestion_outbox (claimed_at)
  WHERE status = 'processing';

-- Observabilidade: distribuição por status (dead_letter é o alarme
-- principal), e auditoria por algorithm_version.
CREATE INDEX IF NOT EXISTS idx_cso_status ON canonical_suggestion_outbox (status);
CREATE INDEX IF NOT EXISTS idx_cso_algorithm_version ON canonical_suggestion_outbox (algorithm_version);

ALTER TABLE canonical_suggestion_outbox ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (CanonicalLinkStage no
-- Sync Pipeline + o cron /api/cron/canonical-catalog/merge-suggestions) —
-- mesmo padrão de catalog_pending_reviews/merge_candidates/knowledge_history.
-- Nenhuma policy pública: este domínio nunca é lido pelo cliente anônimo.

COMMENT ON TABLE canonical_suggestion_outbox IS
  'Program Ω — Mission Ω-Canonical Integration. Transactional Outbox, '
  'propriedade de connectors/, que desacopla suggestMergesFor() '
  '(Product Identity) do caminho crítico do Sync Pipeline. Contrato: AT '
  'LEAST ONCE DELIVERY — todo consumidor deste outbox (hoje só '
  'CanonicalMergeSuggestionService.suggestMergesFor) já é idempotente por '
  'construção; retries e reprocessamento são comportamento esperado, '
  'nunca condição de erro. dead_letter é estado terminal explícito e '
  'nunca silencioso — nunca reentra automaticamente na fila.';
