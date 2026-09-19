-- ============================================================
-- public_catalog_visibility — elegibilidade pública de catálogo
-- P2 Public Catalog Visibility (continuation).
-- ============================================================
--
-- CONTRATO DE VISIBILIDADE PÚBLICA
--
--   PUBLIC STORE   = stores.active = true
--   PUBLIC OFFER   = offers.available = true AND stores.active = true
--   PUBLIC PRODUCT = existe pelo menos uma PUBLIC OFFER
--
-- `is_verified` NÃO faz parte deste contrato.
--
-- O QUE ESTA MIGRATION MUDA
--
-- As duas RPCs públicas vivas (search_products_catalog e
-- search_products_global) filtravam apenas `offers.available = true` na
-- elegibilidade das ofertas. Uma oferta de loja inativa (`stores.active <>
-- true`) ainda formava preço, estoque e ranking — e um produto cuja única
-- oferta vinha de loja inativa continuava público.
--
-- Esta migration é forward-only e NÃO altera as migrations históricas:
-- recria as funções com a MESMA assinatura, MESMO RETURNS, MESMA ordenação,
-- MESMOS filtros, MESMO SECURITY INVOKER, SEM `SET search_path` e com os
-- MESMOS GRANTs. A única mudança de elegibilidade é:
--
--   offers.available = true
--   AND stores.active = true
--
-- Como PUBLIC PRODUCT exige pelo menos uma PUBLIC OFFER, o produto sem
-- nenhuma oferta elegível deixa de entrar no resultado público (o antigo
-- LEFT JOIN permitia listar produto sem oferta ativa quando nenhum filtro de
-- oferta estava ativo). O ranking e os filtros existentes são preservados:
-- a mudança é apenas QUAIS ofertas/produtos são elegíveis, nunca COMO são
-- ordenados.
--
-- ── P2 continuation: sort PADRÃO de /products ────────────────────────────
--
-- `search_products_catalog` passou a ser o ÚNICO caminho canônico de
-- elegibilidade + contagem + paginação de /products (migrations
-- 20260809120000 e 20260916120000): antes, `price_asc`/`price_desc` saíam
-- por esta RPC, mas o sort padrão (`newest`/`relevance`/`best_selling`/
-- `top_rated`) contava e paginava pelo PostgREST (`count: "exact"` +
-- `.range()` sobre `products`). A elegibilidade de loja ativa é um filtro de
-- DOIS níveis (`offers.stores.active`) e aquele caminho podia contar como
-- PUBLIC PRODUCT um produto cuja única oferta disponível vinha de loja
-- inativa — `total_count` inflado e limites de página deslocados.
--
-- Por isso o ORDER BY ganhou uma chave explícita para o sort padrão:
--   * `p_sort IN ('price_asc','price_desc')` -> ordenação IDÊNTICA à anterior
--     (has_stock -> preço -> id); as chaves de `created_at` ficam NULL
--     constante e não afetam a ordem.
--   * qualquer outro valor (inclui `newest`, `relevance`, `best_selling`,
--     `top_rated` e NULL) -> `created_at DESC NULLS LAST`, com `id` como
--     desempate determinístico — a mesma ordenação que /products já produzia
--     no caminho padrão, agora com paginação estável.
--
-- A assinatura, o RETURNS TABLE (com `total_count` calculado por
-- `count(*) OVER ()` ANTES de LIMIT/OFFSET), os filtros, `SECURITY INVOKER`,
-- a ausência de `SET search_path`, os GRANTs e o COMMENT permanecem
-- inalterados.
-- ============================================================

-- ── search_products_catalog (/products, todos os sorts) ────────────────────

