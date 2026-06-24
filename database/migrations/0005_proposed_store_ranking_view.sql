-- PROPOSTA DE MIGRATION — NÃO APLICADA
--
-- Gerada na Sprint 3.7 (Data Foundation v2). Ver docs/DECISIONS.md, ADR-014
-- (Offer Ranking) e ADR-015 (Views de apoio), para o contexto completo.
--
-- As métricas POR PRODUTO (menor/maior preço, contagem de ofertas, flag de
-- estoque) já são cobertas por database/migrations/0003_proposed_product_
-- catalog_price_view.sql (product_price_summary) — não duplicadas aqui.
--
-- Esta view cobre o que ainda falta: métricas POR LOJA, insumo direto do
-- algoritmo de Offer Ranking (ADR-014) e de uma futura página de listagem
-- de lojas (/stores, ainda sem rota — ver docs/TECH_DEBT.md).

CREATE MATERIALIZED VIEW IF NOT EXISTS store_ranking_summary AS
SELECT
  s.id AS store_id,
  s.rating,
  COUNT(o.id) AS offer_count,
  COUNT(o.id) FILTER (WHERE o.in_stock) AS in_stock_offer_count,
  MAX(o.updated_at) AS last_offer_updated_at
FROM stores s
LEFT JOIN offers o ON o.store_id = s.id
GROUP BY s.id, s.rating;

CREATE UNIQUE INDEX IF NOT EXISTS store_ranking_summary_store_id_idx
  ON store_ranking_summary (store_id);

-- Mesma ressalva do ADR-011/0003: materialized view precisa de REFRESH
-- periódico — aceitável aqui porque rating e contagem de ofertas não mudam
-- a cada segundo. Quem aplicar esta migration é responsável por agendar o
-- REFRESH (cron/trigger), fora do escopo deste arquivo.
--
-- Com esta view aplicada, um futuro services/store.service.ts poderia expor
-- getStoreRanking()/getTopRankedStores() sem reagregar offers a cada
-- request — e o Offer Ranking (ADR-014) ganharia "confiabilidade da loja" e
-- "qualidade do cadastro" como um SELECT simples, em vez de recalcular a
-- cada chamada de getOffersByProduct.
