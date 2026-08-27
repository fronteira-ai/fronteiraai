-- ============================================================
-- search_products_catalog — ordenação GLOBAL por preço no catálogo
-- Sprint 7B (P2-1). Fecha o ADR-011.
-- ============================================================
--
-- PROBLEMA
--
-- `/products?sort=price_asc` ordenava apenas dentro da página. `getProductsCatalog`
-- pagina com `.range()` ordenando por `created_at` e só então reordena por preço
-- os 12 itens já buscados. Medido na Sprint 7: na ordem ASC a página 1 terminava
-- em $1.767,59 e a página 2 começava em $53,16 — o menor preço do catálogo
-- aparecia na segunda página.
--
-- POR QUE PRECISA SER UMA FUNÇÃO
--
-- "Preço do produto" é uma agregação — MIN sobre as ofertas ativas — e o
-- PostgREST não ordena por agregação de relação to-many. Verificado contra o
-- PostgREST v14.5 local, três sintaxes, três recusas explícitas:
--   order=offers(price_usd).asc      -> PGRST118 "A related order on 'offers'
--                                       is not possible"
--   order=offers.price_usd.asc       -> PGRST100 falha de parse
--   select=offers!inner(price_usd.min()) -> PGRST123 "Use of aggregate
--                                       functions is not allowed"
-- O ADR-011 já previa isto em 2026-06-23 e continua verdadeiro.
--
-- POR QUE NÃO A MATERIALIZED VIEW
--
-- `product_price_summary` (database/migrations/0003) existe, mas: está com 0
-- linhas, nunca é atualizada (nenhum `REFRESH MATERIALIZED VIEW` no
-- repositório), não é consumida por nada, e agrega ofertas SEM filtrar
-- `available` — usá-la reintroduziria o P2-2 fechado na Sprint 5, nos mesmos
-- 3 produtos. Além disso ela guarda um preço global por produto, incapaz de
-- responder à ordenação dentro de um conjunto filtrado por loja/faixa de preço.
--
-- SEMÂNTICA REPRODUZIDA (medida no comportamento atual, não inventada)
--
-- Os filtros de oferta do PostgREST restringem o ARRAY EMBUTIDO, então eles
-- decidem duas coisas ao mesmo tempo: quais produtos entram e quais ofertas
-- formam o preço exibido. Comprovado no app antes de escrever este SQL, com o
-- iPhone 16 Pro (ofertas ativas de $925,72 a $1.151,83):
--   sem filtro     -> $925,72
--   minPrice=1000  -> $1.013,41   (MIN entre as ofertas >= 1000, não $925,72)
--   maxPrice=1000  -> $925,72
-- Portanto: aplicar os filtros ao conjunto de ofertas, e só então MIN sobre o
-- conjunto já filtrado. É exatamente o que `filtered_offers` faz abaixo.
--
-- `available` vs `in_stock` (ADR-008) — conceitos distintos, preservados:
--   available=false                -> arquivada, NUNCA participa do preço
--   available=true + in_stock=false -> ativa e esgotada, PARTICIPA do preço
--
-- ESCOPO: só cria a função. Nenhuma tabela, coluna, view, trigger ou índice
-- novo; nenhuma migration existente alterada.
-- ============================================================

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
-- SECURITY INVOKER (padrão do PostgreSQL, explicitado): a função roda com os
-- privilégios de quem chama, então as policies de `products`/`offers`
-- (0007_proposed_public_read_policies) continuam valendo. Nada aqui usa
-- service_role nem contorna RLS.
--
-- NOTA (2026-08-26, validação ao vivo no self-hosted): NÃO usar `SET
-- search_path` aqui. `SET search_path = public` em uma SQL function impede a
-- inlining do PostgreSQL, e sem inlining a ordenação global de `/products
-- ?sort=price_asc|desc` (sem filtro) executa em ~25s+ (timeout) — o equivalente
-- inline roda em ~437ms. O schema do corpo é `public` (nome totalmente
-- qualificado na assinatura) e o path padrão do Supabase já resolve as tabelas
-- usadas; manter SECURITY INVOKER preserva a RLS. O `search_products_global`
-- segue o mesmo princípio.
SECURITY INVOKER
AS $$
  WITH filtered_offers AS (
    -- Todos os filtros de nível de oferta, aplicados ANTES da agregação.
    SELECT o.product_id, o.price_usd, o.in_stock
    FROM offers o
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
    SELECT p.id, pp.lowest, COALESCE(pp.has_stock, false) AS has_stock
    FROM products p
    LEFT JOIN product_price pp ON pp.product_id = p.id
    WHERE (p_category_id IS NULL OR p.category_id = p_category_id)
      AND (p_brand_id    IS NULL OR p.brand_id    = p_brand_id)
      AND (p_search      IS NULL OR p.name ILIKE '%' || p_search || '%')
      -- Espelha a troca offers!left <-> offers!inner do serviço: sem nenhum
      -- filtro de oferta ativo, produtos sem oferta ativa continuam listados
      -- (preço null); com algum filtro ativo, só entram os que têm oferta
      -- correspondente.
      AND (
        NOT (
          p_store_id IS NOT NULL
          OR p_only_in_stock IS TRUE
          OR p_min_price IS NOT NULL
          OR p_max_price IS NOT NULL
        )
        OR pp.product_id IS NOT NULL
      )
  )
  SELECT
    c.id,
    c.lowest,
    c.has_stock,
    -- Janela avaliada antes de LIMIT/OFFSET: total do conjunto filtrado
    -- inteiro, equivalente ao `count: "exact"` do PostgREST.
    count(*) OVER () AS total_count
  FROM candidates c
  ORDER BY
    -- PR-002: produtos disponíveis SEMPRE antes de esgotados, em ambas as
    -- direções de preço (available → out-of-stock; cada grupo ordenado por
    -- preço). has_stock é agregado sobre as ofertas available=true filtradas.
    c.has_stock DESC,
    -- NULLS LAST nas duas direções, igual ao comparador que o serviço já
    -- usava: produto sem preço nunca sobe ao topo, nem em asc nem em desc.
    CASE WHEN p_sort = 'price_desc' THEN c.lowest END DESC NULLS LAST,
    CASE WHEN p_sort = 'price_asc'  THEN c.lowest END ASC  NULLS LAST,
    -- Desempate determinístico: sem ele, preços iguais poderiam trocar de
    -- página entre requisições e um produto apareceria duas vezes (ou nunca).
    c.id
  LIMIT  p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.search_products_catalog IS
  'Catálogo /products com ordenação global por preço (Sprint 7B, P2-1). '
  'Filtra -> agrega MIN(price_usd) das ofertas available=true -> ordena -> '
  'pagina, nessa ordem. Retorna ids ordenados + preço + total; o serviço '
  'busca as linhas completas dessa página. Ver ADR-011.';

-- O catálogo é lido pelo cliente anônimo (SSR sem sessão) e por sessões
-- autenticadas. Sem estes GRANTs a função existe mas não é alcançável pela
-- Data API. RLS continua sendo a barreira real (SECURITY INVOKER).
GRANT EXECUTE ON FUNCTION public.search_products_catalog(
  uuid, uuid, uuid, text, boolean, numeric, numeric, text, integer, integer
) TO anon, authenticated, service_role;
