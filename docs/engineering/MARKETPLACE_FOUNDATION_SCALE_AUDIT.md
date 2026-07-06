# MARKETPLACE_FOUNDATION_SCALE_AUDIT.md

**Criado**: 2026-07-03 (Release 1.8 — Program 0 — Wave 1 — Marketplace Operations Platform, Epic 10)
**Escopo**: auditoria de documentação apenas — nenhum código, migration ou arquitetura foi alterado por este documento. Responde a uma pergunta: o Marketplace Operations Platform (Epics 1-9 desta Wave) está pronto para 100-1.000 lojas, 5 milhões de ofertas, 500 mil produtos e milhões de Buyer Events, sem alterar a arquitetura existente?

## Resposta direta

**Sim, para a faixa 100-1.000 lojas com o volume de catálogo atual (milhares de produtos/ofertas).** Para os patamares superiores da meta (500 mil produtos, 5 milhões de ofertas), dois pontos precisam de atenção — nenhum bloqueador, ambos documentados abaixo com o ponto exato de virada e a mitigação recomendada, sem exigir mudança de arquitetura agora.

## O que foi auditado

Todo serviço novo desta Wave (`src/domains/marketplace-operations/`) que lê tabelas existentes (`stores`, `offers`, `products`, `categories`, `brands`, `connector_sync_runs`, `store_claims`, `buyer_events`, `merchant_trust_events`, `price_history`) foi revisado quanto ao padrão de acesso: computado sob demanda (sem tabela de agregação nova, ADR-034) ou leitura em memória via JavaScript.

## Achado 1 — Agregação por categoria/marca é O(produtos) em memória

`CatalogMetrics.getCategoryCoverage()`/`getBrandCoverage()` (usadas por `MarketplaceCoverageService` e pelo fator "Coverage" do `MarketplaceHealthEngine`) buscam **todos** os `products.category_id`/`products.brand_id` e agrupam em um `Map` no processo Node, em vez de um `GROUP BY` no Postgres.

- **Hoje** (milhares de produtos): irrelevante, poucos milissegundos.
- **Ponto de virada**: a partir de ~50-100 mil produtos, o payload transferido (uma coluna, todas as linhas) e o tempo de agrupamento em JS começam a pesar em uma rota HTTP request/response (sem streaming).
- **Em 500 mil produtos**: uma única coluna de uuid por linha ainda é um payload gerenciável (~15-20MB), mas o padrão deixa de ser o certo — o banco deveria fazer o agrupamento, não o processo Node.
- **Mitigação recomendada, não aplicada agora**: substituir por uma RPC Postgres (`SELECT category_id, count(*) FROM products GROUP BY category_id`) via `client.rpc(...)` ou uma view. Mudança isolada em `CatalogMetrics.ts`, sem alterar o schema nem o contrato dos serviços que a consomem — pode ser feita em qualquer Wave futura sem coordenação.

## Achado 2 — Merchant Priority Engine é 100% compute-on-read, sem tabela

`MerchantPriorityService.listAll()` (Epic 3) busca **todas** as `stores`, `store_claims` aprovadas, `connectors`, `connector_sync_runs` bem-sucedidas, `offers` (com `canonical_product_id`) e `price_history` dos últimos 30 dias, tudo em memória, toda vez que a rota é chamada. Decisão deliberada desta Wave (ver o comentário em `MerchantPriorityService.ts`): evitar uma segunda fonte de verdade persistida que poderia divergir do score mostrado ao vivo.

- **Hoje/100-1.000 lojas**: seguro. O volume relevante não é o número de lojas, é o número de `offers`/`price_history` — em 1.000 lojas com um catálogo de poucos milhares de ofertas cada, ainda é uma leitura de segundos, aceitável para um dashboard interno (não é uma rota pública de alto tráfego).
- **Ponto de virada real**: **5 milhões de ofertas** é o número que importa aqui, não o número de lojas. Buscar 5 milhões de linhas de `offers` (mesmo que só 3 colunas) e todo `price_history` dos últimos 30 dias em uma única requisição HTTP deixa de ser viável — tempo de resposta e memória do processo Node crescem linearmente com o catálogo inteiro, não com o número de lojas que a página realmente precisa mostrar.
- **Mitigação recomendada, não aplicada agora**: quando o catálogo se aproximar de centenas de milhares de ofertas, mover a agregação por loja (contagem de ofertas, canonical-linkage, variação de preço) para `GROUP BY store_id` no Postgres (RPC ou view materializada por loja), mantendo o resultado final — a lista de `MerchantPriorityScore` — ainda computada sob demanda a partir de agregados pré-calculados, não de linhas brutas. Isso preserva a decisão arquitetural ("sem snapshot de prioridade") só torna a *entrada* do cálculo mais barata.

## O que já está pronto, sem ressalva

- **Health Engine** (Epic 2): todos os 8 fatores usam `count: "exact", head: true}` (contagem no banco, sem transferir linhas) ou buscam no máximo 1 linha (`limit(1)`) — nenhum deles cresce com o tamanho do catálogo.
- **Connector Health Engine** (Epic 5): amostra fixa de 20 execuções por conector (`SAMPLE_SIZE`), independente de quantos conectores existem — cresce linearmente só com o número de *conectores* (esperado: dezenas a centenas, não milhões).
- **Metrics** (Epic 6): todas as contagens (`stores`, `products`, `offers`, `canonical_products`, `brands`, `categories`) usam `count: "exact", head: true` — o mesmo padrão já usado em `getStoreCounts`/plataform-health desde Releases anteriores, comprovadamente estável.
- **Alertas** (Epic 8): `marketplace_alerts` é uma tabela pequena por natureza (uma linha por condição detectada, deduplicada por chave) — não cresce com o catálogo.
- **Snapshot diário** (`marketplace_health_snapshots`): uma linha por dia, para sempre — 365 linhas/ano, irrelevante em qualquer escala.

## Índices existentes já suficientes

Nenhum índice novo foi necessário para este domínio além dos dois criados na própria migration (`idx_marketplace_alerts_open_key`, `idx_marketplace_alerts_status_created`). Os índices já existentes em `connector_sync_runs (connector_id, started_at)`, `offers (canonical_product_id)`, `price_history (offer_id, recorded_at)` cobrem as consultas que este domínio faz — nenhuma nova consulta introduzida por esta Wave faz table scan sem índice.

## Conclusão

A arquitetura desta Wave não precisa mudar para suportar 100-1.000 lojas hoje. Os dois achados acima têm gatilho claro (tamanho do catálogo, não número de lojas) e mitigação isolada e não-urgente — nenhum redesenho, só a substituição de uma agregação em memória por uma agregação no banco quando o catálogo justificar o custo de fazer essa mudança antes. Registrado também em `docs/engineering/TECH_DEBT.md`.
