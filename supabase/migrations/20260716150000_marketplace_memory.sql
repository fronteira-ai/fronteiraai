-- ============================================================
-- Marketplace Memory Foundation (Program Ω — Implementation Phase, Mission Ω-1)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: total e seguro — as 2 tabelas abaixo são novas e aditivas.
--   Nenhuma tabela existente (canonical_products, stores, products, offers,
--   merge_candidates) é alterada. `DROP TABLE marketplace_memory_facts`
--   e `DROP TABLE merchant_attribute_patterns`, em qualquer ordem, não
--   quebra nada fora desta migration.
-- ============================================================
--
-- Contexto: docs/architecture/INCREMENTAL_ARCHITECTURE_CONSTITUTION.md
-- (Program Ξ, Mission Ξ-3) define o Knowledge Aggregate e o Learning
-- Aggregate como agregados distintos — esta migration cria a persistência
-- do primeiro (o FATO em si) mais a memória por merchant nomeada em
-- docs/architecture/MERCHANT_LEARNING.md (Mission Ξ-2). O ciclo de vida
-- completo do Learning Aggregate (invalidação automática, versionamento
-- ativo, promoção de padrão) é explicitamente Learning Engine — fora do
-- escopo desta Mission ("NÃO implementa Learning Engine").
--
-- IMPORTANTE: esta migration NÃO altera `canonical_products`, `products`,
-- `offers`, `stores`, `merge_candidates` ou qualquer tabela de Product
-- Identity/Merge Engine. Nenhuma coluna é adicionada a tabela existente.
-- `ProductIdentityEngine`/`CanonicalMergeSuggestionService` continuam sem
-- saber que estas tabelas existem — nenhum comportamento existente muda.
--
-- Cria:
-- 1. marketplace_memory_facts — o Knowledge Aggregate persistido: um fato
--    determinístico por (canonical_product, tipo de fato). Nunca um
--    resultado derivado (nunca confiança de match, nunca score de
--    oportunidade) — só o que já era calculado por uma função pura já
--    existente (buildProductSignature, Κ-3; taxonomy, Κ-2) e antes era
--    descartado.
-- 2. merchant_attribute_patterns — memória por merchant de qual chave de
--    especificação bruta mapeia para qual conceito, com contagem de
--    ocorrências (suporte de armazenamento para a promoção por
--    recorrência descrita em docs/architecture/PATTERN_LEARNING.md — a
--    lógica de promoção em si é Learning Engine, não construída aqui).
-- ============================================================

CREATE TABLE IF NOT EXISTS marketplace_memory_facts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_product_id  uuid        NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,

  -- O conceito aprendido. Lista fechada, alinhada aos campos reais de
  -- ProductSignature (Κ-3) mais categoria/marca (Κ-2, via taxonomy/) mais
  -- family/line (ainda sem extrator real — colunas do futuro, nunca
  -- fabricadas: ver docs/architecture/PRODUCT_KNOWLEDGE_GRAPH.md §2).
  -- "tokens" está na lista por ser um conceito nomeado nas Missions Ξ-2/
  -- Ξ-3, mas deliberadamente não populado por esta Mission — tokenize()
  -- é uma função privada de ProductIdentityEngine.ts, não exportada, e
  -- exportá-la contaria como alterar Product Identity (restrição
  -- explícita desta Mission).
  fact_type             text        NOT NULL
    CHECK (fact_type IN (
      'manufacturer_code', 'model', 'category', 'brand', 'family', 'line',
      'capacity_gb', 'ram_gb', 'screen_size_in', 'color', 'voltage',
      'power_w', 'ean', 'bundle_includes', 'processor', 'gpu', 'tokens'
    )),

  -- Sempre texto — mesmo padrão de canonical_products.specifications
  -- (jsonb de texto): o consumidor sabe como interpretar por fact_type,
  -- nunca um formato polimórfico por coluna.
  fact_value            text        NOT NULL,

  confidence            text        NOT NULL DEFAULT 'high'
    CHECK (confidence IN ('high', 'medium', 'low')),

  -- De onde, no dado de origem, o fato veio — mesmo vocabulário de
  -- AttributeSource (product-intelligence.types.ts, Κ-3), nunca reinventado.
  source                text        NOT NULL
    CHECK (source IN ('specifications', 'name', 'brand_id', 'taxonomy')),

  -- Rastreabilidade — mesmo campo que AttributeValue.extractedFrom (Κ-3)
  -- já carrega em memória; aqui persistido pela primeira vez.
  extracted_from        text,

  -- A loja cujo `products` row foi a fonte real desta extração, quando
  -- determinável. NULL é o valor honesto (não "não aplicável") quando o
  -- canonical_product já uniu múltiplas lojas e a proveniência de uma
  -- string específica deixou de ser um único merchant — nunca adivinhado.
  merchant_id           uuid        REFERENCES stores(id) ON DELETE SET NULL,

  -- Contexto operacional de quando o fato foi aprendido — distinto de
  -- `source` (que descreve ONDE no dado, não QUANDO/COMO no processo).
  origin                text        NOT NULL DEFAULT 'backfill'
    CHECK (origin IN ('sync', 'backfill', 'manual')),

  validation_status     text        NOT NULL DEFAULT 'unvalidated'
    CHECK (validation_status IN ('unvalidated', 'confirmed', 'invalidated')),

  -- Mesmo padrão de PRODUCT_IDENTITY_ALGORITHM_VERSION (product-identity/
  -- types/enums.ts, já em produção) — a versão do extrator que produziu
  -- este valor. Permite reaprendizado seletivo quando um extrator evolui,
  -- sem invalidar em massa por suposição.
  algorithm_version     text        NOT NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Um fato corrente por (produto, tipo) — esta Mission persiste estado
  -- atual com metadado completo, não histórico completo (histórico
  -- completo de versões é Learning Engine, Objetivo 3 desta Mission
  -- documenta essa fronteira explicitamente).
  UNIQUE (canonical_product_id, fact_type)
);

