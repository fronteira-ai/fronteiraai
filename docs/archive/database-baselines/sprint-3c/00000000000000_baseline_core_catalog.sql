-- ============================================================
-- BASELINE 1/2 — Core Catalog (stores, brands, categories, products, offers)
-- Sprint 3C — Supabase Local Reproducible Environment
-- ============================================================
--
-- POR QUE ESTE ARQUIVO EXISTE
--
-- As cinco tabelas core do catálogo foram criadas à mão no Supabase Cloud
-- antes da migration 0001, e nunca entraram em nenhuma migration versionada.
-- Auditoria (Sprint 3A/3B/3C): não existe `CREATE TABLE` para stores,
-- brands, categories, products ou offers em `supabase/migrations/`, em
-- `database/migrations/` nem em `database/sql/` (vazio). Ao mesmo tempo,
-- 29 chaves estrangeiras espalhadas pelas duas trilhas de migration as
-- referenciam. Consequência: `supabase db reset` falhava na PRIMEIRA
-- migration e nenhum banco local podia ser construído a partir do Git.
--
-- FONTE DE CADA COLUNA (nada aqui foi inventado)
--
--   stores      → types/store.ts (campos "confirmados via auditoria direta
--                 do Supabase", Sprint 3.4.1 / ADR-008-009)
--   brands      → types/brand.ts + database/seed/brands/data.js
--   categories  → types/category.ts + database/seed/categories/data.js
--   products    → types/product.ts + database/seed/products/data.js
--                 + src/domains/connectors/infrastructure/SupabaseCatalogRepository.ts:313-319
--   offers      → types/offer.ts + database/seed/offers/data.js
--                 + SupabaseCatalogRepository.ts:356-368
--
-- O QUE ESTE ARQUIVO DELIBERADAMENTE NÃO FAZ
--
--   - Não cria constraints UNIQUE de slug: elas pertencem à trilha legada
--     (0002/0004/0008) e são aplicadas pela baseline 2/2. Declará-las aqui
--     causaria "constraint already exists" ao replicar a trilha legada.
--   - Não cria a UNIQUE (product_id, store_id) de offers: é da 0011.
--   - Não cria os índices de catálogo: são da 0004/0008.
--   - Não cria RLS/policies: são da 0007.
--   - Não cria price_history: é da 0006.
--   - Não adiciona offers.canonical_product_id (migration moderna
--     20260701120300) nem stores.discovered_at/discovery_connector_key
--     (20260701120100) — essas colunas continuam vindo de suas migrations.
--   - Não insere nenhuma linha.
--
-- NULABILIDADE: permissiva por escolha explícita. types/*.ts descreve o que
-- a aplicação espera LER, não a nulabilidade real do banco de produção (que
-- não pôde ser inspecionada — Cloud em exceed_egress_quota). Restringir
-- colunas sem evidência seria inventar schema. NOT NULL só onde há
-- evidência forte: chaves, nomes e timestamps.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- brands
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text,
  logo_url    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- categories
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  slug        text,
  icon        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- stores
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text        NOT NULL,
  slug           text,
  description    text,
  city           text,
  country        text,
  rating         numeric,
  logo_url       text,
  cover_image    text,
  is_verified    boolean     NOT NULL DEFAULT false,
  phone          text,
  whatsapp       text,
  email          text,
  website        text,
  address        text,
  opening_hours  text,
  instagram      text,
  latitude       numeric,
  longitude      numeric,
  delivery       boolean,
  pickup         boolean,
  pix_br         boolean,
  active         boolean     DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- products
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text,
  description     text,
  brand_id        uuid        REFERENCES brands(id)     ON DELETE SET NULL,
  category_id     uuid        REFERENCES categories(id) ON DELETE SET NULL,
  image_url       text,
  specifications  jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- offers
-- ──────────────────────────────────────────────────────────
-- Filosofia registrada em docs/database/DATABASE.md: "o preço pertence à
-- oferta e não ao produto". price_usd e price_brl são fornecidos de forma
-- independente por cada loja (ADR-009 removeu conversão automática).
CREATE TABLE IF NOT EXISTS offers (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  store_id        uuid        NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  currency        text        NOT NULL DEFAULT 'USD',
  price_usd       numeric     NOT NULL,
  price_brl       numeric,
  old_price       numeric,
  in_stock        boolean     NOT NULL DEFAULT true,
  available       boolean     NOT NULL DEFAULT true,
  stock_quantity  integer,
  condition       text,
  warranty        text,
  cashback        numeric,
  product_url     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
