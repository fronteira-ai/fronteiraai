-- PROPOSTA DE MIGRATION — NÃO APLICADA
--
-- Gerada na Sprint 3.9 (Price Engine v1), implementando o schema descrito
-- na arquitetura proposta na Sprint 3.7 (ADR-013). Ver docs/DECISIONS.md
-- ADR-017 para a decisão completa.
--
-- Bloqueio conhecido (ADR-017): nenhuma ferramenta disponível neste projeto
-- executa DDL contra o Supabase — `@supabase/supabase-js`/PostgREST só fazem
-- CRUD via REST, não há `pg`/Postgres connection string em `.env.local`, não
-- há Supabase CLI configurado (sem pasta `.supabase/`), e não existe nenhuma
-- RPC já exposta para rodar SQL arbitrário (confirmado lendo o OpenAPI do
-- PostgREST). Aplicar esta migration exige uma ação humana no SQL Editor do
-- painel do Supabase (ou configurar a CLI/conexão direta numa sprint futura).
--
-- Depois de aplicada, nenhuma mudança de código é necessária —
-- `services/offer.service.ts` (`updateOfferPrice`/`getOfferPriceMetrics`)
-- já está escrito contra este schema exato.

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
