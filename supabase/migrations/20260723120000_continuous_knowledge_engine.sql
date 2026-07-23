-- ============================================================
-- Continuous Knowledge Engine (Program Ω — Mission Ω-5)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: total e seguro — `knowledge_history` é uma tabela nova e
--   aditiva. DROP TABLE não quebra nada fora desta migration. Nenhuma
--   tabela existente (merchant_attribute_patterns, marketplace_memory_facts,
--   catalog_pending_reviews, catalog_recovery_decisions, merge_candidates,
--   products/offers/brands/categories) é alterada em schema por esta
--   migration — o Engine só LÊ essas tabelas, nunca escreve nelas
--   (compatibilidade explícita da Missão: não alterar Sync Pipeline,
--   Product Identity, Merge Engine, Offer Ranking, Catalog Recovery,
--   Firewall, Conectores).
-- ============================================================
--
-- Contexto: docs/architecture/MARKETPLACE_LEARNING_ENGINE.md (Mission Ξ-2)
-- já especificou este domínio como "patrimônio institucional versionado —
-- append-only, nunca apagado, auditável" (mesmo princípio de
-- merge_executions, Program Ω) e docs/architecture/LEARNING_LIFECYCLE.md
-- já especificou o ciclo (Persistência -> Versionamento -> Reutilização)
-- que esta tabela implementa pela primeira vez em código. Cada linha é uma
-- VERSÃO imutável de um conhecimento — nunca UPDATE, nunca DELETE, só
-- INSERT. O histórico completo de um `knowledge_key` é a auditoria exigida
-- pela missão ("Nunca sobrescrever conhecimento anterior. Sempre
-- versionar.").

CREATE TABLE IF NOT EXISTS knowledge_history (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade natural do conhecimento ao longo do tempo — múltiplas linhas
  -- legitimamente compartilham a mesma knowledge_key (é isso que forma o
  -- histórico de versões). Formato: "{tipo}:{storeId|global}:{rawValue}".
  knowledge_key        text        NOT NULL,

  -- Fecha na mesma lista de PatternConcept (Program Ω, Mission Ω-1) —
  -- brand/category/manufacturer_code/model/family/line/capacity_gb/ram_gb/
  -- screen_size_in/color/voltage/power_w/ean/bundle_includes/processor/gpu.
  -- Nenhum valor novo introduzido por esta Missão.
  knowledge_type       text        NOT NULL,

  scope                text        NOT NULL CHECK (scope IN ('local', 'global')),

  -- NULL somente quando scope='global' — um fato global não pertence mais
  -- a uma única loja (mesma honestidade que LearnedFact.merchantId já usa).
  store_id              uuid        REFERENCES stores(id) ON DELETE CASCADE,

  raw_value             text        NOT NULL,
  resolved_value         text        NOT NULL,

  confidence            text        NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),

  -- Contagem cumulativa de observações confirmadas, copiada da fonte
  -- confirmada de origem (ex.: merchant_attribute_patterns.occurrences) —
  -- nunca recalculada aqui.
  occurrences            integer     NOT NULL DEFAULT 1,

  -- Quantas lojas INDEPENDENTES já confirmaram o mesmo mapeamento — a
  -- evidência que GLOBAL_MIN_INDEPENDENT_STORES (=2) checa antes de
  -- promover local -> global.
  distinct_store_count   integer     NOT NULL DEFAULT 1,

  -- 1-based, cresce exatamente +1 a cada mudança aceita para esta
  -- knowledge_key. Nunca reaproveitado, nunca decrementado.
  version                integer     NOT NULL,

  -- Lista fechada — de onde este conhecimento veio. Nunca "ia"/"llm"/
  -- "embedding"/"inferência". Ver types/enums.ts (KnowledgeSourceSystem).
  source_system          text        NOT NULL CHECK (source_system IN (
    'pending_review_resolution', 'catalog_recovery_decision',
    'canonical_merge_approval', 'learned_fact_confirmed'
  )),

  -- id da linha confirmada de origem (pending review, recovery decision,
  -- merge candidate, learned fact) — rastreabilidade até a decisão humana
  -- ou sistema determinístico que produziu esta versão. NULL permitido
  -- apenas para registros agregados (ex.: promoção global, que agrega
  -- múltiplas fontes locais, não uma única).
  source_id              uuid,

  reason                 text        NOT NULL,
  -- Marca estrutural (não inferida de texto) de que esta versão foi
  -- registrada porque uma nova confirmação divergiu do valor já
  -- confirmado — nunca sobrescreve o anterior, só marca o desacordo real
  -- para o relatório de observabilidade ("Conflitos", requisito da missão).
  is_conflict            boolean     NOT NULL DEFAULT false,
  algorithm_version      text        NOT NULL,

  created_at             timestamptz NOT NULL DEFAULT now(),

  -- Nunca duas linhas com a mesma (knowledge_key, version) — a garantia de
  -- append-only real, não só uma convenção de aplicação.
  UNIQUE (knowledge_key, version)
);

-- A leitura mais comum: "qual é a versão mais recente desta knowledge_key?"
CREATE INDEX IF NOT EXISTS idx_knowledge_history_key_version
  ON knowledge_history (knowledge_key, version DESC);

-- Observability/relatórios: última versão por tipo+escopo, e por loja.
CREATE INDEX IF NOT EXISTS idx_knowledge_history_type_scope
  ON knowledge_history (knowledge_type, scope);
CREATE INDEX IF NOT EXISTS idx_knowledge_history_store
  ON knowledge_history (store_id);

-- GlobalPromotionEngine: "todas as observações locais confirmadas para este
-- (tipo, resolved_value), agrupadas pelo valor CANÔNICO (não pela grafia
-- bruta, que varia legitimamente entre lojas independentes)" — a leitura
-- que decide promoção global.
CREATE INDEX IF NOT EXISTS idx_knowledge_history_type_resolved_value
  ON knowledge_history (knowledge_type, resolved_value, scope);

ALTER TABLE knowledge_history ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (scripts/API routes
-- autenticadas) — mesmo padrão de catalog_pending_reviews/merge_candidates/
-- marketplace_memory_facts. Nenhuma policy pública: este domínio nunca é
-- lido pelo cliente anônimo.

COMMENT ON TABLE knowledge_history IS
  'Program Ω, Mission Ω-5 (Continuous Knowledge Engine). Ledger append-only '
  'de conhecimento confirmado (marcas, categorias, atributos, padrões por '
  'loja) — nunca UPDATE, nunca DELETE. Cada linha é uma versão imutável; o '
  'histórico completo de uma knowledge_key é a auditoria exigida pela '
  'missão. Aprende exclusivamente de correções humanas aprovadas e '
  'decisões determinísticas já confirmadas (ver source_system) — nunca de '
  'IA, nunca de inferência não confirmada.';
