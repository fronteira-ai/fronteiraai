-- ─────────────────────────────────────────────────────────────────────────────
-- Mission 05.31 — PROPOSTA (NÃO APLICADA) de modelo para o dólar comercial de
-- Ciudad del Este, por loja, com origem explícita e condições de pagamento.
--
-- ⚠️ NÃO EXECUTAR em produção nesta missão: a diretriz do CEO autoriza apenas
-- branch isolada, testes e relatório. Este arquivo é o artefato de desenho.
--
-- PROBLEMA ATUAL (medido): só existem taxas de MERCADO INTERNACIONAL
-- (`exchange_rates`: USD/PYG, USD/BRL, BRL/PYG, source=keyless-open-er-api), e
-- `app/termos/page.tsx:88` já declara que elas "não representam o valor
-- efetivamente cobrado por qualquer meio de [pagamento]". A diretriz determina
-- que o câmbio reflita **exclusivamente o dólar usado nas compras em Ciudad del
-- Este**, com prioridade para Cellshop e Shopping China, e que a cotação
-- internacional NUNCA seja substituída em silêncio.
--
-- DESENHO: separar "referência de mercado" de "cotação comercial observada".
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Cotação comercial observada (uma linha por loja + forma de pagamento).
--    `kind` distingue o que é cotação CONFIRMADA da loja do que é apenas
--    referência comparativa (ex.: a Vertex informou R$ 5,12 — é referência, não
--    cotação confirmada das lojas prioritárias).
CREATE TABLE IF NOT EXISTS public.store_exchange_quotes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  pair            text NOT NULL,                       -- 'USD/BRL' | 'USD/PYG'
  rate            numeric(18, 6) NOT NULL,
  payment_method  text NOT NULL DEFAULT 'unspecified', -- 'cash' | 'pix' | 'card' | 'unspecified'
  kind            text NOT NULL DEFAULT 'reference',   -- 'confirmed' | 'reference'
  source_channel  text NOT NULL,                       -- 'site' | 'instagram' | 'whatsapp' | 'in_store' | 'phone'
  source_url      text,                                -- URL/canal oficial consultado
  verified_by     text,                                -- quem confirmou (humano/merchant)
  observed_at     timestamptz NOT NULL DEFAULT now(),
  notes           text,
  CONSTRAINT store_exchange_quotes_kind_chk  CHECK (kind IN ('confirmed','reference')),
  CONSTRAINT store_exchange_quotes_pay_chk   CHECK (payment_method IN ('cash','pix','card','unspecified')),
  CONSTRAINT store_exchange_quotes_rate_chk  CHECK (rate > 0)
);

CREATE INDEX IF NOT EXISTS store_exchange_quotes_store_observed_idx
  ON public.store_exchange_quotes (store_id, pair, observed_at DESC);

-- 2) A cotação de MERCADO deixa de ser confundível com a comercial: cada linha
--    ganha procedência explícita. As linhas existentes passam a 'international'.
ALTER TABLE public.exchange_rates
  ADD COLUMN IF NOT EXISTS quote_kind text NOT NULL DEFAULT 'international';

ALTER TABLE public.exchange_rates
  ADD CONSTRAINT exchange_rates_quote_kind_chk
  CHECK (quote_kind IN ('international','commercial_reference'));

-- 3) Política de exibição (invariante de produto, não do banco):
--    • Homepage  → referência comercial identificada (a melhor 'confirmed'
--                  entre as lojas prioritárias: Cellshop, Shopping China) e,
--                  enquanto não houver nenhuma, NADA é exibido — jamais a
--                  cotação internacional rotulada como comercial.
--    • Ofertas   → taxa individual da loja (`store_exchange_quotes`, casando a
--                  forma de pagamento quando conhecida) e, na ausência dela,
--                  a taxa comercial geral MARCADA como referência.
--    • Internacional → só como comparação explícita ("referência de mercado"),
--                  nunca como substituta silenciosa.
--
-- ROLLBACK (se aplicado no futuro):
--   DROP TABLE public.store_exchange_quotes;
--   ALTER TABLE public.exchange_rates DROP CONSTRAINT exchange_rates_quote_kind_chk;
--   ALTER TABLE public.exchange_rates DROP COLUMN quote_kind;
