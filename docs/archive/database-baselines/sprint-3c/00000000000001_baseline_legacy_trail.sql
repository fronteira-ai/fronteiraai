-- ============================================================
-- BASELINE 2/2 — Replay da trilha legada (database/migrations/0001–0017)
-- Sprint 3C — Supabase Local Reproducible Environment
-- ============================================================
--
-- POR QUE ESTE ARQUIVO EXISTE
--
-- `database/migrations/` guarda 17 migrations aplicadas à mão no SQL Editor
-- antes do Database Migration System V2 (ver o README daquele diretório).
-- O Supabase CLI NÃO conhece esse diretório: `supabase db reset` aplica
-- exclusivamente `supabase/migrations/`. Sem este replay o banco local não
-- teria `merchants`, `profiles`, `price_history` nem as tabelas de trust —
-- todas referenciadas por chaves estrangeiras nas 23 migrations modernas
-- (merchants 18x, profiles 33x).
--
-- COMO ESTE ARQUIVO FOI PRODUZIDO
--
-- Concatenação literal, na ordem 0001 → 0017, do conteúdo de
-- `database/migrations/*.sql`. Nenhuma instrução de schema foi reescrita,
-- reordenada ou "corrigida". Este arquivo é um REPLAY.
--
-- ÚNICA EXCLUSÃO: os blocos de VERIFICAÇÃO PÓS-EXECUÇÃO no fim de 7 arquivos
-- (0007, 0008, 0009, 0010, 0011, 0012, 0013). São `SELECT`s interativos que
-- o autor rodava à mão no SQL Editor para conferir o resultado — não
-- produzem schema. Foram excluídos por dois motivos concretos:
--
--   1. Um deles é SQL inválido: 0009 linha 88 faz
--      `SELECT table_name, row_security FROM information_schema.tables`,
--      e `information_schema.tables` não tem coluna `row_security` (isso é
--      `pg_tables.rowsecurity`). Rodando dentro de uma migration, esse
--      statement aborta o `db reset` inteiro com SQLSTATE 42703. Foi assim
--      que o problema apareceu — não é uma decisão preventiva.
--   2. O próprio padrão do projeto proíbe isso: o Database Migration System
--      V2 determina que verification queries vivem em `database/verification/`,
--      "never embedded and never auto-run" (cabeçalho de
--      20260701120000_connector_platform.sql, docs/engineering/DATABASE_ENGINEERING.md).
--
-- Os `SELECT` que fazem parte de corpo de VIEW (0003, 0005) foram
-- preservados — são schema, não verificação.
--
-- OS ARQUIVOS ORIGINAIS PERMANECEM INTOCADOS em `database/migrations/`,
-- como registro histórico congelado, verificações inclusive.
--
-- DEPENDE DE: 00000000000000_baseline_core_catalog.sql (a trilha legada
-- começa com `ALTER TABLE stores`, ou seja, já pressupõe o catálogo core).
-- ============================================================



-- ============================================================
-- SOURCE: database/migrations/0001_proposed_store_contact_hours.sql
-- ============================================================

-- ████ SUPERADA — NÃO APLICAR ████
--
-- Status atualizado na Sprint 3.4.1 (auditoria de dados): esta proposta
-- partiu de `types/store.ts` e `database/DATABASE.md`, sem consultar o
-- schema real do Supabase. A auditoria da Sprint 3.4.1 (query direta via
-- PostgREST) revelou que a tabela `stores` real JÁ TEM `phone`, `whatsapp`,
-- `email`, `website` (não `website_url`), `address` e `opening_hours`
-- (texto livre, não `business_hours jsonb`) — ou seja, NENHUMA das colunas
-- abaixo deveria ser adicionada, pois já existem (a maioria com nomes
-- diferentes do que esta proposta assumia).
--
-- Ver a versão revisada: `0002_revised_store_data_layer.sql`.
-- Ver `docs/DECISIONS.md`, ADR-008, para o achado completo.
--
-- Mantido neste arquivo (não apagado) para registro histórico de como o
-- engano aconteceu: a causa raiz foi gerar a proposta a partir do tipo
-- TypeScript existente em vez de consultar o banco real diretamente —
-- exatamente o tipo de suposição que `docs/CONVENTIONS.md` já alertava
-- ("antes de assumir que um arquivo está implementado, sempre abra-o") e
-- que ADR-007 já tinha começado a expor.
--
-- ---------------------------------------------------------------------
-- Conteúdo original abaixo (histórico, não aplicar):
-- ---------------------------------------------------------------------
--
-- PROPOSTA DE MIGRATION — NÃO APLICADA
--
-- Gerada na Sprint 3.4 (Domínio de Loja) a pedido do CTO, para avaliação
-- antes de qualquer alteração real no banco. Este arquivo NÃO é executado
-- automaticamente (o projeto não tem CI nem runner de migrations — ver
-- docs/PROJECT_STATUS.md) e não deve ser aplicado ao Supabase sem revisão
-- e aprovação explícitas.
--
-- Contexto: a página de loja (app/store/[slug]/) foi implementada na
-- Sprint 3.4 usando apenas os campos hoje existentes em `stores`
-- (name, slug, description, city, country, rating, logo_url, banner_url,
-- verified, created_at). As seções de "Contato" e "Horário de
-- Funcionamento" pedidas na missão da Sprint não puderam ser implementadas
-- porque essas colunas não existem na tabela real — ver docs/DECISIONS.md
-- (ADR-006) e docs/TECH_DEBT.md.
--
-- Esta proposta cobre apenas os campos necessários para essas duas seções.
-- Não inclui colunas para avaliações/reviews (tabela própria, fora de
-- escopo aqui) nem geolocalização precisa (lat/lng) — podem ser objeto de
-- uma proposta separada se o produto precisar de mapa/distância.

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS business_hours jsonb;

-- Todas as colunas são nullable e sem default: lojas existentes continuam
-- válidas sem dados de contato/horário, e o código (StoreDetails/futura
-- seção de contato) deve tratar a ausência como "informação não
-- disponível", nunca como erro.
--
-- Formato sugerido para `business_hours` (estrutura livre, validada na
-- aplicação, não no banco):
-- {
--   "mon": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00",
--   "thu": "09:00-18:00", "fri": "09:00-18:00",
--   "sat": "09:00-13:00", "sun": null
-- }
-- (null/ausente = fechado naquele dia)

COMMENT ON COLUMN stores.phone IS 'Telefone de contato da loja, formato livre.';
COMMENT ON COLUMN stores.whatsapp IS 'Número de WhatsApp da loja, formato livre (ex: link wa.me ou número).';
COMMENT ON COLUMN stores.email IS 'E-mail de contato público da loja.';
COMMENT ON COLUMN stores.website_url IS 'Site oficial da loja, se houver.';
COMMENT ON COLUMN stores.address IS 'Endereço descritivo (rua/número/bairro), complementar a city/country.';
COMMENT ON COLUMN stores.business_hours IS 'Horário de funcionamento por dia da semana, ver formato sugerido no comentário desta migration.';

-- NOTA SEPARADA (não é uma migration de schema, é um achado de dados):
-- verificado nesta sprint que as 5 linhas reais de `stores` no Supabase têm
-- `slug = NULL`, e a tabela `products` está vazia (0 linhas). Isso é
-- independente desta proposta de colunas novas — é um backfill de dados
-- (UPDATE), não um ALTER TABLE — e está fora do escopo deste arquivo. Ver
-- docs/TECH_DEBT.md e o relatório da Sprint 3.4 para detalhes; não
-- corrigido automaticamente por não ser uma decisão de schema/código.


-- ============================================================
-- SOURCE: database/migrations/0002_revised_store_data_layer.sql
-- ============================================================

