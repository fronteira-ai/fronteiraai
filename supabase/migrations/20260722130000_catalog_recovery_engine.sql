-- ============================================================
-- Catalog Recovery Engine (Mission Ω-Rehabilitation)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: total e seguro — `catalog_recovery_decisions` é uma tabela nova
--   e aditiva. DROP TABLE não quebra nada fora desta migration. Nenhuma
--   tabela existente (products, offers, canonical_products, brands,
--   categories, catalog_pending_reviews, merchant_attribute_patterns) é
--   alterada em schema por esta migration.
-- ============================================================
--
-- Contexto: Mission Ω-Gatekeeper já impede que dado novo contamine o
-- catálogo. Esta Mission (Ω-Rehabilitation) recupera o catálogo histórico
-- — produtos escritos ANTES do Firewall existir — usando as mesmas
-- evidências determinísticas (ProductSignature, Canonical Catalog,
-- Merchant Memory, Universal Taxonomy, normalização de marca). Toda
-- decisão de recuperação é registrada aqui, nunca aplicada silenciosamente
-- — "Registrar motivo da decisão" é um requisito explícito da Mission,
-- não um nice-to-have.

CREATE TABLE IF NOT EXISTS catalog_recovery_decisions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  field_type          text        NOT NULL CHECK (field_type IN ('brand', 'category')),

  -- O nome do valor lixo/pendente que este produto tinha antes da
  -- recuperação (ex.: "Outros", "GENERAL") — nunca reescrito depois, é o
  -- registro histórico do que estava errado.
  previous_value      text,

  -- A camada determinística que confirmou o novo valor — lista fechada,
  -- alinhada 1:1 às 5 Camadas desta Mission. Nunca "ia"/"llm"/"embedding".
  layer               text        NOT NULL CHECK (layer IN (
    'product_signature', 'canonical_catalog', 'merchant_memory',
    'universal_taxonomy', 'brand_normalization'
  )),

  recovered_value     text        NOT NULL,
  recovered_brand_id  uuid        REFERENCES brands(id),
  recovered_category_id uuid      REFERENCES categories(id),

  confidence          text        NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),

  -- Texto legível explicando exatamente por que esta decisão foi tomada
  -- (qual identificador bateu, qual produto canônico, qual store+padrão
  -- aprendido) — mesma disciplina de explainabilityReason do Product
  -- Identity Engine.
  evidence            text        NOT NULL,

  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crd_product ON catalog_recovery_decisions (product_id);
CREATE INDEX IF NOT EXISTS idx_crd_layer ON catalog_recovery_decisions (layer);

ALTER TABLE catalog_recovery_decisions ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (scripts/API routes
-- autenticadas) — mesmo padrão de catalog_pending_reviews/merge_candidates.
