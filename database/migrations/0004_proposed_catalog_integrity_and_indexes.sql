-- PROPOSTA DE MIGRATION — NÃO APLICADA
--
-- Gerada na Sprint 3.7 (Data Foundation v2), durante a revisão arquitetural
-- da camada de dados para suportar milhares de produtos, centenas de lojas
-- e milhões de ofertas sem reestruturação futura. Ver docs/DECISIONS.md.
--
-- Contexto: o seed oficial (database/seed/) resolve brands/categories/
-- products por `slug` antes de inserir (idempotência em código), mas nenhuma
-- constraint UNIQUE existe hoje nessas tabelas — duas execuções concorrentes,
-- ou um INSERT manual fora do seed, podem criar slugs duplicados sem que o
-- banco recuse. O mesmo já foi proposto para `stores.slug` na Sprint 3.4.1
-- (0002_revised_store_data_layer.sql, fase 1) — esta migration estende a
-- mesma garantia para as outras 3 tabelas de catálogo.
--
-- Além disso, toda consulta de catálogo/oferta filtra ou ordena por uma FK
-- (offers.product_id, offers.store_id, products.brand_id,
-- products.category_id) ou por offers.price_usd — sem índice, cada uma
-- dessas consultas degrada de O(log n) para O(n) conforme o volume cresce
-- (hoje irrelevante com 0 linhas; relevante a partir de milhares).

-- FASE 1 — únicos por slug (seguro a qualquer momento: NULL não conflita
-- com UNIQUE no Postgres, e a auditoria da Sprint 3.7 não encontrou
-- nenhum slug duplicado nas 0 linhas reais hoje existentes):
ALTER TABLE products ADD CONSTRAINT products_slug_unique UNIQUE (slug);
ALTER TABLE brands ADD CONSTRAINT brands_slug_unique UNIQUE (slug);
ALTER TABLE categories ADD CONSTRAINT categories_slug_unique UNIQUE (slug);

-- FASE 2 — índices nas colunas de FK e na coluna usada para ordenação de
-- preço (suporta os filtros/ordenação reais de getProductsCatalog,
-- getOffersByProduct, getOffersByStore — ver services/product.service.ts,
-- services/offer.service.ts):
CREATE INDEX IF NOT EXISTS offers_product_id_idx ON offers (product_id);
CREATE INDEX IF NOT EXISTS offers_store_id_idx ON offers (store_id);
CREATE INDEX IF NOT EXISTS offers_price_usd_idx ON offers (price_usd);
CREATE INDEX IF NOT EXISTS products_brand_id_idx ON products (brand_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);

-- Não incluído nesta proposta: NOT NULL em qualquer coluna (products.slug,
-- offers.product_id/store_id etc.) — exigiria confirmar que 100% das linhas
-- futuras sempre virão preenchidas antes de travar o schema; com 0 linhas
-- reais hoje, aplicar NOT NULL agora seria prematuro e sem dado para validar
-- contra. Reavaliar quando o seed (Sprint 3.7/3.8) ou um Admin real
-- (Release 0.7) começarem a escrever de fato.