-- PROPOSTA DE MIGRATION — NÃO APLICADA
--
-- Gerada na Sprint 3.4.1 (Consolidação da Camada de Dados), substituindo
-- `0001_proposed_store_contact_hours.sql` (superada — ver cabeçalho
-- daquele arquivo e docs/DECISIONS.md ADR-008).
--
-- Diferente da 0001, esta proposta foi escrita DEPOIS de consultar o
-- schema real do Supabase coluna por coluna via PostgREST (select de cada
-- campo candidato, lendo o erro "column does not exist" quando ausente —
-- método seguro/somente-leitura, sem precisar de service-role key).
--
-- ACHADO PRINCIPAL: a tabela `stores` real já tem 24 colunas, muito mais
-- completa do que `types/store.ts` (11 campos) ou `database/DATABASE.md`
-- sugeriam. Todas as colunas que a proposta anterior tentava criar JÁ
-- EXISTEM:
--
--   proposta 0001 (errada)      coluna real (já existe)
--   ----------------------      -----------------------
--   phone                    →  phone
--   whatsapp                 →  whatsapp
--   email                    →  email
--   website_url              →  website        (nome diferente)
--   address                  →  address
--   business_hours (jsonb)   →  opening_hours  (text livre, não jsonb)
--
-- Schema real completo de `stores` (confirmado por amostra de dados):
--   id, name, description, whatsapp, website, address, city, rating,
--   created_at, logo_url, instagram, is_verified, opening_hours,
--   latitude, longitude, slug, cover_image, delivery, pickup, pix_br,
--   active, phone, email, country
--
-- Conclusão: NENHUMA coluna nova é necessária em `stores` para contato e
-- horário de funcionamento. O trabalho restante é 100% de código —
-- corrigir `types/store.ts` para refletir os nomes reais (`cover_image`
-- em vez de `banner_url`, `is_verified` em vez de `verified`, e adicionar
-- os ~13 campos hoje ausentes do tipo) e implementar a seção de
-- Contato/Horário em `StoreDetails.tsx` usando os dados que já existem.
-- Isso não tem nada para esta migration fazer — é tratado em
-- `docs/DECISIONS.md` ADR-008 e fica para aprovação separada de código.
--
-- ---------------------------------------------------------------------
-- O QUE ESTA MIGRATION REALMENTE PROPÕE (apenas integridade, não colunas)
-- ---------------------------------------------------------------------

-- FASE 1 — pode ser aplicada a qualquer momento (NULL não conflita com
-- UNIQUE no Postgres, então não exige backfill prévio):
ALTER TABLE stores
  ADD CONSTRAINT stores_slug_unique UNIQUE (slug);

-- FASE 2 — só aplicar DEPOIS que todas as 5 lojas reais tiverem `slug`
-- preenchido (ver estratégia de seed em docs/NEXT_STEPS.md e
-- docs/DECISIONS.md ADR-007/ADR-008). Tentar isto antes do backfill falha
-- com "column contains null values":
-- ALTER TABLE stores ALTER COLUMN slug SET NOT NULL;

-- Nenhuma alteração proposta para `products`, `offers`, `brands` ou
-- `categories` — a auditoria da Sprint 3.4.1 confirmou que os campos que
-- a aplicação espera (price, stock, installments, url em `offers`) não
-- existem por nomes diferentes (`price_usd`/`price_brl`, `in_stock`,
-- `available`, `stock_quantity`, `product_url`, `old_price`, `condition`),
-- não por colunas faltantes — de novo, é correção de tipo/código, não de
-- schema. Ver docs/DOMAIN_MODEL.md (schema real) e docs/DECISIONS.md
-- ADR-008 para o levantamento completo coluna a coluna.


-- ============================================================
-- SOURCE: database/migrations/0003_proposed_product_catalog_price_view.sql
-- ============================================================

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


-- ============================================================
-- SOURCE: database/migrations/0004_proposed_catalog_integrity_and_indexes.sql
-- ============================================================

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


-- ============================================================
-- SOURCE: database/migrations/0005_proposed_store_ranking_view.sql
-- ============================================================

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


-- ============================================================
-- SOURCE: database/migrations/0006_proposed_price_history.sql
-- ============================================================

-- APLICADA MANUALMENTE EM PRODUÇÃO — 2026-06-24 (Sprint 3.9, adendo)
--
-- Gerada na Sprint 3.9 (Price Engine v1), implementando o schema descrito
-- na arquitetura proposta na Sprint 3.7 (ADR-013). Ver docs/DECISIONS.md
-- ADR-017/ADR-018 para a decisão completa e o histórico do bloqueio.
--
-- Bloqueio original (ADR-017, resolvido por ação humana): nenhuma ferramenta
-- disponível neste projeto executa DDL contra o Supabase — `@supabase/
-- supabase-js`/PostgREST só fazem CRUD via REST, não há `pg`/Postgres
-- connection string em `.env.local`, não há Supabase CLI configurado (sem
-- pasta `.supabase/`), e não existe nenhuma RPC já exposta para rodar SQL
-- arbitrário. O CTO aplicou este SQL manualmente no SQL Editor do painel do
-- Supabase; a tabela `price_history` existe de fato desde então, confirmada
-- por consulta direta e por teste funcional completo de `updateOfferPrice`/
-- `getOfferPriceMetrics` (ADR-018).
--
-- Nome do arquivo mantido com o prefixo `_proposed_` por convenção de
-- histórico (mesmo padrão de `0001`, mantida mesmo "superada") — o estado
-- real (aplicada) está registrado aqui e em `docs/DECISIONS.md`, não no
-- nome do arquivo.

CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  price_usd numeric NOT NULL,
  price_brl numeric,
  old_price_usd numeric,
  source text NOT NULL DEFAULT 'manual',
  recorded_at timestamptz NOT NULL DEFAULT now()
);

-- Toda consulta real (getOfferPriceMetrics) filtra por offer_id e ordena por
-- recorded_at — o índice composto cobre as duas operações numa só estrutura,
-- sem precisar do índice simples de offer_id em paralelo.
CREATE INDEX IF NOT EXISTS price_history_offer_recorded_idx
  ON price_history (offer_id, recorded_at DESC);

-- Não incluído nesta proposta: `source` como enum/CHECK restrito aos valores
-- de `PriceChangeSource` (types/priceHistory.ts) — preferiu-se `text` livre
-- para não exigir uma segunda migration sempre que uma fonte nova (ex. um
-- crawler específico) for adicionada; a validação do conjunto de valores
-- aceitos vive no tipo TypeScript, não no banco, mesmo padrão já usado para
-- `offers.condition`/`offers.currency` (colunas livres, sem CHECK no schema
-- real confirmado nas Sprints 3.4.1/3.6).


-- ============================================================
-- SOURCE: database/migrations/0007_proposed_public_read_policies.sql (verificação pós-execução das linhas 79-87 excluída)
-- ============================================================

-- ============================================================
-- 0007 — Leitura pública para o catálogo ParaguAI
-- Status: PRONTO PARA EXECUÇÃO (Sprint 4.1, hotfix)
-- ============================================================
--
-- Contexto (ADR-019):
-- A chave anônima (NEXT_PUBLIC_SUPABASE_ANON_KEY), única usada por
-- lib/supabase.ts e por toda a aplicação Next.js, não lê nenhuma linha
-- de brands/categories/products/offers/price_history. SELECT retorna
-- sempre { error: null, data: [] } silenciosamente, mesmo havendo linhas
-- reais (confirmado com a chave de serviço nas Sprints 3.8/3.9).
-- `stores` é a única tabela do domínio com leitura pública funcionando.
--
-- Segurança:
-- * FOR SELECT = nunca INSERT/UPDATE/DELETE.
-- * TO anon, authenticated = visitante e usuário logado podem ler.
-- * USING (true) = todas as linhas visíveis, sem filtro por linha.
-- * Sem WITH CHECK = impossível usar esta policy para escrever.
-- * Nenhuma policy de escrita para anon/authenticated = RLS bloqueia
--   qualquer INSERT/UPDATE/DELETE com erro explícito.
-- * service_role bypassa RLS por design — seed scripts mantêm acesso
--   total de escrita independente desta migration.
--
-- Idempotência:
-- DROP POLICY IF EXISTS é no-op se a policy não existir.
-- Seguro para re-executar quantas vezes for necessário.
--
-- Tabelas não incluídas intencionalmente:
-- * stores       — já tem leitura pública funcionando
-- * profiles     — não deve ser lida publicamente
-- * favorites    — não deve ser lida publicamente
--
-- Como executar:
-- 1. Abra Supabase Dashboard -> SQL Editor
-- 2. Cole este arquivo inteiro
-- 3. Clique Run
-- 4. Confirme que a query de verificação no final retorna 5 linhas
--    com cmd = 'r' e roles = {anon,authenticated}
-- ============================================================