CREATE OR REPLACE FUNCTION public.search_products_catalog(
  p_category_id   uuid    DEFAULT NULL,
  p_brand_id      uuid    DEFAULT NULL,
  p_store_id      uuid    DEFAULT NULL,
  p_search        text    DEFAULT NULL,
  p_only_in_stock boolean DEFAULT false,
  p_min_price     numeric DEFAULT NULL,
  p_max_price     numeric DEFAULT NULL,
  p_sort          text    DEFAULT 'price_asc',
  p_limit         integer DEFAULT 12,
  p_offset        integer DEFAULT 0
)
RETURNS TABLE (
  product_id       uuid,
  lowest_price_usd numeric,
  has_stock        boolean,
  total_count      bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH filtered_offers AS (
    -- Todos os filtros de nível de oferta, aplicados ANTES da agregação.
    -- Elegibilidade pública: oferta ativa (available=true) de loja ativa
    -- (stores.active=true). Nenhum outro comportamento é alterado.
    SELECT o.product_id, o.price_usd, o.in_stock
    FROM offers o
    JOIN stores s ON s.id = o.store_id AND s.active = true
    WHERE o.available = true
      AND (p_store_id  IS NULL     OR o.store_id  = p_store_id)
      AND (p_only_in_stock IS NOT TRUE OR o.in_stock = true)
      AND (p_min_price IS NULL     OR o.price_usd >= p_min_price)
      AND (p_max_price IS NULL     OR o.price_usd <= p_max_price)
  ),
  product_price AS (
    SELECT fo.product_id, min(fo.price_usd) AS lowest, bool_or(fo.in_stock) AS has_stock
    FROM filtered_offers fo
    GROUP BY fo.product_id
  ),
  candidates AS (
    -- PUBLIC PRODUCT: só entra quem tem pelo menos uma PUBLIC OFFER.
    -- O INNER JOIN substitui o antigo LEFT JOIN que listava produto sem
    -- oferta ativa quando nenhum filtro de oferta estava ativo.
    -- `created_at` entra no conjunto porque o sort padrão de /products
    -- (`newest` e os modos sem coluna de apoio) ordena por ele aqui.
    SELECT p.id, p.created_at, pp.lowest, COALESCE(pp.has_stock, false) AS has_stock
    FROM products p
    JOIN product_price pp ON pp.product_id = p.id
    WHERE (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_brand_id    IS NULL OR p.brand_id    = p_brand_id)
      AND (p_search      IS NULL OR p.name ILIKE '%' || p_search || '%')
  )
  SELECT
    c.id,
    c.lowest,
    c.has_stock,
    count(*) OVER () AS total_count
  FROM candidates c
  ORDER BY
    -- P2 Public Catalog Visibility: `price_asc`/`price_desc` mantêm
    -- EXATAMENTE a ordenação anterior (has_stock -> preço -> id); qualquer
    -- outro valor — o sort PADRÃO de /products (`newest`, e hoje também
    -- `relevance`/`best_selling`/`top_rated`, que caem em `created_at`) —
    -- ordena por `created_at DESC` com `id` como desempate determinístico,
    -- que é o que torna a paginação estável. As chaves não usadas são NULL
    -- constante e não afetam a ordem.
    CASE WHEN p_sort IN ('price_asc','price_desc') THEN NULL ELSE c.created_at END DESC NULLS LAST,
    CASE WHEN p_sort IN ('price_asc','price_desc') THEN c.has_stock END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN c.lowest END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc'  THEN c.lowest END ASC  NULLS LAST,
    c.id
  LIMIT  p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.search_products_catalog IS
  'Catálogo /products com ordenação global por preço (Sprint 7B, P2-1). '
  'P2 Public Catalog Visibility: só ofertas available=true de stores.active=true '
  'são elegíveis; produto só entra com >=1 oferta pública. Filtra -> agrega -> '
  'ordena -> pagina. Ver ADR-011 e migration 20260916120000.';

GRANT EXECUTE ON FUNCTION public.search_products_catalog(
  uuid, uuid, uuid, text, boolean, numeric, numeric, text, integer, integer
) TO anon, authenticated, service_role;

-- ── search_products_global (/search, seção produtos) ───────────────────────

CREATE OR REPLACE FUNCTION public.search_products_global(
  p_term  text    DEFAULT NULL,
  p_limit integer DEFAULT 8,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  product_id       uuid,
  lowest_price_usd numeric,
  has_stock        boolean,
  total_count      bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH matches AS (
    SELECT p.id
    FROM products p
    WHERE p_term IS NULL OR
      p.name ILIKE '%' || p_term || '%'
      OR replace(lower(p.name), ' ', '') ILIKE '%' || replace(lower(p_term), ' ', '') || '%'
  ),
  agg AS (
    -- Elegibilidade pública: available=true e stores.active=true.
    SELECT
      o.product_id,
      min(o.price_usd)      AS lowest,
      bool_or(o.in_stock)   AS has_stock
    FROM offers o
    JOIN matches m ON m.id = o.product_id
    JOIN stores s ON s.id = o.store_id AND s.active = true
    WHERE o.available = true
    GROUP BY o.product_id
  )
  SELECT
    m.id,
    a.lowest,
    a.has_stock,
    count(*) OVER () AS total_count
  FROM matches m
  JOIN agg a ON a.product_id = m.id
  ORDER BY
    a.has_stock DESC,
    a.lowest ASC NULLS LAST,
    m.id
  LIMIT  p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.search_products_global IS
  'Busca /search (seção produtos) com ordenação GLOBAL determinística. '
  'P2 Public Catalog Visibility: só ofertas available=true de stores.active=true '
  'são elegíveis; produto só entra com >=1 oferta pública. PR-001/PR-002 + '
  'migration 20260916120000.';

GRANT EXECUTE ON FUNCTION public.search_products_global(text, integer, integer)
  TO anon, authenticated, service_role;
