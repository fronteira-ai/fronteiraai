-- ============================================================
-- search_products_global — ordenação GLOBAL da busca (/search, seção produtos)
-- Sprint "Search Ordering + Out-of-Stock + SEO Recovery" (PR-001/PR-002).
-- Fecha o problema "esgotados primeiro" e a ordenação não-global da busca:
--   services/search.service.ts ordenava em JavaScript sobre <=8 linhas
--   devolvidas SEM ORDER BY pelo PostgREST → subconjunto arbitrário.
-- ============================================================
--
-- MESMA SEMÂNTICA JÁ PROVADA em search_products_catalog
-- (20260809120000) e validada contra o PostgreSQL local: PostgREST se recusa
-- a ordenar por agregação de relação to-many (PGRST118/PGRST123); "preço do
-- produto" é MIN(offers.price_usd) e "tem estoque" é bool_or(offers.in_stock)
-- — ambos agregações, portanto a ordenação GLOBAL só é possível numa função.
--
-- REGRA CANÔNICA DE ORDENAÇÃO (determinística):
--   Grupo 1 — DISPONÍVEIS  (tem >=1 oferta ativa com in_stock=true)
--       ordenados: price ASC NULLS LAST
--   Grupo 2 — ESGOTADOS    (sem oferta disponível)
--       ordenados: price ASC NULLS LAST
--   Desempate final: id (determinístico, evita duplicatas/instabilidade)
--
-- Comportamentos explícitos (ETAPA 3):
--   - price null (produto sem oferta ativa com preço): vai ao fim do seu
--     grupo, nunca sobe (NULLS LAST). Nenhum preço é inventado.
--   - price = 0: é um preço numérico válido e ordena como o menor (0 antes
--     de positivo). A UI decide se 0 deve ser exibido; aqui não é filtrado.
--   - availability: `available=true` é a definição de oferta ativa (ADR-008).
--     `available=false` NUNCA participa. `in_stock=false` com `available=true`
--     é oferta ativa e esgotada — participa do preço e classifica o produto
--     como esgotado quando é a única oferta.
--   - múltiplas ofertas: MIN(price) + bool_or(in_stock); duplicatas não
--     influenciam além de participar das agregações.
--   - produto sem oferta válida (ou todas available=false): has_stock=false
--     e price=null → Grupo 2, por último no grupo (NULLS LAST).
--
-- EFICIÊNCIA: o filtro de nome (matches) vêm ANTES da agregação de ofertas,
-- que roda apenas sobre os ids que casaram a busca — não sobre o catálogo
-- inteiro. Agregação usa offers.product_id (joins existentes).
--
-- ESCOPO: só cria a função. Nenhuma tabela/coluna/index novo; não altera
-- nenhuma migration existente. Idempotente (CREATE OR REPLACE). Reutiliza
-- apenas products e offers (presentes no schema self-hosted).
-- ============================================================

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
-- SECURITY INVOKER (padrão do PostgreSQL, explicitado): roda com os
-- privilégios de quem chama; as policies de products/offers (RLS pública,
-- anon+authenticated USING true) continuam valendo. Sem service_role.
-- NOTA (2026-08-26, validação ao vivo no self-hosted): SEM `SET search_path` —
-- o mesmo motivo de search_products_catalog: SET bloqueia inlining da SQL
-- function e, sem inlining, a ordenação global degrada (timeout). O path
-- padrão do Supabase resolve `products`/`offers` em `public`.
SECURITY INVOKER
AS $$
  WITH matches AS (
    SELECT p.id
    FROM products p
    WHERE p_term IS NULL OR
      -- Recall sistêmico (Sprint Store Expansion + Search Recall): além do
      -- match com espaços, aceita variantes continuadas ("iphone17pro" casa
      -- com "iPhone 17 Pro") colapsando espaços dos DOIS lados. Corrige a
      -- causa raiz de recall (não um workaround p/ "iPhone 17 Pro"):
      -- aplica-se a qualquer query/termo.
      p.name ILIKE '%' || p_term || '%'
      OR replace(lower(p.name), ' ', '') ILIKE '%' || replace(lower(p_term), ' ', '') || '%'
  ),
  agg AS (
    SELECT
      o.product_id,
      min(o.price_usd)      AS lowest,
      bool_or(o.in_stock)   AS has_stock
    FROM offers o
    JOIN matches m ON m.id = o.product_id
    WHERE o.available = true
    GROUP BY o.product_id
  )
  SELECT
    m.id,
    a.lowest,
    COALESCE(a.has_stock, false) AS has_stock,
    count(*) OVER () AS total_count
  FROM matches m
  LEFT JOIN agg a ON a.product_id = m.id
  ORDER BY
    -- Grupo 1 disponíveis primeiro (has_stock DESC), depois esgotados.
    COALESCE(a.has_stock, false) DESC,
    -- Preço crescente dentro de cada grupo; NULLS LAST (sem preço no fim).
    a.lowest ASC NULLS LAST,
    -- Desempate determinístico para paginação estável.
    m.id
  LIMIT  p_limit
  OFFSET p_offset;
$$;

COMMENT ON FUNCTION public.search_products_global IS
  'Busca /search (seção produtos) com ordenação GLOBAL determinística: '
  'disponíveis (com oferta ativa em estoque) primeiro, preço crescente '
  'NULLS LAST dentro de cada grupo, ID como desempate. Filtra por name ILIKE '
  'ANTES de agregar MIN(price)+bool_or(in_stock) das ofertas available=true, '
  'ordena e pagina no banco. PR-001/PR-002.';

GRANT EXECUTE ON FUNCTION public.search_products_global(text, integer, integer)
  TO anon, authenticated, service_role;