-- Garante que RLS está ativo em cada tabela.
-- Idempotente: no-op se já habilitado.
ALTER TABLE brands        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- brands
DROP POLICY IF EXISTS "Public read access" ON brands;
CREATE POLICY "Public read access"
  ON brands FOR SELECT TO anon, authenticated USING (true);

-- categories
DROP POLICY IF EXISTS "Public read access" ON categories;
CREATE POLICY "Public read access"
  ON categories FOR SELECT TO anon, authenticated USING (true);

-- products
DROP POLICY IF EXISTS "Public read access" ON products;
CREATE POLICY "Public read access"
  ON products FOR SELECT TO anon, authenticated USING (true);

-- offers
DROP POLICY IF EXISTS "Public read access" ON offers;
CREATE POLICY "Public read access"
  ON offers FOR SELECT TO anon, authenticated USING (true);

-- price_history
DROP POLICY IF EXISTS "Public read access" ON price_history;
CREATE POLICY "Public read access"
  ON price_history FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- Verificação pós-execução
-- Resultado esperado: 5 linhas, todas com cmd = 'r' e
-- roles = {anon,authenticated}. Nenhuma linha com cmd = 'w'.
-- ============================================================


-- ============================================================
-- SOURCE: database/migrations/0008_data_integrity.sql (verificação pós-execução das linhas 119-141 excluída)
-- ============================================================

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



-- ============================================================
-- SOURCE: database/migrations/0009_admin_platform.sql (verificação pós-execução das linhas 88-96 excluída)
-- ============================================================

-- ============================================================
-- 0009 — Admin Platform: profiles + import_logs
-- Status: PRONTO PARA EXECUÇÃO (Release 1.0)
-- ============================================================
--
-- Cria:
-- 1. profiles — vincula auth.users ao sistema de papéis do admin
-- 2. import_logs — histórico de importações (Acquisition Engine)
--
-- Idempotente: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE.
--
-- APÓS APLICAR:
-- 1. Crie um usuário em Supabase Dashboard → Authentication → Users
-- 2. Execute o SQL abaixo (substitua pelo seu e-mail):
--    UPDATE profiles SET role = 'admin'
--    WHERE email = 'danielscaramello21@gmail.com';
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — Tabela profiles
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'operator'
    CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'operator')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
CREATE POLICY "profiles_self_read"
  ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — Trigger: auto-cria profile ao cadastrar usuário
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- PARTE 3 — Tabela import_logs
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id text NOT NULL,
  batch_id text NOT NULL,
  dry_run boolean NOT NULL DEFAULT false,
  success boolean NOT NULL DEFAULT false,
  total_raw integer NOT NULL DEFAULT 0,
  total_persisted integer NOT NULL DEFAULT 0,
  total_errors integer NOT NULL DEFAULT 0,
  metrics jsonb DEFAULT '{}'::jsonb,
  errors jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- import_logs: somente service_role escreve; admin lê via API (service_role)
-- Nenhuma policy pública necessária — leituras ocorrem pelo painel admin
-- via service role, que bypassa RLS.

-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ──────────────────────────────────────────────────────────



-- ============================================================
-- SOURCE: database/migrations/0010_shoppingchina_connector.sql (verificação pós-execução das linhas 57-58 excluída)
-- ============================================================

-- Migration 0010: Shopping China — First Live Connector
-- Adds the store record and connector_configs table used by the acquisition engine

-- ── 1. Store: shopping-china ──────────────────────────────────────────────────
INSERT INTO stores (slug, name, website, country, city, description, active)
VALUES (
  'shopping-china',
  'Shopping China',
  'https://www.shoppingchina.com.py',
  'PY',
  'Ciudad del Este',
  'Loja de eletrônicos e informática em Ciudad del Este, Paraguai.',
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  website     = EXCLUDED.website,
  country     = EXCLUDED.country,
  city        = EXCLUDED.city,
  description = EXCLUDED.description,
  active      = EXCLUDED.active;

-- ── 2. connector_configs — tracks registered connectors (optional metadata) ───
CREATE TABLE IF NOT EXISTS connector_configs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id     text NOT NULL UNIQUE,
  store_slug       text NOT NULL REFERENCES stores(slug),
  enabled          boolean NOT NULL DEFAULT true,
  max_products     integer NOT NULL DEFAULT 10,
  request_delay_ms integer NOT NULL DEFAULT 500,
  config           jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE connector_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "connector_configs_service_only" ON connector_configs;
CREATE POLICY "connector_configs_service_only"
  ON connector_configs
  FOR ALL
  USING (false)
  WITH CHECK (false);

INSERT INTO connector_configs (connector_id, store_slug, enabled, max_products, request_delay_ms, config)
VALUES (
  'shoppingchina',
  'shopping-china',
  true,
  10,
  500,
  '{"baseUrl": "https://www.shoppingchina.com.py", "categories": ["electronicos", "informatica", "celulares"]}'
)
ON CONFLICT (connector_id) DO NOTHING;

-- ── 3. Verify ─────────────────────────────────────────────────────────────────


-- ============================================================
-- SOURCE: database/migrations/0011_offers_unique_constraint.sql (verificação pós-execução das linhas 24-25 excluída)
-- ============================================================

-- Migration 0011: UNIQUE constraint em offers(product_id, store_id)
-- Necessária para que o CatalogWriter possa fazer upsert via
-- ON CONFLICT (product_id, store_id).

-- Remove duplicatas eventuais antes de criar o constraint, mantendo
-- o registro mais recente por par (product_id, store_id).
DELETE FROM offers
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY product_id, store_id
             ORDER BY updated_at DESC NULLS LAST, created_at DESC
           ) AS rn
    FROM offers
  ) sub
  WHERE rn > 1
);

ALTER TABLE offers
  ADD CONSTRAINT offers_product_store_unique UNIQUE (product_id, store_id);

-- Verify


-- ============================================================
-- SOURCE: database/migrations/0012_merchant_platform.sql (verificação pós-execução das linhas 177-180 excluída)
-- ============================================================

-- Migration 0012: Merchant Operating System — Self-Service Platform
-- Release 1.2 — 2026-06-26
--
-- Módulos cobertos:
--   M01 Onboarding | M02 Dashboard | M03 Import Engine | M04 Import Wizard
--   M05 Merchant Score | M06 Trust Score | M07 Verified Stores
--   M08 Audit | M09 Analytics Foundation | M10 Plans Engine
--   M11 Growth Engine | M12 Merchant Success Engine | M13 Future Ready

-- ── 0. Ampliar profiles.role para incluir 'merchant' ──────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'operator', 'merchant'));

