-- ============================================================
-- Universal Product Taxonomy (Program Κ — Mission Κ-2)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: total e seguro — todas as 5 tabelas abaixo são novas e
--   aditivas. Nenhuma delas é referenciada por nenhuma tabela existente
--   (categories, products, canonical_products, brands, merge_candidates
--   continuam exatamente como estavam). `DROP TABLE` de qualquer uma das
--   5, em qualquer ordem respeitando FKs internas, não quebra nada fora
--   desta migration.
-- ============================================================
--
-- Contexto (Mission Κ-1, docs/product/TAXONOMY_ARCHITECTURE_RECOMMENDATION.md
-- §5): a arquitetura recomendada ("Opção C — Universal Taxonomy") em 2
-- fases — Fase 1 (sinônimo, os 66 clusters já validados) e Fase 2
-- (hierarquia pai/filho, os pares "categoria × variante/acessório"). Esta
-- migration cria o schema para ambas as fases, mais 3 camadas semânticas
-- adicionais que o mandato desta Mission pediu (marca, modelo, atributo).
--
-- IMPORTANTE: esta migration NÃO altera `categories`, `products`,
-- `canonical_products`, `brands` ou `merge_candidates`. Nenhuma linha
-- existente é lida por trigger, nenhuma coluna é adicionada a tabela
-- existente. `ProductIdentityEngine`/`CanonicalMergeSuggestionService`
-- continuam sem saber que estas tabelas existem — o mandato desta Mission
-- é construir a camada semântica, não fiar-la ao Product Identity (essa
-- decisão fica para uma Mission futura).
--
-- Cria:
-- 1. universal_categories — a árvore oficial (Objetivo 2), auto-referenciada
--    via parent_id, sem limite de profundidade.
-- 2. category_universal_map — Fase 1/2 da Opção C: aponta cada `categories`
--    real para o nó folha da árvore oficial que representa.
-- 3. canonical_brands / brand_universal_map — mesmo padrão de par
--    tabela-canônica + tabela-de-mapeamento, para marca (Objetivo 4).
-- 4. model_aliases — dicionário de variantes de modelo → forma canônica
--    (Objetivo 5).
-- 5. attribute_dictionary — vocabulário oficial de atributos (Objetivo 6).
-- ============================================================

CREATE TABLE IF NOT EXISTS universal_categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        UNIQUE NOT NULL,
  parent_id   uuid        REFERENCES universal_categories(id) ON DELETE SET NULL,
  level       int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_universal_categories_parent ON universal_categories (parent_id);

ALTER TABLE universal_categories ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (API routes autenticadas).

CREATE TABLE IF NOT EXISTS category_universal_map (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id             uuid        UNIQUE NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  universal_category_id   uuid        NOT NULL REFERENCES universal_categories(id) ON DELETE CASCADE,
  confidence              text        NOT NULL DEFAULT 'alta'
    CHECK (confidence IN ('alta', 'media', 'manual')),
  source                  text        NOT NULL,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_category_universal_map_universal ON category_universal_map (universal_category_id);

ALTER TABLE category_universal_map ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS canonical_brands (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text        UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE canonical_brands ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS brand_universal_map (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id              uuid        UNIQUE NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  canonical_brand_id     uuid        NOT NULL REFERENCES canonical_brands(id) ON DELETE CASCADE,
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_universal_map_canonical ON brand_universal_map (canonical_brand_id);

ALTER TABLE brand_universal_map ENABLE ROW LEVEL SECURITY;

-- Objetivo 5. Um brand_slug vazio ("") significa "aplica-se independente da
-- marca" (poucos tokens de modelo são universais, mas o schema não proíbe).
CREATE TABLE IF NOT EXISTS model_aliases (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug        text        NOT NULL,
  raw_token         text        NOT NULL,
  canonical_model   text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_slug, raw_token)
);

ALTER TABLE model_aliases ENABLE ROW LEVEL SECURITY;

-- Objetivo 6. Vocabulário oficial de atributos — nunca o texto livre da loja.
CREATE TABLE IF NOT EXISTS attribute_dictionary (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text        UNIQUE NOT NULL,
  label_pt      text        NOT NULL,
  label_es      text        NOT NULL,
  category      text        NOT NULL CHECK (category IN ('physical', 'technical', 'identifier')),
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attribute_dictionary ENABLE ROW LEVEL SECURITY;
