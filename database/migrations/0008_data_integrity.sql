-- ============================================================
-- 0008 — Integridade de Catálogo e Índices de Performance
-- Status: PRONTO PARA EXECUÇÃO (Sprint 4.3, Release 0.7)
-- Supersede: 0002_revised_store_data_layer.sql (fase 1)
--            0004_proposed_catalog_integrity_and_indexes.sql
-- ============================================================
--
-- Objetivo:
-- 1. UNIQUE constraints em slug de todas as tabelas de catálogo —
--    impede duplicatas mesmo em inserts fora do seed engine.
-- 2. Índices nas colunas de FK e de ordenação de preço —
--    garante O(log n) em queries de catálogo, oferta e busca
--    conforme o volume cresce para milhares de produtos.
--
-- Pré-condições verificadas antes de gerar este arquivo:
-- • 0 slugs duplicados em stores, products, brands, categories
-- • 0 slugs nulos em qualquer tabela
-- • 0 ofertas órfãs (product_id e store_id com FK válida)
-- • Auditoria executada em 2026-06-25 com chave de serviço
--
-- Idempotente: seguro para re-executar sem erro.
-- • ADD CONSTRAINT usa DO block com verificação em pg_constraint
-- • CREATE INDEX usa IF NOT EXISTS
--
-- Como executar:
-- 1. Abra Supabase Dashboard → SQL Editor
-- 2. Cole este arquivo inteiro
-- 3. Clique Run
-- 4. Confirme que a query de verificação no final lista todas as
--    constraints e índices esperados
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — UNIQUE constraints em slug
-- ──────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stores_slug_unique'
      AND conrelid = 'stores'::regclass
  ) THEN
    ALTER TABLE stores ADD CONSTRAINT stores_slug_unique UNIQUE (slug);
    RAISE NOTICE 'Criada: stores_slug_unique';
  ELSE
    RAISE NOTICE 'Já existe: stores_slug_unique';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_slug_unique'
      AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
    RAISE NOTICE 'Criada: products_slug_unique';
  ELSE
    RAISE NOTICE 'Já existe: products_slug_unique';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'brands_slug_unique'
      AND conrelid = 'brands'::regclass
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT brands_slug_unique UNIQUE (slug);
    RAISE NOTICE 'Criada: brands_slug_unique';
  ELSE
    RAISE NOTICE 'Já existe: brands_slug_unique';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_slug_unique'
      AND conrelid = 'categories'::regclass
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_slug_unique UNIQUE (slug);
    RAISE NOTICE 'Criada: categories_slug_unique';
  ELSE
    RAISE NOTICE 'Já existe: categories_slug_unique';
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — Índices de performance
-- ──────────────────────────────────────────────────────────
-- Cobre os filtros reais de: getOffersByProduct, getOffersByStore,
-- getProductsCatalog (sort price_usd), getProductsByCategoryId.

CREATE INDEX IF NOT EXISTS offers_product_id_idx  ON offers (product_id);
CREATE INDEX IF NOT EXISTS offers_store_id_idx    ON offers (store_id);
CREATE INDEX IF NOT EXISTS offers_price_usd_idx   ON offers (price_usd);
CREATE INDEX IF NOT EXISTS products_brand_id_idx  ON products (brand_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);

-- Índice composto para price_history (batch .in() + order recorded_at).
-- Nome alinhado ao criado pela 0006 (price_history_offer_recorded_idx)
-- para que IF NOT EXISTS seja no-op quando 0006 já foi aplicada, evitando
-- índice duplicado em (offer_id, recorded_at DESC).
CREATE INDEX IF NOT EXISTS price_history_offer_recorded_idx
  ON price_history (offer_id, recorded_at DESC);

-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ──────────────────────────────────────────────────────────
-- Resultado esperado:
-- • 4 linhas de constraint_type = 'UNIQUE' para as 4 tabelas
-- • 6 linhas de index_name para os índices criados

SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN ('stores','products','brands','categories')
  AND tc.constraint_name LIKE '%slug_unique'
ORDER BY tc.table_name;

SELECT
  indexname,
  tablename
FROM pg_indexes
WHERE indexname IN (
  'offers_product_id_idx',
  'offers_store_id_idx',
  'offers_price_usd_idx',
  'products_brand_id_idx',
  'products_category_id_idx',
  'price_history_offer_recorded_idx'
)
ORDER BY tablename, indexname;
