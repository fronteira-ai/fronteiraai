-- PROPOSTA DE MIGRATION — NÃO APLICADA
--
-- Gerada na Sprint 3.5 (Catálogo Premium de Produtos), durante a
-- implementação de /products. Ver docs/DECISIONS.md, ADR-011, para o
-- contexto completo.
--
-- Contexto: services/product.service.ts (getProductsCatalog) ordena
-- produtos por menor/maior preço usando o preço mínimo entre as ofertas de
-- cada produto. Essa é uma agregação (MIN por product_id) que o PostgREST
-- não resolve nativamente em uma query de listagem paginada sem uma view ou
-- função — hoje a ordenação por preço é "best effort": corrige a ordem
-- dentro da página já buscada (correta para o que é exibido), mas não
-- garante ordem global entre páginas diferentes em catálogos grandes.
--
-- Esta proposta resolve isso com uma view materializada de leitura, sem
-- alterar nenhuma tabela existente:

CREATE MATERIALIZED VIEW IF NOT EXISTS product_price_summary AS
SELECT
  p.id AS product_id,
  MIN(o.price_usd) AS lowest_price_usd,
  MAX(o.price_usd) AS highest_price_usd,
  COUNT(o.id) AS offer_count,
  BOOL_OR(o.in_stock) AS has_stock_offer
FROM products p
LEFT JOIN offers o ON o.product_id = p.id
GROUP BY p.id;

CREATE UNIQUE INDEX IF NOT EXISTS product_price_summary_product_id_idx
  ON product_price_summary (product_id);

CREATE INDEX IF NOT EXISTS product_price_summary_lowest_price_idx
  ON product_price_summary (lowest_price_usd);

-- Uma materialized view precisa de REFRESH periódico (não reflete writes em
-- tempo real) — viável aqui porque preço de oferta não muda a cada segundo;
-- um cron/trigger de REFRESH CONCURRENTLY (requer o índice único acima) é
-- responsabilidade de quem aplicar esta migration, fora do escopo deste
-- arquivo. Alternativa sem refresh (sempre atualizada, mais cara por
-- leitura): trocar MATERIALIZED VIEW por VIEW simples — avaliar conforme
-- volume real de produtos/ofertas antes de aplicar.
--
-- Com esta view aplicada, getProductsCatalog poderia fazer
-- supabase.from("product_price_summary").select(...) ordenado nativamente
-- por lowest_price_usd, com paginação correta entre páginas — substituindo
-- o reordenamento client-side hoje documentado como limitação conhecida.