-- ── 1. merchant_plans (Plans Engine — M10) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_plans (
  plan                 text PRIMARY KEY,
  display_name         text NOT NULL,
  max_stores           integer NOT NULL DEFAULT 1,
  max_products         integer NOT NULL DEFAULT 100,
  max_imports_month    integer NOT NULL DEFAULT 5,
  has_api_access       boolean NOT NULL DEFAULT false,
  has_analytics        boolean NOT NULL DEFAULT false,
  has_connectors       boolean NOT NULL DEFAULT false,
  has_priority_rank    boolean NOT NULL DEFAULT false,
  price_monthly        numeric NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

INSERT INTO merchant_plans
  (plan, display_name, max_stores, max_products, max_imports_month, has_api_access, has_analytics, has_connectors, has_priority_rank, price_monthly)
VALUES
  ('free',       'Grátis',     1,   100,   5,   false, false, false, false, 0),
  ('pro',        'Pro',        3,   1000,  30,  true,  true,  false, false, 49),
  ('business',   'Business',   10,  10000, 100, true,  true,  true,  false, 199),
  ('enterprise', 'Enterprise', 999, 999999,9999,true,  true,  true,  true,  999)
ON CONFLICT (plan) DO NOTHING;

-- ── 2. merchants (perfil de empresa do lojista) ───────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name     text NOT NULL DEFAULT '',
  company_doc      text,
  company_website  text,
  contact_phone    text,
  contact_whatsapp text,
  contact_email    text,
  -- Onboarding state
  onboarding_step  integer NOT NULL DEFAULT 0,
  onboarding_done  boolean NOT NULL DEFAULT false,
  -- Status & Plan (M01, M10)
  status           text NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','pending','active','suspended','blocked')),
  plan             text NOT NULL DEFAULT 'free' REFERENCES merchant_plans(plan),
  -- Scores (M05, M06)
  merchant_score   integer NOT NULL DEFAULT 0,
  trust_score      integer NOT NULL DEFAULT 0,
  -- Verified store status (M07)
  verified_level   text NOT NULL DEFAULT 'none'
                   CHECK (verified_level IN ('none','verified','premium','official')),
  -- Timestamps
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 3. merchant_stores (M:N — Future Ready M13) ───────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  is_primary  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, store_id)
);

