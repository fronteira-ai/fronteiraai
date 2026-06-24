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