-- Leitura mais comum: "todos os fatos de um produto" (Learning Service).
CREATE INDEX IF NOT EXISTS idx_mmf_canonical_product
  ON marketplace_memory_facts (canonical_product_id);

-- A leitura que justifica esta Mission inteira: "todos os produtos com
-- este fact_type=X e fact_value=Y" — exatamente a chave de agrupamento
-- (brand_id, manufacturerCode) que a simulação de Mission Π-1 usou para
-- medir o teto de 28x em Comparable Coverage.
CREATE INDEX IF NOT EXISTS idx_mmf_type_value
  ON marketplace_memory_facts (fact_type, fact_value);

CREATE INDEX IF NOT EXISTS idx_mmf_merchant
  ON marketplace_memory_facts (merchant_id)
  WHERE merchant_id IS NOT NULL;

ALTER TABLE marketplace_memory_facts ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (scripts/API routes
-- autenticadas) — mesmo padrão de merge_candidates/merge_executions.

CREATE TABLE IF NOT EXISTS merchant_attribute_patterns (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,

  -- A chave bruta exatamente como o merchant a escreve (ex.: "MODELO",
  -- "Modelo", "Capacidad de almacenamiento") — nunca normalizada aqui,
  -- essa é a informação que este registro existe para guardar.
  raw_key           text        NOT NULL,

  concept           text        NOT NULL
    CHECK (concept IN (
      'manufacturer_code', 'model', 'category', 'brand', 'family', 'line',
      'capacity_gb', 'ram_gb', 'screen_size_in', 'color', 'voltage',
      'power_w', 'ean', 'bundle_includes', 'processor', 'gpu'
    )),

  confidence        text        NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),

  -- Quantas vezes esta chave->conceito foi observada para este merchant —
  -- a base de dado para a promoção por recorrência de
  -- docs/architecture/PATTERN_LEARNING.md (a lógica de promoção em si,
  -- não construída aqui — Learning Engine).
  occurrences       integer     NOT NULL DEFAULT 1 CHECK (occurrences > 0),

  algorithm_version text        NOT NULL,

  validation_status text        NOT NULL DEFAULT 'unvalidated'
    CHECK (validation_status IN ('unvalidated', 'confirmed', 'invalidated')),

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Uma linha por (loja, chave bruta) — a mesma chave nunca significa 2
  -- conceitos diferentes para o mesmo merchant (achado real, Mission Ξ-2:
  -- Mobile Zone usa "Capacidad" ambíguo entre armazenamento e bateria —
  -- esse caso analisa por categoria do produto numa Mission futura, não
  -- reproduzido aqui como uma segunda dimensão de chave).
  UNIQUE (store_id, raw_key)
);

CREATE INDEX IF NOT EXISTS idx_map_store
  ON merchant_attribute_patterns (store_id);

ALTER TABLE merchant_attribute_patterns ENABLE ROW LEVEL SECURITY;
