-- ============================================================
-- Catalog Integrity Firewall (Mission Ω-Gatekeeper)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: total e seguro.
--   - `product_identifiers` e `catalog_pending_reviews` são tabelas novas
--     e aditivas — DROP TABLE em qualquer uma não quebra nada fora desta
--     migration.
--   - A única alteração a uma tabela existente é `ALTER TABLE
--     merchant_attribute_patterns ADD COLUMN resolved_value` — uma coluna
--     nova e NULLABLE. Nenhuma linha existente é reescrita, nenhum
--     comportamento de leitura/escrita anterior muda (todo código atual
--     que lê essa tabela ignora colunas desconhecidas).
--   - Nenhuma tabela de Product Identity/Canonical Catalog/Merge Engine é
--     tocada (products/offers/canonical_products/merge_candidates
--     permanecem exatamente como estão).
-- ============================================================
--
-- Contexto: a auditoria de Product Identity (Mission Ω-Identity) e de
-- Normalização (Mission Ω-Data) mediram, contra o catálogo real, que
-- upsertBrand()/upsertCategory() aceitavam qualquer string sem validação,
-- permitindo que "Outros"/"GENERAL"/etc virassem registros permanentes.
-- Esta migration cria a persistência para o Catalog Integrity Firewall:
-- um índice de identificadores confiáveis (EAN/MPN) para resolver marca
-- por evidência determinística, e uma fila auditável de revisão para os
-- casos que nenhuma camada determinística conseguiu confirmar.

-- 1. Extensão de merchant_attribute_patterns (Program Ω, Mission Ω-1) —
--    a mesma tabela já usada para "esta chave bruta representa este
--    conceito" ganha uma coluna para "e o valor correto, aprendido de uma
--    correção humana, é X" — usada por Camada de aprendizado (question 5:
--    "foi aprendida anteriormente?") e pela auto-reparação desta Mission.
ALTER TABLE merchant_attribute_patterns
  ADD COLUMN IF NOT EXISTS resolved_value text;

COMMENT ON COLUMN merchant_attribute_patterns.resolved_value IS
  'Mission Ω-Gatekeeper: quando concept=brand ou concept=category, o valor '
  'canônico correto para este raw_key (ex.: raw_key="Apple Inc" -> '
  'resolved_value="Apple"). NULL para os usos anteriores desta tabela '
  '(mapeamento chave->conceito de especificação), preservados como estavam.';

-- 2. product_identifiers — índice de identificadores fortes (EAN/GTIN/MPN)
--    já extraídos por ProductSignature, associados ao brand_id CONFIRMADO
--    (nunca um brand "pendente"/proibido) do produto onde foram vistos.
--    A Camada 1 do Firewall consulta esta tabela ANTES de qualquer
--    inferência textual — o sinal mais forte disponível, porque um EAN/MPN
--    real não se repete entre produtos de marcas diferentes.
CREATE TABLE IF NOT EXISTS product_identifiers (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  identifier_type   text        NOT NULL CHECK (identifier_type IN ('ean', 'manufacturer_code')),
  identifier_value  text        NOT NULL,
  brand_id          uuid        NOT NULL REFERENCES brands(id),
  created_at        timestamptz NOT NULL DEFAULT now(),

  -- Um produto pode contribuir no máximo um registro por tipo de
  -- identificador — evita duplicar a mesma evidência a cada re-sync.
  UNIQUE (product_id, identifier_type)
);

-- A leitura que justifica esta tabela: "existe algum produto já
-- confirmado com este EAN/MPN?" — chave de busca real do Firewall.
CREATE INDEX IF NOT EXISTS idx_product_identifiers_lookup
  ON product_identifiers (identifier_type, identifier_value);

ALTER TABLE product_identifiers ENABLE ROW LEVEL SECURITY;

-- 3. catalog_pending_reviews — fila auditável de tudo que o Firewall NÃO
--    conseguiu confirmar deterministicamente. Nunca um "Outros"/"GENERAL"
--    silencioso: todo caso fica registrado com os motivos exatos da
--    rejeição, pronto para revisão humana (cuja decisão alimenta de volta
--    merchant_attribute_patterns.resolved_value via auto-reparação).
CREATE TABLE IF NOT EXISTS catalog_pending_reviews (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Null until resolved: the whole point of blocking the write ("Nunca:
  -- Raw Value -> INSERT") is that no product row exists yet for this item.
  product_id          uuid        REFERENCES products(id) ON DELETE CASCADE,
  store_id            uuid        NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  field_type          text        NOT NULL CHECK (field_type IN ('brand', 'category')),
  raw_value           text        NOT NULL,
  reasons             text[]      NOT NULL DEFAULT '{}',
  -- The full NormalizedOffer this review blocked, so resolving it later can
  -- complete the exact same write (product+offer+price_history) without
  -- re-crawling the source page.
  payload             jsonb       NOT NULL,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_value       text,
  resolved_brand_id    uuid        REFERENCES brands(id),
  resolved_category_id uuid        REFERENCES categories(id),
  resolved_by          text,
  resolved_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpr_status ON catalog_pending_reviews (status);
CREATE INDEX IF NOT EXISTS idx_cpr_store_field_value ON catalog_pending_reviews (store_id, field_type, raw_value);

ALTER TABLE catalog_pending_reviews ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role (scripts/API routes
-- autenticadas) — mesmo padrão de merge_candidates/marketplace_memory_facts.