-- ── 4. merchant_audit_logs (M08 Auditoria) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchant_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  payload     jsonb,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 5. merchant_analytics_events (M09 Analytics Foundation) ──────────────────
CREATE TABLE IF NOT EXISTS merchant_analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id) ON DELETE SET NULL,
  store_id    uuid REFERENCES stores(id) ON DELETE SET NULL,
  product_id  uuid REFERENCES products(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 6. merchant_recommendations (M12 Success Engine) ─────────────────────────
CREATE TABLE IF NOT EXISTS merchant_recommendations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  type        text NOT NULL,
  priority    text NOT NULL DEFAULT 'info'
              CHECK (priority IN ('critical','warning','info')),
  title       text NOT NULL,
  body        text NOT NULL,
  metadata    jsonb,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 7. Índices de performance ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS merchants_user_id_idx            ON merchants(user_id);
CREATE INDEX IF NOT EXISTS merchant_stores_merchant_id_idx  ON merchant_stores(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_stores_store_id_idx     ON merchant_stores(store_id);
CREATE INDEX IF NOT EXISTS merchant_audit_merchant_id_idx   ON merchant_audit_logs(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_audit_created_at_idx    ON merchant_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS merchant_analytics_merchant_idx  ON merchant_analytics_events(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_recs_merchant_id_idx    ON merchant_recommendations(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_recs_read_at_idx        ON merchant_recommendations(read_at) WHERE read_at IS NULL;

-- ── 8. updated_at trigger ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 9. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE merchants                ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_stores          ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_plans           ENABLE ROW LEVEL SECURITY;

-- merchant_plans: public read (lojistas veem os planos)
CREATE POLICY "plans_public_read" ON merchant_plans FOR SELECT USING (true);

-- merchants: cada lojista vê e edita apenas o seu registro
CREATE POLICY "merchants_self_access" ON merchants
  FOR ALL USING (auth.uid() = user_id);

-- merchant_stores: lojista acessa stores da sua merchant
CREATE POLICY "merchant_stores_access" ON merchant_stores
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- merchant_audit_logs: lojista lê próprios logs
CREATE POLICY "merchant_audit_read" ON merchant_audit_logs
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- merchant_analytics_events: lojista lê próprios eventos
CREATE POLICY "merchant_analytics_read" ON merchant_analytics_events
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- merchant_recommendations: lojista lê e atualiza (marcar como lida) as próprias
CREATE POLICY "merchant_recs_access" ON merchant_recommendations
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- ── 10. Verificação ──────────────────────────────────────────────────────────


-- ============================================================
-- SOURCE: database/migrations/0013_fix_profiles_role_merchant.sql (verificação pós-execução das linhas 25-25 excluída)
-- ============================================================

-- Migration 0013: Fix profiles.role constraint to allow 'merchant'
-- Idempotent — safe to run multiple times.
--
-- Context: Migration 0012 includes this same ALTER TABLE, but in some environments
-- the constraint was not updated (e.g., if 0012 was applied partially or the
-- ALTER TABLE ran before the table existed). This migration ensures the constraint
-- is correct independently.
--
-- Note: requireMerchant() no longer relies on profiles.role (uses merchant record
-- directly), so this is a belt-and-suspenders fix for data integrity.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'operator', 'merchant'));

-- Update any existing merchants whose role was not updated
UPDATE profiles
SET role = 'merchant'
WHERE id IN (SELECT user_id FROM merchants)
  AND role != 'merchant'
  AND role != 'admin';

-- Verify


-- ============================================================
-- SOURCE: database/migrations/0014_trust_foundation.sql
-- ============================================================

-- Migration: 0014_trust_foundation
-- Sprint: 1.5.1 — Trust Infrastructure
-- Descrição: Cria o domínio de Trust com 5 tabelas permanentes.
-- Dependência: migration 0012_merchant_platform (merchants, profiles tabelas existem)
-- Rollback: ver seção ROLLBACK no final deste arquivo

BEGIN;

-- ── 1. merchant_trust ─────────────────────────────────────────────────────────
-- Estado de confiança por merchant. Um registro por merchant.
-- trust_score não é computado aqui — será computado por Sprint futura (ADR-041).

CREATE TABLE IF NOT EXISTS merchant_trust (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  trust_score        integer     NOT NULL DEFAULT 0
                                 CHECK (trust_score >= 0 AND trust_score <= 100),
  status             text        NOT NULL DEFAULT 'unverified'
                                 CHECK (status IN ('unverified','pending','verified','suspended','rejected')),
  badge_level        text        NOT NULL DEFAULT 'none'
                                 CHECK (badge_level IN ('none','basic','verified','premium')),
  last_verified_at   timestamptz,
  last_event_at      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_trust_merchant_unique UNIQUE (merchant_id)
);

COMMENT ON TABLE merchant_trust IS 'Estado de confiança atual de cada merchant. Um registro por merchant.';
COMMENT ON COLUMN merchant_trust.trust_score IS 'Score 0-100. Não computado automaticamente nesta migration — resultado de algoritmo definido em ADR-041.';
COMMENT ON COLUMN merchant_trust.badge_level IS 'Badge público exibido ao comprador. Concedido manualmente pelo admin até Sprint 1.5.5.';

-- ── 2. merchant_trust_events ──────────────────────────────────────────────────
-- Log imutável de todos os eventos que afetam o trust de um merchant.
-- Alimenta o ParaguAI Brain: ativos HistoricalData + MerchantTrust.

CREATE TABLE IF NOT EXISTS merchant_trust_events (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  merchant_trust_id  uuid        REFERENCES merchant_trust(id) ON DELETE SET NULL,
  event_type         text        NOT NULL,
  source             text        NOT NULL
                                 CHECK (source IN ('system','admin','merchant','buyer','crawler')),
  reason             text,
  delta              integer     NOT NULL DEFAULT 0,
  score_before       integer,
  score_after        integer,
  metadata           jsonb       NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE merchant_trust_events IS 'Log imutável de eventos de trust. Fonte primária do ParaguAI Brain para MerchantTrust e HistoricalData.';
COMMENT ON COLUMN merchant_trust_events.delta IS 'Variação do trust_score causada por este evento. 0 = evento informacional sem impacto em score.';
COMMENT ON COLUMN merchant_trust_events.metadata IS 'Payload livre por tipo de evento. Schema por event_type documentado em src/domains/trust/events/event-registry.ts.';

-- ── 3. merchant_verifications ─────────────────────────────────────────────────
-- Verificações formais de documentos e identidade do merchant.

CREATE TABLE IF NOT EXISTS merchant_verifications (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  verification_type  text        NOT NULL
                                 CHECK (verification_type IN ('document','address','phone','email','bank','social_media','manual')),
  status             text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','approved','rejected','expired')),
  submitted_at       timestamptz NOT NULL DEFAULT now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason   text,
  expires_at         timestamptz,
  metadata           jsonb       NOT NULL DEFAULT '{}',
  created_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE merchant_verifications IS 'Verificações formais de identidade e documentação do merchant.';

-- ── 4. merchant_badges ────────────────────────────────────────────────────────
-- Badges públicos concedidos a merchants. Histórico completo (incluindo revogados).

CREATE TABLE IF NOT EXISTS merchant_badges (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  badge_type         text        NOT NULL
                                 CHECK (badge_type IN ('none','basic','verified','premium')),
  granted_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  revoked_at         timestamptz,
  revoke_reason      text,
  granted_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  is_active          boolean     NOT NULL DEFAULT true,
  metadata           jsonb       NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE merchant_badges IS 'Badges públicos de merchants. is_active = true indica badge vigente. Apenas um badge ativo por merchant.';

-- ── 5. trust_history ─────────────────────────────────────────────────────────
-- Snapshots diários do estado de trust por merchant.
-- INSERT-ONLY: nunca atualizar ou deletar entradas históricas.
-- Alimenta o ParaguAI Brain: ativo HistoricalData (C-1).

CREATE TABLE IF NOT EXISTS trust_history (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id          uuid        NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  snapshot_date        date        NOT NULL DEFAULT CURRENT_DATE,
  trust_score          integer     NOT NULL,
  status               text        NOT NULL,
  badge_level          text,
  event_count          integer     NOT NULL DEFAULT 0,
  verification_count   integer     NOT NULL DEFAULT 0,
  metadata             jsonb       NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trust_history_merchant_date_unique UNIQUE (merchant_id, snapshot_date)
);

COMMENT ON TABLE trust_history IS 'Histórico permanente de snapshots diários de trust. INSERT-ONLY — nunca atualizar ou deletar entradas históricas.';

-- ── Índices ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_merchant_trust_merchant_id
  ON merchant_trust(merchant_id);

CREATE INDEX IF NOT EXISTS idx_merchant_trust_status
  ON merchant_trust(status);

CREATE INDEX IF NOT EXISTS idx_trust_events_merchant_id
  ON merchant_trust_events(merchant_id);

CREATE INDEX IF NOT EXISTS idx_trust_events_type
  ON merchant_trust_events(event_type);

CREATE INDEX IF NOT EXISTS idx_trust_events_created_at
  ON merchant_trust_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_merchant_id
  ON merchant_verifications(merchant_id);

CREATE INDEX IF NOT EXISTS idx_verifications_status
  ON merchant_verifications(status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_badges_merchant_id
  ON merchant_badges(merchant_id);

CREATE INDEX IF NOT EXISTS idx_badges_active
  ON merchant_badges(merchant_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_trust_history_merchant_date
  ON trust_history(merchant_id, snapshot_date DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────

-- merchant_trust
ALTER TABLE merchant_trust ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trust_admin_all" ON merchant_trust;
CREATE POLICY "trust_admin_all" ON merchant_trust
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

DROP POLICY IF EXISTS "trust_public_read_verified" ON merchant_trust;
CREATE POLICY "trust_public_read_verified" ON merchant_trust
  FOR SELECT
  USING (status = 'verified');

-- merchant_trust_events (admin only — log sensível)
ALTER TABLE merchant_trust_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trust_events_admin_all" ON merchant_trust_events;
CREATE POLICY "trust_events_admin_all" ON merchant_trust_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- merchant_verifications
ALTER TABLE merchant_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verifications_admin_all" ON merchant_verifications;
CREATE POLICY "verifications_admin_all" ON merchant_verifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

DROP POLICY IF EXISTS "verifications_merchant_read_own" ON merchant_verifications;
CREATE POLICY "verifications_merchant_read_own" ON merchant_verifications
  FOR SELECT
  USING (
    merchant_id IN (
      SELECT id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- merchant_badges
ALTER TABLE merchant_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges_admin_all" ON merchant_badges;
CREATE POLICY "badges_admin_all" ON merchant_badges
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

DROP POLICY IF EXISTS "badges_public_read_active" ON merchant_badges;
CREATE POLICY "badges_public_read_active" ON merchant_badges
  FOR SELECT
  USING (is_active = true);

-- trust_history (admin only — dados estratégicos)
ALTER TABLE trust_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trust_history_admin_all" ON trust_history;
CREATE POLICY "trust_history_admin_all" ON trust_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- Executar APENAS se necessário reverter esta migration.
-- Ação destrutiva — todos os dados de trust serão perdidos.
--
-- BEGIN;
-- DROP TABLE IF EXISTS trust_history CASCADE;
-- DROP TABLE IF EXISTS merchant_badges CASCADE;
-- DROP TABLE IF EXISTS merchant_verifications CASCADE;
-- DROP TABLE IF EXISTS merchant_trust_events CASCADE;
-- DROP TABLE IF EXISTS merchant_trust CASCADE;
-- COMMIT;


-- ============================================================
-- SOURCE: database/migrations/0015_verification_catalog.sql
-- ============================================================

-- Migration: 0015_verification_catalog
-- Sprint 1.5.2 — Merchant Verification System
-- Creates: verification_types (catalog), verification_evidence, verification_history (audit)
-- Alters: merchant_verifications — expands CHECK constraints for new types and revoked status

-- ─── 1. Expand merchant_verifications.status to include 'revoked' ─────────────

ALTER TABLE merchant_verifications
  DROP CONSTRAINT IF EXISTS merchant_verifications_status_check;

ALTER TABLE merchant_verifications
  ADD CONSTRAINT merchant_verifications_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'revoked'));

-- ─── 2. Expand merchant_verifications.verification_type ───────────────────────

ALTER TABLE merchant_verifications
  DROP CONSTRAINT IF EXISTS merchant_verifications_verification_type_check;

ALTER TABLE merchant_verifications
  ADD CONSTRAINT merchant_verifications_verification_type_check
  CHECK (verification_type IN (
    -- Sprint 1.5.1 — legacy
    'document', 'address', 'phone', 'email', 'bank', 'social_media', 'manual',
    -- Sprint 1.5.2 — semantic
    'identity', 'company', 'location', 'contact', 'hours', 'operation', 'partner', 'documentation'
  ));

-- ─── 3. Verification Types catalog ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS verification_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  category        text NOT NULL CHECK (category IN ('identity', 'business', 'operational', 'compliance')),
  requires_evidence boolean NOT NULL DEFAULT false,
  validity_days   integer NULL CHECK (validity_days IS NULL OR validity_days > 0),
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed: catalog entries for all verification types
INSERT INTO verification_types (label, description, category, requires_evidence, validity_days, sort_order) VALUES
  ('Identidade',          'Verificação de identidade do responsável legal pela loja',       'identity',    true,  730, 10),
  ('Empresa',             'CNPJ ou registro empresarial confirmado',                        'business',    true,  365, 20),
  ('Localização',         'Endereço físico da loja confirmado',                             'business',    true,  365, 30),
  ('Contato',             'Dados de contato (telefone e e-mail) verificados',               'business',    false, 365, 40),
  ('Horários',            'Horário de funcionamento validado',                              'operational', false, 180, 50),
  ('Operação',            'Loja com histórico consistente de operação ativa',               'operational', false, NULL, 60),
  ('Parceiro Oficial',    'Relacionamento oficial com fabricante ou distribuidor confirmado','compliance',  true,  365, 70),
  ('Documentação',        'Documentação regulatória e fiscal verificada',                   'compliance',  true,  365, 80),
  -- Legacy types
  ('Documento',           'Documento oficial enviado e validado',                           'identity',    true,  730, 90),
  ('Endereço',            'Comprovante de endereço verificado',                             'business',    true,  365, 100),
  ('Telefone',            'Número de telefone verificado por chamada ou SMS',               'business',    false, 365, 110),
  ('E-mail',              'Endereço de e-mail verificado',                                  'business',    false, 365, 120),
  ('Conta Bancária',      'Conta bancária verificada para recebimentos',                    'compliance',  true,  365, 130),
  ('Redes Sociais',       'Perfis em redes sociais confirmados como oficiais',              'business',    false, NULL, 140),
  ('Verificação Manual',  'Verificação manual realizada por agente da ParaguAI',            'identity',    false, 365, 150)
ON CONFLICT DO NOTHING;

-- ─── 4. Verification Evidence ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS verification_evidence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id     uuid NOT NULL REFERENCES merchant_verifications(id) ON DELETE CASCADE,
  merchant_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evidence_type       text NOT NULL CHECK (evidence_type IN ('document', 'image', 'url', 'text', 'json')),
  label               text NOT NULL,
  content             text NULL,
  file_path           text NULL,
  mime_type           text NULL,
  file_size_bytes     bigint NULL CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  uploaded_by         uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  is_valid            boolean NULL,
  review_note         text NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_evidence_verification_id ON verification_evidence(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_evidence_merchant_id ON verification_evidence(merchant_id);
CREATE INDEX IF NOT EXISTS idx_verification_evidence_active ON verification_evidence(verification_id) WHERE deleted_at IS NULL;

-- ─── 5. Verification History (audit log — INSERT-ONLY) ───────────────────────

CREATE TABLE IF NOT EXISTS verification_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id     uuid NOT NULL REFERENCES merchant_verifications(id) ON DELETE CASCADE,
  merchant_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action              text NOT NULL CHECK (action IN (
    'created', 'submitted', 'approved', 'rejected', 'revoked',
    'expired', 'evidence_added', 'evidence_removed', 'metadata_updated'
  )),
  previous_status     text NULL,
  new_status          text NULL,
  performed_by        uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_role   text NULL CHECK (performed_by_role IN ('admin', 'merchant', 'system', 'buyer')),
  reason              text NULL,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
  -- No updated_at, no deleted_at — this table is INSERT-ONLY
);

CREATE INDEX IF NOT EXISTS idx_verification_history_verification_id ON verification_history(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_merchant_id ON verification_history(merchant_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_created_at ON verification_history(created_at DESC);

-- ─── 6. RLS Policies ─────────────────────────────────────────────────────────

ALTER TABLE verification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;

-- verification_types: public read, admin write
DROP POLICY IF EXISTS "Public can read active verification types" ON verification_types;
CREATE POLICY "Public can read active verification types"
  ON verification_types FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admin can manage verification types" ON verification_types;
CREATE POLICY "Admin can manage verification types"
  ON verification_types FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- verification_evidence: merchant reads own, admin reads all, service role writes
DROP POLICY IF EXISTS "Merchant reads own evidence" ON verification_evidence;
CREATE POLICY "Merchant reads own evidence"
  ON verification_evidence FOR SELECT
  USING (
    merchant_id = auth.uid() AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Admin reads all evidence" ON verification_evidence;
CREATE POLICY "Admin reads all evidence"
  ON verification_evidence FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- verification_history: merchant reads own, admin reads all
DROP POLICY IF EXISTS "Merchant reads own verification history" ON verification_history;
CREATE POLICY "Merchant reads own verification history"
  ON verification_history FOR SELECT
  USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Admin reads all verification history" ON verification_history;
CREATE POLICY "Admin reads all verification history"
  ON verification_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- To rollback this migration:
--
-- DROP TABLE IF EXISTS verification_history;
-- DROP TABLE IF EXISTS verification_evidence;
-- DROP TABLE IF EXISTS verification_types;
--
-- ALTER TABLE merchant_verifications
--   DROP CONSTRAINT IF EXISTS merchant_verifications_status_check;
-- ALTER TABLE merchant_verifications
--   ADD CONSTRAINT merchant_verifications_status_check
--   CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));
--
-- ALTER TABLE merchant_verifications
--   DROP CONSTRAINT IF EXISTS merchant_verifications_verification_type_check;
-- ALTER TABLE merchant_verifications
--   ADD CONSTRAINT merchant_verifications_verification_type_check
--   CHECK (verification_type IN ('document', 'address', 'phone', 'email', 'bank', 'social_media', 'manual'));


-- ============================================================
-- SOURCE: database/migrations/0016_trust_experience.sql
-- ============================================================

-- Migration 0016 — Trust Experience (Epic 2)
-- Sprint 1.5.3 — Trust Signals, Signal Provenance, Reviews, Moderation, Timeline
-- INSERT-ONLY: review_history (no updated_at, no deleted_at)
-- Soft-delete: merchant_reviews (deleted_at)

-- ── trust_signals ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_signals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type    text NOT NULL,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
  category       text NOT NULL
                   CHECK (category IN ('identity', 'business', 'operational', 'compliance')),
  title          text NOT NULL,
  description    text NOT NULL DEFAULT '',
  evidence_summary text NOT NULL DEFAULT '',
  source         text NOT NULL DEFAULT 'admin',
  sort_order     int NOT NULL DEFAULT 0,
  issued_at      timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  is_public      boolean NOT NULL DEFAULT true,
  verification_id uuid REFERENCES merchant_verifications(id) ON DELETE SET NULL,
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trust_signals_merchant_idx ON trust_signals (merchant_id);
CREATE INDEX IF NOT EXISTS trust_signals_status_idx   ON trust_signals (status);
CREATE INDEX IF NOT EXISTS trust_signals_type_idx     ON trust_signals (signal_type);

ALTER TABLE trust_signals ENABLE ROW LEVEL SECURITY;

-- Public read for active/public signals
DROP POLICY IF EXISTS "trust_signals_public_read" ON trust_signals;
CREATE POLICY "trust_signals_public_read" ON trust_signals
  FOR SELECT USING (is_public = true AND status = 'active');

-- Admins can read all
DROP POLICY IF EXISTS "trust_signals_admin_all" ON trust_signals;
CREATE POLICY "trust_signals_admin_all" ON trust_signals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- ── signal_provenance ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signal_provenance (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id        uuid NOT NULL REFERENCES trust_signals(id) ON DELETE CASCADE,
  merchant_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generated_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verification_id  uuid REFERENCES merchant_verifications(id) ON DELETE SET NULL,
  evidence_summary text NOT NULL DEFAULT '',
  how_obtained     text NOT NULL DEFAULT '',
  approved_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  trust_level      text NOT NULL DEFAULT 'medium'
                     CHECK (trust_level IN ('high', 'medium', 'low')),
  is_auditable     boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signal_provenance_signal_idx   ON signal_provenance (signal_id);
CREATE INDEX IF NOT EXISTS signal_provenance_merchant_idx ON signal_provenance (merchant_id);

ALTER TABLE signal_provenance ENABLE ROW LEVEL SECURITY;

-- Admin read only (provenance is sensitive)
DROP POLICY IF EXISTS "signal_provenance_admin_read" ON signal_provenance;
CREATE POLICY "signal_provenance_admin_read" ON signal_provenance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

DROP POLICY IF EXISTS "signal_provenance_admin_write" ON signal_provenance;
CREATE POLICY "signal_provenance_admin_write" ON signal_provenance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- ── merchant_reviews ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating              int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title               text,
  body                text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'hidden', 'removed')),
  is_verified_purchase boolean NOT NULL DEFAULT false,
  purchase_ref        uuid,
  merchant_reply      text,
  merchant_reply_at   timestamptz,
  edited_at           timestamptz,
  edit_count          int NOT NULL DEFAULT 0,
  helpful_count       int NOT NULL DEFAULT 0,
  report_count        int NOT NULL DEFAULT 0,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  UNIQUE (merchant_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS merchant_reviews_merchant_idx ON merchant_reviews (merchant_id);
CREATE INDEX IF NOT EXISTS merchant_reviews_reviewer_idx ON merchant_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS merchant_reviews_status_idx   ON merchant_reviews (status);
-- Partial: only active (not soft-deleted) approved reviews are fast to query
CREATE INDEX IF NOT EXISTS merchant_reviews_public_idx
  ON merchant_reviews (merchant_id, rating)
  WHERE status = 'approved' AND deleted_at IS NULL;

ALTER TABLE merchant_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for approved, non-deleted reviews
DROP POLICY IF EXISTS "merchant_reviews_public_read" ON merchant_reviews;
CREATE POLICY "merchant_reviews_public_read" ON merchant_reviews
  FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

-- Any authenticated user can create their own review
DROP POLICY IF EXISTS "merchant_reviews_auth_insert" ON merchant_reviews;
CREATE POLICY "merchant_reviews_auth_insert" ON merchant_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Reviewer can edit their own pending/approved review
DROP POLICY IF EXISTS "merchant_reviews_reviewer_update" ON merchant_reviews;
CREATE POLICY "merchant_reviews_reviewer_update" ON merchant_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id AND status IN ('pending', 'approved'))
  WITH CHECK (auth.uid() = reviewer_id);

-- Admin full access
DROP POLICY IF EXISTS "merchant_reviews_admin_all" ON merchant_reviews;
CREATE POLICY "merchant_reviews_admin_all" ON merchant_reviews
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- ── review_reports ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES merchant_reviews(id) ON DELETE CASCADE,
  merchant_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       text NOT NULL
                 CHECK (reason IN ('spam', 'fake', 'offensive', 'irrelevant', 'conflict_of_interest', 'other')),
  description  text CHECK (char_length(description) <= 1000),
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  action_taken text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- One report per reviewer per review
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS review_reports_review_idx   ON review_reports (review_id);
CREATE INDEX IF NOT EXISTS review_reports_status_idx   ON review_reports (status);
CREATE INDEX IF NOT EXISTS review_reports_reporter_idx ON review_reports (reporter_id);

ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can report
DROP POLICY IF EXISTS "review_reports_auth_insert" ON review_reports;
CREATE POLICY "review_reports_auth_insert" ON review_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Reporter can see their own reports
DROP POLICY IF EXISTS "review_reports_reporter_read" ON review_reports;
CREATE POLICY "review_reports_reporter_read" ON review_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admin full access
DROP POLICY IF EXISTS "review_reports_admin_all" ON review_reports;
CREATE POLICY "review_reports_admin_all" ON review_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- ── review_history (INSERT-ONLY) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        uuid NOT NULL REFERENCES merchant_reviews(id) ON DELETE CASCADE,
  merchant_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action           text NOT NULL
                     CHECK (action IN (
                       'created', 'edited', 'approved', 'hidden', 'removed',
                       'restored', 'merchant_replied', 'report_added', 'marked_helpful'
                     )),
  previous_body    text,
  new_body         text,
  previous_status  text,
  new_status       text,
  performed_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_role text,
  reason           text,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
  -- No updated_at, no deleted_at — INSERT ONLY
);

CREATE INDEX IF NOT EXISTS review_history_review_idx   ON review_history (review_id);
CREATE INDEX IF NOT EXISTS review_history_merchant_idx ON review_history (merchant_id);

ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- Admin read
DROP POLICY IF EXISTS "review_history_admin_read" ON review_history;
CREATE POLICY "review_history_admin_read" ON review_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- Admin write (moderation actions)
DROP POLICY IF EXISTS "review_history_admin_insert" ON review_history;
CREATE POLICY "review_history_admin_insert" ON review_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- Service role can insert (for system actions)
DROP POLICY IF EXISTS "review_history_service_insert" ON review_history;
CREATE POLICY "review_history_service_insert" ON review_history
  FOR INSERT WITH CHECK (true);

-- ── merchant_timeline ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_timeline (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type     text NOT NULL,
  title          text NOT NULL,
  description    text,
  category       text NOT NULL
                   CHECK (category IN ('verification', 'review', 'badge', 'profile', 'operational')),
  reference_id   uuid,
  reference_type text,
  visibility     text NOT NULL DEFAULT 'public'
                   CHECK (visibility IN ('public', 'merchant_only', 'admin_only')),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_timeline_merchant_idx    ON merchant_timeline (merchant_id);
CREATE INDEX IF NOT EXISTS merchant_timeline_occurred_idx    ON merchant_timeline (occurred_at DESC);
CREATE INDEX IF NOT EXISTS merchant_timeline_category_idx   ON merchant_timeline (category);
CREATE INDEX IF NOT EXISTS merchant_timeline_visibility_idx ON merchant_timeline (visibility);

ALTER TABLE merchant_timeline ENABLE ROW LEVEL SECURITY;

-- Public events visible to all
DROP POLICY IF EXISTS "merchant_timeline_public_read" ON merchant_timeline;
CREATE POLICY "merchant_timeline_public_read" ON merchant_timeline
  FOR SELECT USING (visibility = 'public');

-- Merchant reads their own (all visibility levels)
DROP POLICY IF EXISTS "merchant_timeline_merchant_read" ON merchant_timeline;
CREATE POLICY "merchant_timeline_merchant_read" ON merchant_timeline
  FOR SELECT USING (
    merchant_id IN (
      SELECT user_id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- Admin full access
DROP POLICY IF EXISTS "merchant_timeline_admin_all" ON merchant_timeline;
CREATE POLICY "merchant_timeline_admin_all" ON merchant_timeline
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- Service role insert (triggered by other services)
DROP POLICY IF EXISTS "merchant_timeline_service_insert" ON merchant_timeline;
CREATE POLICY "merchant_timeline_service_insert" ON merchant_timeline
  FOR INSERT WITH CHECK (true);

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS merchant_timeline CASCADE;
-- DROP TABLE IF EXISTS review_history CASCADE;
-- DROP TABLE IF EXISTS review_reports CASCADE;
-- DROP TABLE IF EXISTS merchant_reviews CASCADE;
-- DROP TABLE IF EXISTS signal_provenance CASCADE;
-- DROP TABLE IF EXISTS trust_signals CASCADE;


-- ============================================================
-- SOURCE: database/migrations/0017_hotfix_trust_experience.sql
-- ============================================================

-- Migration 0017 — Hotfix: completa o que 0016 deixou incompleto
-- Contexto: 0016 rodou parcialmente duas vezes.
--   Execução 1: parou em "trust_signals_admin_all" (admin_users não existe — já corrigido)
--   Execução 2: parou em "trust_signals_public_read" (policy já existe, PostgreSQL não tem CREATE POLICY IF NOT EXISTS)
-- Esta migration cria o que ficou faltando, de forma totalmente idempotente.
-- Nota: DO blocks usam $do$ como delimitador externo; EXECUTE strings usam $p$.

-- ── trust_signals: política admin faltante ───────────────────────────────────

DO $do$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trust_signals' AND policyname = 'trust_signals_admin_all'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "trust_signals_admin_all" ON trust_signals
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'operator')
          )
        )
    $p$;
  END IF;
END $do$;

-- ── signal_provenance ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signal_provenance (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id        uuid NOT NULL REFERENCES trust_signals(id) ON DELETE CASCADE,
  merchant_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generated_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verification_id  uuid REFERENCES merchant_verifications(id) ON DELETE SET NULL,
  evidence_summary text NOT NULL DEFAULT '',
  how_obtained     text NOT NULL DEFAULT '',
  approved_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  trust_level      text NOT NULL DEFAULT 'medium'
                     CHECK (trust_level IN ('high', 'medium', 'low')),
  is_auditable     boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signal_provenance_signal_idx   ON signal_provenance (signal_id);
CREATE INDEX IF NOT EXISTS signal_provenance_merchant_idx ON signal_provenance (merchant_id);

ALTER TABLE signal_provenance ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signal_provenance' AND policyname = 'signal_provenance_admin_read') THEN
    EXECUTE $p$
      CREATE POLICY "signal_provenance_admin_read" ON signal_provenance
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signal_provenance' AND policyname = 'signal_provenance_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "signal_provenance_admin_write" ON signal_provenance
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

-- ── merchant_reviews ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_reviews (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating               int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                text,
  body                 text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'hidden', 'removed')),
  is_verified_purchase boolean NOT NULL DEFAULT false,
  purchase_ref         uuid,
  merchant_reply       text,
  merchant_reply_at    timestamptz,
  edited_at            timestamptz,
  edit_count           int NOT NULL DEFAULT 0,
  helpful_count        int NOT NULL DEFAULT 0,
  report_count         int NOT NULL DEFAULT 0,
  metadata             jsonb NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz,
  UNIQUE (merchant_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS merchant_reviews_merchant_idx ON merchant_reviews (merchant_id);
CREATE INDEX IF NOT EXISTS merchant_reviews_reviewer_idx ON merchant_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS merchant_reviews_status_idx   ON merchant_reviews (status);
CREATE INDEX IF NOT EXISTS merchant_reviews_public_idx
  ON merchant_reviews (merchant_id, rating)
  WHERE status = 'approved' AND deleted_at IS NULL;

ALTER TABLE merchant_reviews ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_reviews' AND policyname = 'merchant_reviews_public_read') THEN
    EXECUTE $p$ CREATE POLICY "merchant_reviews_public_read" ON merchant_reviews FOR SELECT USING (status = 'approved' AND deleted_at IS NULL) $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_reviews' AND policyname = 'merchant_reviews_auth_insert') THEN
    EXECUTE $p$ CREATE POLICY "merchant_reviews_auth_insert" ON merchant_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id) $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_reviews' AND policyname = 'merchant_reviews_reviewer_update') THEN
    EXECUTE $p$
      CREATE POLICY "merchant_reviews_reviewer_update" ON merchant_reviews
        FOR UPDATE USING (auth.uid() = reviewer_id AND status IN ('pending', 'approved'))
        WITH CHECK (auth.uid() = reviewer_id)
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_reviews' AND policyname = 'merchant_reviews_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "merchant_reviews_admin_all" ON merchant_reviews
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

-- ── review_reports ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES merchant_reviews(id) ON DELETE CASCADE,
  merchant_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       text NOT NULL
                 CHECK (reason IN ('spam', 'fake', 'offensive', 'irrelevant', 'conflict_of_interest', 'other')),
  description  text CHECK (char_length(description) <= 1000),
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  action_taken text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS review_reports_review_idx   ON review_reports (review_id);
CREATE INDEX IF NOT EXISTS review_reports_status_idx   ON review_reports (status);
CREATE INDEX IF NOT EXISTS review_reports_reporter_idx ON review_reports (reporter_id);

ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_reports' AND policyname = 'review_reports_auth_insert') THEN
    EXECUTE $p$ CREATE POLICY "review_reports_auth_insert" ON review_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id) $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_reports' AND policyname = 'review_reports_reporter_read') THEN
    EXECUTE $p$ CREATE POLICY "review_reports_reporter_read" ON review_reports FOR SELECT USING (auth.uid() = reporter_id) $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_reports' AND policyname = 'review_reports_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "review_reports_admin_all" ON review_reports
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

-- ── review_history (INSERT-ONLY) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id         uuid NOT NULL REFERENCES merchant_reviews(id) ON DELETE CASCADE,
  merchant_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action            text NOT NULL
                      CHECK (action IN (
                        'created', 'edited', 'approved', 'hidden', 'removed',
                        'restored', 'merchant_replied', 'report_added', 'marked_helpful'
                      )),
  previous_body     text,
  new_body          text,
  previous_status   text,
  new_status        text,
  performed_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_role text,
  reason            text,
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_history_review_idx   ON review_history (review_id);
CREATE INDEX IF NOT EXISTS review_history_merchant_idx ON review_history (merchant_id);

ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_history' AND policyname = 'review_history_admin_read') THEN
    EXECUTE $p$
      CREATE POLICY "review_history_admin_read" ON review_history
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_history' AND policyname = 'review_history_admin_insert') THEN
    EXECUTE $p$
      CREATE POLICY "review_history_admin_insert" ON review_history
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_history' AND policyname = 'review_history_service_insert') THEN
    EXECUTE $p$ CREATE POLICY "review_history_service_insert" ON review_history FOR INSERT WITH CHECK (true) $p$;
  END IF;
END $do$;

-- ── merchant_timeline ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_timeline (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type     text NOT NULL,
  title          text NOT NULL,
  description    text,
  category       text NOT NULL
                   CHECK (category IN ('verification', 'review', 'badge', 'profile', 'operational')),
  reference_id   uuid,
  reference_type text,
  visibility     text NOT NULL DEFAULT 'public'
                   CHECK (visibility IN ('public', 'merchant_only', 'admin_only')),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_timeline_merchant_idx    ON merchant_timeline (merchant_id);
CREATE INDEX IF NOT EXISTS merchant_timeline_occurred_idx    ON merchant_timeline (occurred_at DESC);
CREATE INDEX IF NOT EXISTS merchant_timeline_category_idx   ON merchant_timeline (category);
CREATE INDEX IF NOT EXISTS merchant_timeline_visibility_idx ON merchant_timeline (visibility);

ALTER TABLE merchant_timeline ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_timeline' AND policyname = 'merchant_timeline_public_read') THEN
    EXECUTE $p$ CREATE POLICY "merchant_timeline_public_read" ON merchant_timeline FOR SELECT USING (visibility = 'public') $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_timeline' AND policyname = 'merchant_timeline_merchant_read') THEN
    EXECUTE $p$
      CREATE POLICY "merchant_timeline_merchant_read" ON merchant_timeline
        FOR SELECT USING (
          merchant_id IN (SELECT user_id FROM merchants WHERE user_id = auth.uid())
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_timeline' AND policyname = 'merchant_timeline_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "merchant_timeline_admin_all" ON merchant_timeline
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_timeline' AND policyname = 'merchant_timeline_service_insert') THEN
    EXECUTE $p$ CREATE POLICY "merchant_timeline_service_insert" ON merchant_timeline FOR INSERT WITH CHECK (true) $p$;
  END IF;
END $do$;

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS merchant_timeline CASCADE;
-- DROP TABLE IF EXISTS review_history CASCADE;
-- DROP TABLE IF EXISTS review_reports CASCADE;
-- DROP TABLE IF EXISTS merchant_reviews CASCADE;
-- DROP TABLE IF EXISTS signal_provenance CASCADE;
-- DROP POLICY IF EXISTS "trust_signals_admin_all" ON trust_signals;
