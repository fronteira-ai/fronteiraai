-- ============================================================
-- search_products_catalog_filter_pushdown
-- Mission 05.7 — Search Engine Performance Recovery (Fase A: filter pushdown)
-- ============================================================
--
-- CONTEXTO (causa raiz medida, Mission 05.6/05.7)
--
-- A versão anterior agregava `offers` (43.436 ofertas elegíveis) em `product_price`
-- ANTES de aplicar qualquer filtro de produto:
--
--   filtered_offers  ->  product_price (GROUP BY product_id)  ->  JOIN products (filtros)
--
-- Como `p_category_id`/`p_brand_id`/`p_search` só entravam no JOIN final, o
-- HashAggregate agregava o catálogo INTEIRO em toda chamada, mesmo com filtro
-- seletivo. Medido em produção (EXPLAIN ANALYZE, read-only):
--   sem filtro ......... ~502 ms / 5.463 buffers
--   p_search='perfume' . ~651 ms / 5.457 buffers (o mesmo HashAggregate)
--   categoria 'Perfume masculino' ~196 ms
--
-- MUDANÇA (uma única estratégia: A — Filter Pushdown)
--
-- A agregação passa a receber apenas as ofertas dos produtos que já passaram
-- pelos filtros de produto, e `products` é unido UMA vez dentro do CTE (em vez
-- de duas vezes: uma para agregar e outra para filtrar/ordenar). Nada mais muda.
--
--   filtered (JOIN products com os filtros de produto + JOIN stores ativo)
--     -> agg (GROUP BY product_id, created_at: min(preço), bool_or(estoque))
--
-- POR QUE `GROUP BY product_id, created_at`: `created_at` é funcionalmente
-- dependente de `products.id`, então agrupar pelas duas colunas mantém
-- exatamente UMA linha por produto (mesma cardinalidade de antes) e permite
-- carregar `created_at` para a ordenação sem uma segunda passagem por products.
--
-- SEMÂNTICA PRESERVADA (verificado por equivalência de conjunto em produção,
-- `EXCEPT ALL` nas duas direções = 0 linhas em 10 cenários — ver relatório):
--   * PUBLIC STORE = stores.active = true; PUBLIC OFFER = offers.available = true
--     AND stores.active = true; PUBLIC PRODUCT = >= 1 PUBLIC OFFER (inalterado);
--   * filtros de OFERTA (loja, estoque, preço) continuam aplicados ANTES da
--     agregação — não há empurramento que altere o conjunto agregado;
--   * filtros de PRODUTO (categoria, marca, busca ILIKE) restringem QUAIS
--     produtos são considerados, e não afetam o preço/estoque de nenhum outro
--     produto (a agregação é por produto) — por isso o pushdown é seguro;
--   * `lowest_price_usd = min(price_usd)`, `has_stock = bool_or(in_stock)`,
--     `COALESCE(pp.has_stock,false)` (inalterado);
--   * `total_count = count(*) OVER ()` — contagem EXATA mantida, sem aproximação;
--   * ORDENAÇÃO idêntica (price_asc/price_desc e o fallback created_at DESC, id);
--   * LIMIT/OFFSET idênticos; assinatura, tipos, defaults, LANGUAGE sql, STABLE,
--     SECURITY INVOKER, ausência de `SET search_path` e GRANTs preservados.
--
-- ROLLBACK: reaplicar o corpo anterior, que está preservado integralmente em
-- `supabase/migrations/20260916120000_public_catalog_visibility.sql`
-- (mesma estratégia forward-only já usada no projeto: a migration antiga não é
-- alterada). Basta reexecutar aquele arquivo, ou rodar o `CREATE OR REPLACE`
-- que ele contém.
--
-- NÃO APLICADA EM PRODUÇÃO (Mission 05.7 é read-only em produção; aplicação
-- requer aprovação explícita).
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_products_catalog(
  p_category_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_only_in_stock boolean DEFAULT false,
  p_min_price numeric DEFAULT NULL,
  p_max_price numeric DEFAULT NULL,
  p_sort text DEFAULT 'price_asc',
  p_limit integer DEFAULT 12,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(product_id uuid, lowest_price_usd numeric, has_stock boolean, total_count bigint)
LANGUAGE sql
STABLE
AS $function$
  WITH filtered AS (
    -- Mission 05.7 (Fase A): os filtros de PRODUTO entram aqui, junto com os
    -- filtros de OFERTA, para que a agregação abaixo só veja as ofertas dos
    -- produtos candidatos. `stores.active` continua definindo elegibilidade.
    SELECT
      p.id        AS product_id,
      p.created_at AS created_at,
      o.price_usd,
      o.in_stock
    FROM offers o
    JOIN stores s ON s.id = o.store_id AND s.active = true
    JOIN products p ON p.id = o.product_id
    WHERE o.available = true
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_brand_id    IS NULL OR p.brand_id    = p_brand_id)
      AND (p_search      IS NULL OR p.name ILIKE '%' || p_search || '%')
      AND (p_store_id  IS NULL     OR o.store_id  = p_store_id)
      AND (p_only_in_stock IS NOT TRUE OR o.in_stock = true)
      AND (p_min_price IS NULL     OR o.price_usd >= p_min_price)
      AND (p_max_price IS NULL     OR o.price_usd <= p_max_price)
  ),
  agg AS (
    SELECT
      f.product_id,
      f.created_at,
      min(f.price_usd) AS lowest,
      bool_or(f.in_stock) AS has_stock
    FROM filtered f
    GROUP BY f.product_id, f.created_at
  )
  SELECT
    a.product_id,
    a.lowest,
    COALESCE(a.has_stock, false) AS has_stock,
    count(*) OVER () AS total_count
  FROM agg a
  ORDER BY
    -- P2 Public Catalog Visibility: `price_asc`/`price_desc` mantêm
    -- EXATAMENTE a ordenação anterior (has_stock -> preço -> id); qualquer
    -- outro valor — o sort PADRÃO de /products (`newest`, e hoje também
    -- `relevance`/`best_selling`/`top_rated`, que caem em `created_at`) —
    -- ordena por `created_at DESC` com `id` como desempate determinístico,
    -- que é o que torna a paginação estável.
    CASE WHEN p_sort IN ('price_asc','price_desc') THEN NULL ELSE a.created_at END DESC NULLS LAST,
    CASE WHEN p_sort IN ('price_asc','price_desc') THEN a.has_stock END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_desc' THEN a.lowest END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc'  THEN a.lowest END ASC  NULLS LAST,
    a.product_id
  LIMIT p_limit
  OFFSET p_offset;
$function$;

COMMENT ON FUNCTION public.search_products_catalog(uuid, uuid, uuid, text, boolean, numeric, numeric, text, integer, integer) IS
  'Busca de catálogo pública (P2 visibility: offers.available AND stores.active). Mission 05.7: filtros de produto (categoria/marca/busca) aplicados ANTES da agregação de ofertas (filter pushdown), preservando preço/estoque, ordenação e total_count exato.';

GRANT EXECUTE ON FUNCTION public.search_products_catalog(uuid, uuid, uuid, text, boolean, numeric, numeric, text, integer, integer) TO anon, authenticated, service_role;
