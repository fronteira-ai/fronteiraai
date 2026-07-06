-- ============================================================
-- connector_url_snapshots (Release 1.8 — Program B — Wave 2, Connector
-- Platform Finalization)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: Possible — nenhuma outra tabela referencia esta; removível sem
--   perda de dado de catálogo real (o pior caso de apagar esta tabela é o
--   Delta Import Engine voltar a buscar tudo a cada sync, nunca uma
--   inconsistência de dado).
-- Depends on: nenhuma — tabela nova, sem FK para tabelas existentes
--   (connector_id é o `metadata.id` do `IConnector`, texto livre, o mesmo
--   identificador já usado em `connector_sync_runs.connector_key`, nunca
--   uma FK para `connectors.id` — um Connector pode não ter linha em
--   `connectors` ainda na primeira execução).
-- ============================================================
--
-- Cria:
-- 1. connector_url_snapshots — o único dado que faltava para o Delta Import
--    Engine (`src/domains/connectors/sdk/sitemap/DeltaImportPlanner.ts`,
--    Wave 5) operar de verdade em produção: "qual era o <lastmod> conhecido
--    da última vez que vimos esta URL". Sem isso, todo sync refaz o fetch
--    de detalhe de cada produto, mesmo quando nada mudou.
--
-- PRINCÍPIO — por que esta tabela NÃO duplica nada já existente:
-- `market_changes` (Real-Time Commerce, Wave 2) registra o que mudou DEPOIS
-- de já ter sido buscado e comparado — é о ledger de mudanças de mercado.
-- Esta tabela registra uma coisa mais barata e anterior a isso: o que o
-- PRÓPRIO SITE do parceiro diz que mudou (via <lastmod> do sitemap), para
-- decidir se vale a pena buscar o detalhe antes de gastar uma requisição
-- HTTP. `DeduplicationStage.hasChanged()` já decide se um preço/estoque/
-- descrição/imagem mudou o suficiente para gravar no banco — isso continua
-- inalterado; esta tabela só evita o fetch, nunca substitui essa comparação.
--
-- Verificação: database/verification/connector_url_snapshots_verify.sql —
-- nunca embutida aqui, nunca executada automaticamente. Health check
-- genérico (database/health_checks/rls.sql etc.) já cobre esta tabela
-- automaticamente — nenhum health check novo por tabela é necessário.
-- ============================================================

CREATE TABLE IF NOT EXISTS connector_url_snapshots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id    text        NOT NULL,
  url             text        NOT NULL,
  lastmod         text        NOT NULL,
  last_fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Upsert-by-(connector_id, url) é o único padrão de escrita desta tabela —
-- um connector nunca acumula histórico de lastmod por URL, só o mais recente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_url_snapshots_connector_url
  ON connector_url_snapshots (connector_id, url);

-- Leitura em massa por connector — o Delta Import Engine carrega todos os
-- snapshots conhecidos de um connector de uma vez (um Map em memória), nunca
-- um SELECT por URL individual.
CREATE INDEX IF NOT EXISTS idx_connector_url_snapshots_connector_id
  ON connector_url_snapshots (connector_id);

ALTER TABLE connector_url_snapshots ENABLE ROW LEVEL SECURITY;
-- Leitura/escrita exclusivamente via service_role — mesmo padrão de
-- connector_sync_runs/market_changes. Nenhuma policy pública: esta tabela
-- não é consumida por nenhuma rota pública, só pelo próprio Connector
-- Platform no momento do fetch.
