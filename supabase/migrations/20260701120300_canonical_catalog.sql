-- ============================================================
-- 0025 — Canonical Catalog & Compare Foundation (Release 1.7 — Wave 4)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: Partial — ver database/templates/ROLLBACK_TEMPLATE.sql.
--   DROP TABLE merge_candidates é seguro isoladamente (nenhum outro código
--   depende dela). Reverter offers.canonical_product_id ou canonical_products
--   descarta o bootstrap 1:1 (recriável a qualquer momento rodando
--   scripts/canonical-catalog-bootstrap.ts de novo — não é dado que só existe
--   aqui, é derivado de `products`/`offers`).
-- ============================================================
--
-- Cria:
-- 1. canonical_products — identidade permanente de produto (mission: "Product
--    passa a representar a origem/importação. Canonical Product representa a
--    identidade permanente."). canonical_slug é único e imutável — nunca
--    regenerado para uma linha existente.
-- 2. offers.canonical_product_id — a relação real "Offer → Canonical Product"
--    (nullable, ON DELETE SET NULL). offers.product_id NUNCA é removida ou
--    alterada — continua significando "de qual registro de importação/origem
--    esta oferta veio"; /product/[slug] continua resolvendo exatamente como
--    hoje. Preenchida pelo bootstrap (scripts/canonical-catalog-bootstrap.ts),
--    não por esta migration — mantém o schema livre de DML pesado, conforme
--    Database Migration System V2 (docs/engineering/DATABASE_ENGINEERING.md).
-- 3. merge_candidates — sugestões de união entre Canonical Products. Shadow
--    Mode continua: nenhuma união automática, mesmo "aprovar" só registra uma
--    decisão humana (status), nunca reatribui offers nem depreca um canonical
--    product — essa execução fica para uma Wave futura.
--
-- PRINCÍPIO:
-- Nenhuma URL existente quebra. Nenhum Product é removido. Nenhuma Offer
-- perde histórico. O bootstrap 1:1 (produto existente → canonical product)
-- não é uma união — é um espelhamento sem perda, então não viola a regra de
-- "nenhuma união automática".
--
-- Verificação: database/verification/0025_verify.sql — nunca embutida aqui,
-- nunca executada automaticamente.
-- ============================================================

CREATE TABLE IF NOT EXISTS canonical_products (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_slug   text        UNIQUE NOT NULL,
  name             text        NOT NULL,
  brand_id         uuid        REFERENCES brands(id) ON DELETE SET NULL,
  category_id      uuid        REFERENCES categories(id) ON DELETE SET NULL,
  image_url        text,
  specifications   jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canonical_products_brand ON canonical_products (brand_id);

ALTER TABLE canonical_products ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (API routes autenticadas)

ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS canonical_product_id uuid REFERENCES canonical_products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_offers_canonical_product ON offers (canonical_product_id);

CREATE TABLE IF NOT EXISTS merge_candidates (
  id                             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_canonical_product_id    uuid        NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  target_canonical_product_id    uuid        NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  confidence                     numeric(5,2) NOT NULL,
  algorithm_version              text        NOT NULL,
  matched_attributes             jsonb       NOT NULL DEFAULT '[]'::jsonb,
  mismatched_attributes          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  penalties                      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  reason                         text        NOT NULL,
  status                         text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'ignored')),
  reviewed_at                    timestamptz,
  reviewed_by                    text,
  created_at                     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_canonical_product_id, target_canonical_product_id)
);

CREATE INDEX IF NOT EXISTS idx_merge_candidates_status ON merge_candidates (status, created_at DESC);

ALTER TABLE merge_candidates ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (API routes autenticadas) —
-- mesmo padrão de product_identity_match_log (migration anterior).
