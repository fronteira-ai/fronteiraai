# CONNECTOR_PLATFORM_V2.md
# Connector Platform V2 — Industrialização

**Versão**: 1.0
**Criado**: 2026-07-04 (Release 1.8 — Program A — Wave 5, mandato do CTO: "Architecture Review + Connector Platform V2")
**Status**: Registro da decisão de arquitetura + o que foi de fato construído
**Categoria**: `docs/engineering/` (companion de `CONNECTOR_PLATFORM_ARCHITECTURE_REVIEW.md`, a auditoria que precedeu esta Wave)

---

## 0. Postura desta Wave

O mandato foi explícito: auditar antes de construir, e construir só o que fortalece genuinamente os Assets Estratégicos — "não criar overengineering", "não criar abstrações sem uso". Cada seção abaixo declara, para o objetivo correspondente do brief, um de três vereditos: **já existe** (reaproveitado, não duplicado), **construído nesta Wave** (com a razão concreta), ou **deliberadamente não construído** (com a razão concreta — nunca silenciosamente ignorado).

---

## 1. Mapa de reaproveitamento (nenhuma duplicação)

| Pedido no mandato | Veredito | Onde |
|---|---|---|
| Connector Runtime | **Já existe** | `SyncOrchestrator` + 7 stages (`services/stages/`) — ver §11 para o mapeamento explícito na forma pedida |
| Connector Registry | **Já existia, estendido** | `ConnectorRegistryImpl` — ganhou `findByCapability`/`listMetadata`; queries de status/certificação/métricas viram uma facade separada, não inchaço da classe (ver §2) |
| Connector SDK | **Construído** | `src/domains/connectors/sdk/` — parte movida (código novo desta Release), parte re-exportada (código pré-existente e testado) — ver §3 |
| Capability Matrix | **Construído** | `types/capability.types.ts`, campo obrigatório em `ConnectorMetadata` |
| Certification Framework | **Construído** | `lib/connector-certification-service.ts` — o mesmo agregador cuja ausência foi nomeada em `TECH_DEBT.md` desde a Wave 3 |
| Connector Quality Score | **Construído** | Mesmo arquivo — não um segundo sistema de score |
| Delta Import Engine | **Parcialmente construído** | Lógica de decisão pura (`DeltaImportPlanner`) construída e testada; persistência entre execuções reais não — ver §5 |
| Snapshot Engine | **Já existe, sob outro nome** | `market_changes` (Real-Time Commerce, Wave 2) já É o snapshot-diff de sucessivos estados — ver §6 |
| Connector Metrics/Health | **Já existia** | `ConnectorHealthService` (Program 0 Wave 1) |
| Connector Observability | **Construído** | `lib/connector-observability-service.ts` — compõe Health + Freshness + Volatility, não recomputa nenhum |
| Event-Driven | **Auditado, deliberadamente não reescrito** | Ver §9 |
| Source Discovery (prioridade) | **Já existe como política, formalizada aqui** | Ver §10 |

---

## 2. Connector Registry — por que a facade fica fora da classe

`ConnectorRegistryImpl` (`services/ConnectorRegistry.ts`) permanece um índice em memória puro — `register`/`get`/`list`/`has`/`unregister`, agora também `listMetadata`/`findByCapability`. Deliberadamente **não** ganhou métodos de status/certificação/métricas: essas são dados vivos e persistidos, que exigiriam a classe passar a depender de `IConnectorRepository`/`ConnectorHealthService`/o novo serviço de certificação — todos de fora do domínio ou compondo múltiplos domínios. Misturar isso na classe que hoje é trivialmente testável sem nenhum mock (`ConnectorRegistry.test.ts`) pioraria a testabilidade sem necessidade real.

A pergunta "me dê capability + status + certificação + métricas de todo connector" é respondida por composição, não por uma classe inchada: `ConnectorRegistry.listMetadata()` (capabilities) + `ConnectorHealthService.getSummaries()` (status/métricas) + `ConnectorCertificationService`/`ConnectorObservabilityService` (certificação/observability), todos compostos no lib/ da mesma forma que qualquer dashboard já faz neste código-base. Nenhuma nova classe "God Object" foi criada.

---

## 3. Connector SDK — o que moveu, o que não moveu, e por quê

`src/domains/connectors/sdk/` é a nova superfície única de import para quem constrói um Connector. Duas categorias de módulo, deliberadamente tratadas diferente:

**Fisicamente movidos** (código desta própria Release, zero consumidor pré-existente fora do que já foi atualizado nesta Wave):
- `sdk/fetch/HttpFetchStrategy.ts` (+ `IFetchStrategy.ts`) — veio de `crawler/fetch/`
- `sdk/fetch/RateLimiter.ts` — **novo**: `RateLimitedFetchStrategy`, decorator de `IFetchStrategy` que substitui o `sleep()` inline que o Shopping China tinha antes da Wave 5
- `sdk/sitemap/SitemapCrawler.ts` — veio de `crawler/shared/`, ganhou `collectEntries()` (URL + `lastmod`) para o Delta Import Engine
- `sdk/sitemap/DeltaImportPlanner.ts` — **novo**, lógica pura de decisão (ver §5)
- `sdk/parsing/textParsing.ts` — veio de `crawler/shared/`

**Re-exportados no lugar** (pré-existentes desde Releases anteriores, já testados, já com consumidores reais no caminho atual — mover seria puro churn cosmético):
- `sdk/sitemap` re-exporta `SitemapParser` (`discovery/parsers/`, Release 1.7 Wave 2) — ganhou `extractEntries()` (loc+lastmod pareados corretamente, não dois regex globais independentes que desalinhariam quando só parte das entradas tem `lastmod`)
- `sdk/robots` re-exporta `RobotsParser` (`discovery/parsers/`)
- `sdk/mapping` re-exporta `IFieldMapper`/`CsvFieldMapper`/`JsonFieldMapper` (`mapping/`, Release 1.7 Wave 1)

Todo o Shopping China (`crawler/shoppingchina/`) foi atualizado para importar exclusivamente de `../../sdk` — nenhuma referência ao caminho antigo restou no código de produção.

---

## 4. Capability Matrix

`ConnectorCapabilities` (`types/capability.types.ts`) é um campo **obrigatório** de `ConnectorMetadata` — todo connector, incluindo os 2 de referência (CSV/JSON), declara honestamente o que sua implementação atual entrega. Não é computado a partir de dado observado (isso é Quality Score/Observability) — é uma afirmação estática do autor do connector.

**Achado real ao declarar Shopping China honestamente**: `supportsStock: false`. `detail-parser.ts` grava `inStock: true` fixo — não existe indicador real de estoque na página do produto (comentário já existente no código, de antes desta Wave). Declarar `true` aqui seria exatamente o tipo de "decisão mágica" que o mandato pede para evitar — a Capability Matrix expôs esse gap de forma explícita em vez de escondê-lo atrás de um campo não-preenchido.

Reservado para o Brain (mandato: "O Brain utilizará essas informações futuramente") — **não conectado ao Brain nesta Wave**, não existe consumidor ainda.

---

## 5. Delta Import Engine — o que foi e não foi construído

**Construído**: `DeltaImportPlanner` (`sdk/sitemap/`), lógica pura — dado o `<lastmod>` atual de cada URL do sitemap e um snapshot do que era conhecido antes, decide o que vale a pena buscar. 5 testes cobrindo URL nova, `lastmod` inalterado, `lastmod` avançado, ausência de `lastmod` (sempre busca — sem sinal, não há decisão segura a tomar) e um lote misto.

**Não construído, documentado explicitamente**: persistir "o `lastmod` conhecido da última vez" **entre execuções reais** exige um lugar para guardar isso — uma tabela nova (`connector_url_snapshots` ou similar). Nenhuma migration foi criada nesta Wave (não autorizada). Um cache em memória dentro do próprio connector teria efeito zero em produção — cada invocação do cron da Vercel é um processo novo (serverless), então o cache resetaria a cada execução, e fingir que funciona seria exatamente a "abstração sem uso" que o mandato pede para não criar. Por isso o `DeltaImportPlanner` não foi conectado ao `ShoppingChinaConnector` nesta Wave — construído e testado, pronto para o dia em que a tabela de snapshot existir, sem teatro no meio tempo.

---

## 6. Snapshot Engine — já existe, sob outro nome

O mandato pediu um mecanismo para "comparar estados sucessivos... detectar alterações, calcular volatilidade, detectar desaparecimento/reaparecimento, calcular estabilidade". **Isso já é `market_changes`** (Real-Time Commerce Engine, Wave 2) e os serviços que o consomem: `VolatilityEngine` (volatilidade), `FreshnessEngine` (recência), `StoreUpdateIntelligenceService` (estabilidade de catálogo via taxa de churn). Construir um segundo mecanismo de comparação de estados sucessivos duplicaria exatamente o que a Wave 2 já entregou.

O único item da lista genuinamente não coberto é **"detectar desaparecimento de produtos"** (`ProductRemoved`/`OfferRemoved`) — gap já nomeado em `TECH_DEBT.md` desde a Wave 2/3: exige saber que um sync é exaustivo (cobre 100% do catálogo), o que nenhum `ConnectorMetadata`/`SyncRunOptions` declara hoje. Não resolvido nesta Wave — seria necessário decidir isso por conector (ex.: um sitemap-driven connector com sitemap confirmado completo poderia ativar essa detecção com segurança; um paginado/parcial não poderia), decisão de produto/engenharia que fica para quando um Connector real precisar dela.

---

## 7. Certification Framework + Connector Quality Score

`lib/connector-certification-service.ts` — o agregador cuja ausência foi nomeada like dívida técnica na Wave 3 (`docs/marketplace/Tier1_Merchants.md` §1/§3: "nenhum código foi escrito"). Construído agora porque as tabelas de que depende (`market_changes`, `marketplace_alerts`, `exchange_rates`) só entraram em produção nesta Wave (push feito na Wave 4).

**13 critérios avaliados** (`CertificationReport`), cada um mapeado a um serviço já existente — nenhum Engine novo:

| Critério | Fonte |
|---|---|
| Produtos, Ofertas, Categorias, Marcas, Imagens, Moeda | Query direta em `offers`/`products` por loja (`fetchStoreOfferCatalog`, compartilhada com Observability) |
| Atualização (Freshness) | `StoreUpdateIntelligenceService` (realtime-commerce) |
| Canonical Match | Mesma query direta — `offers.canonical_product_id` |
| Exchange | `AutomaticCurrencyService.convert()` (exchange) — tentativa real de conversão, não um booleano fabricado |
| Marketplace Operations | `MarketplaceAlertService.list()` (marketplace-operations) — sem alerta aberto para a loja/conector |
| Analytics, Brain | **Não avaliados** (`passed: null`, nunca `false`) — ver §8 abaixo, mesmo motivo |
| Change Detection | `market_changes` tem ao menos 1 linha para a loja nos últimos 30 dias (realtime-commerce) |

`certified` só é `true` quando **todo critério avaliado** passou — uma loja sem merchant vinculado ainda pode certificar nos 11 critérios avaliáveis; Analytics/Brain aparecem como "não avaliado", nunca contam contra a certificação nem são escondidos.

**Connector Quality Score** = média de 4 fatores, todos já existentes: Reliability (`ConnectorHealthService.healthScore`), Completeness (`getHealthBreakdown().health_score`, catalog-intelligence), Canonical Match (%), Freshness (`avgFreshnessScore`). Formato do exemplo do mandato ("97/100") preservado — número único, fatores auditáveis por trás.

---

## 8. Por que Analytics e Brain não são avaliados

Idêntico ao achado já documentado desde o Program 0 Wave 0: `buyer_events`/eventos do Brain são ancorados em `merchant_id`, e a maioria das lojas Tier 1 (todas as 10 auditadas na Wave 3) **não tem merchant reivindicado ainda** — não é possível avaliar "este connector alimenta Analytics/Brain corretamente" para uma entidade que estruturalmente não pode alimentá-los hoje. Reportar `false` seria descrever um vínculo ausente como uma verificação que falhou — desonesto. `passed: null` é a resposta correta, e o Certification Framework foi desenhado desde o início para diferenciar os dois (`boolean | null`, nunca coagido).

---

## 9. Event-Driven — auditado, deliberadamente não reescrito

**Estado real**: `SyncOrchestrator` chama `EventService.recordEvent(...)` diretamente (acoplamento direto a `trust/`) e `MarketChangeDetectionStage` chama `ChangeDetectionService.detectAndRecord(...)` diretamente (acoplamento direto a `realtime-commerce/`, via injeção no `PipelineContext`). Nenhum barramento de eventos existe.

**Por que não construir um agora**: o número de consumidores de "um sync terminou" é pequeno e estável (2 — Brain e Real-Time Commerce) e **não cresce com o número de merchants** — cresce apenas se um domínio novo precisar reagir a syncs no futuro, o que não é o caso hoje. Um barramento pub-sub genérico para 2 assinantes fixos é exatamente a abstração sem aplicação prática que o mandato pede para evitar. A injeção via `PipelineContext` (usada por `ProductIdentityShadowStage`/`MarketChangeDetectionStage`) já é um seam trocável — um "modo de acoplamento fraco" suficiente sem o custo de uma reescrita para mensageria real.

**Recomendação, não implementação**: se um terceiro domínio precisar reagir a "sync completou" no futuro, esse é o momento certo de reconsiderar — não antes.

---

## 10. Source Discovery — prioridade formalizada

O mandato pediu uma ordem: API oficial → API de parceiro → Feed oficial → Sitemap XML → Structured Data → HTML público — e proibiu explicitamente qualquer mecanismo que contorne Cloudflare/robots.txt/autenticação/anti-bot.

Essa prioridade **já existe como política real**, não precisa de código novo: é exatamente o que `Integration Strategy` (`docs/marketplace/Tier1_Merchants.md`, Wave 3) já codifica por loja — `Public Connector` (sitemap/HTML público, os 4 de hoje: Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect) vs. `Data Partnership` (API/feed oficial, os 4 bloqueados: Cellshop, Nissei, Casa Americana, New Zone) vs. `Pending Decision` (Mobile Zone/Visão VIP, spike técnico). A ordem de prioridade do mandato é a razão de ser desse campo — formalizada aqui, não reimplementada.

---

## 11. Connector Runtime — mapeamento explícito

O pipeline pedido (`Discovery → Fetch → Parse → Normalize → Canonical Match → Offer Builder → Marketplace Publisher → Analytics Publisher → Brain Publisher`) já existe, com nomes e fronteiras ligeiramente diferentes:

| Pedido no mandato | Implementação real |
|---|---|
| Discovery | `DiscoveryService`/`SitemapDiscoverySource` (só cria a loja — roda antes do pipeline de sync, não dentro dele) |
| Fetch | `IConnector.fetch()` (cada connector) + `sdk/fetch`/`sdk/sitemap` |
| Parse | Lógica própria de cada connector (`detail-parser.ts` etc.) — produz `RawOffer` |
| Normalize | `NormalizationStage` (`OfferNormalizer`) |
| Canonical Match | `ProductIdentityShadowStage` — **Shadow Mode**, nunca aplica automaticamente (decisão permanente desde a Wave 3 do Release 1.7) |
| Offer Builder | `CatalogWriteStage` (upsert de produto/oferta/preço) |
| Marketplace Publisher | Implícito — `CatalogWriteStage` já escreve nas tabelas que `marketplace-operations` lê; não existe (nem precisa existir) uma stage separada de "publicação" |
| Analytics Publisher | **Não existe como stage** — Analytics (merchant-analytics) não tem um ponto de integração com o Connector Platform hoje (mesmo gap do §8) |
| Brain Publisher | `SyncOrchestrator` emite eventos via `EventService` diretamente após o pipeline, condicionado a `merchantId` presente — não uma stage |

Renomear os arquivos reais para bater literalmente com os nomes do mandato não foi feito — mudaria nomes já testados e referenciados em múltiplos lugares sem nenhum ganho funcional. O mapeamento acima é a "tradução", preservado aqui para qualquer autor futuro de Connector.

---

## 12. Preparação para escala (100+ merchants)

O que já sustenta esse volume sem mudança de arquitetura: pipeline fixo por conector (custo por conector, não por merchant agregado), `ConnectorHealthService`/Observability/Certification compute-on-read (sem tabela de agregação que precise recalcular ao adicionar o 101º merchant), Capability Matrix e Registry já suportam descoberta por capability sem depender de import manual espalhado pelo código consumidor (embora o registro em si — `bootstrap.ts` — ainda seja import estático por conector, ver limitação abaixo).

**Limitação real para 100+ merchants, documentada**: `crawler/bootstrap.ts` registra cada connector via *side-effect import* — um arquivo que cresce uma linha por connector. Não é um problema arquitetural (cada linha é O(1), sem acoplamento entre connectors), mas é um arquivo que ficará longo. Alternativas (descoberta dinâmica de diretório) esbarram em uma restrição real do Next.js: imports dinâmicos baseados em varredura de filesystem em tempo de execução não são estaticamente analisáveis pelo bundler, o que quebraria em produção (build da Vercel). Manter `bootstrap.ts` explícito é a decisão correta até esse limite realmente doer — não antes.

---

## 13. Dívida técnica nova desta Wave (ver `TECH_DEBT.md` para o registro formal)

- ~~Persistência do Delta Import Engine (tabela de snapshot de `lastmod`) — não construída, sem migration autorizada.~~ **Resolvido na Wave 6** (Program B — Wave 2) — ver §14.
- `ConnectorCertificationService`/`ConnectorObservabilityService` não têm teste unitário próprio ainda — dependem de múltiplos serviços de domínios diferentes, mockar todos exigiria um esforço de teste desproporcional ao valor nesta Wave; validação real será via certificação de um Connector real quando a implementação for retomada.
- `bootstrap.ts` continua import manual por connector — aceitável até a escala realmente exigir revisitar (ver §12).
- Nenhum novo `BrainAsset`/consumidor real de Capability Matrix existe ainda — reservado, não conectado.

---

## 14. Wave 6 (Program B — Wave 2, Connector Platform Finalization) — o que mudou

Esta Wave resolveu exatamente as duas limitações honestas nomeadas ao final da Wave 5 — nada além disso.

### 14.1 Connector Registry V2

`ConnectorRegistryImpl` em si **não mudou de forma** — continua um índice em memória puro (§2 acima permanece válido). O que a Wave pediu ("consultar merchant/versão/capabilities/status/certificação/health/quality score") é respondido por uma nova facade de composição, `ConnectorDirectoryService` (`lib/connector-directory-service.ts`), exatamente o papel que o comentário do próprio `ConnectorRegistry.ts` já reservava desde a Wave 5 ("`ConnectorDirectoryService` é a facade... ver docs/engineering/CONNECTOR_PLATFORM_V2.md §2").

Duas granularidades deliberadas: `listAll()` (barato — registry + `ConnectorHealthService` + um lookup de `merchant_stores`, seguro de rodar para todo connector de uma vez) e `getDetail(id)` (caro — soma Certification + Quality Score, só para um connector por vez, sob demanda). Nenhuma reflexão dinâmica, nenhum plugin loader, nenhum framework de DI — só composição direta de serviços já existentes, exatamente como pedido.

**Limitação que permanece, por restrição real, não por preguiça**: `crawler/bootstrap.ts` continua registro estático por import — Next.js não permite descoberta dinâmica de diretório em tempo de execução sem quebrar a análise estática do bundler da Vercel (nomeado na Wave 5 §12, reconfirmado aqui). Não é uma "V2" incompleta; é a decisão correta dado o ambiente real de deploy.

### 14.2 Delta Import Persistence

**Migration**: `supabase/migrations/20260704090000_connector_url_snapshots.sql` — uma única tabela, `connector_url_snapshots (connector_id, url, lastmod, last_fetched_at)`, índice único em `(connector_id, url)` para upsert, índice simples em `connector_id` para carregar todos os snapshots de um connector de uma vez. RLS habilitada, sem policy pública — mesmo padrão de `connector_sync_runs`/`market_changes`. **Aplicada em produção nesta sessão** (`npm run db:push`, autorizado pelo CTO).

**Por que não duplica nada existente** (auditado antes de escrever a migration, conforme exigido): `market_changes` (Wave 2) registra o que mudou depois de já comparado — esta tabela registra algo mais barato e anterior, o que o sitemap do próprio parceiro diz que mudou, para decidir se vale buscar o detalhe. `DeduplicationStage.hasChanged()` continua a única fonte de verdade sobre "isso deve ser gravado no banco" — esta tabela só evita o fetch HTTP, nunca substitui essa comparação.

**Estruturas utilizadas**: `IConnectorUrlSnapshotRepository`/`SupabaseConnectorUrlSnapshotRepository` (dentro de `src/domains/connectors/` — ao contrário de Certification/Observability, esta é uma preocupação 100% interna ao Connector Platform, sem cruzar domínios, então não há risco de dependência circular).

**Fluxo de funcionamento real** (`ShoppingChinaConnector.fetch()`):
```
getSnapshotMap(connectorId)          — carrega todos os lastmod conhecidos
      ↓
sitemapCrawler.collectEntries()      — sitemap atual, com lastmod por URL
      ↓
DeltaImportPlanner.plan()             — decide o que buscar vs. pular
      ↓
fetch só do que mudou (ou é novo)     — HTTP real só onde há sinal de mudança
      ↓
saveSnapshots() — SÓ se !dryRun        — grava o lastmod atual de tudo que foi
                                         processado (buscado com sucesso + pulado)
```

**Achado real durante a implementação, corrigido antes de validar**: `IConnector.fetch()` não tinha como saber se a sincronização era dry-run — `ManualSyncTrigger` só passa `dryRun` para o `SyncOrchestrator`, nunca para o `fetch()` do connector. Gravar o snapshot incondicionalmente dentro de `fetch()` teria violado a invariante "dry-run nunca escreve" que `CatalogWriteStage`/`MarketChangeDetectionStage` já garantem. Corrigido com uma mudança mínima e aditiva: `IConnector.fetch(options?: ConnectorFetchOptions)` — parâmetro opcional, nenhum connector existente (incluindo os 2 de referência) precisou mudar.

**Validado com execução real, não apenas dry-run**: 1ª sincronização real (`--execute`, 3 produtos) gravou 3 linhas reais em `products`/`offers` + 6 eventos em `market_changes`. 2ª sincronização (dry-run) confirmou exatamente **3 URLs puladas** (as mesmas 3 recém-sincronizadas) de 27.418 totais — o Delta Import Engine está genuinamente operacional em produção, não apenas testado em memória.

### 14.3 Observability V2

`ConnectorObservabilitySnapshot` ganhou: `productsProcessedLastSync`/`failuresLastSync` (do `connector_sync_runs.totals` mais recente, não a amostra agregada que `ConnectorHealthService` já usa), `productsChanged`/`offersChanged` (contagem de entidades distintas em `market_changes` numa janela de 24h — nova constante `CHANGE_WINDOW_HOURS`, não um cálculo "desde o último sync bem-sucedido" para manter simplicidade entre conectores de cadência muito diferente), `qualityScore` (repete o mesmo número de `ConnectorCertificationService.computeQualityScore`, para quem só chama Observability não precisar de uma segunda chamada). Nenhuma tabela nova para isso — tudo já existia em `connector_sync_runs`/`market_changes`, só não estava composto num único lugar. `retryCount` permanece `null` — continua não existindo nenhum contador persistido de retries.

### 14.4 Source Discovery Policy

Formalizada em `docs/engineering/SOURCE_DISCOVERY_POLICY.md` — documento novo, dedicado (não apenas uma seção aqui), porque é uma política permanente e proibitiva (o que nunca fazer), categoricamente diferente de um registro de decisões de arquitetura já tomadas.

### 14.5 Governança — inconsistências encontradas e corrigidas

- `sdk/fetch/RateLimiter.ts` exportava `RateLimitedFetchStrategy` — nome de arquivo não batia com o nome da classe, quebrando a convenção já estabelecida no mesmo diretório (`HttpFetchStrategy.ts` exporta `HttpFetchStrategy`). Renomeado para `RateLimitedFetchStrategy.ts` (arquivo de teste também renomeado). Baixo risco: introduzido na própria Wave 5, só 2 consumidores.
- Auditoria de direção de dependência (`grep` de imports de `marketplace-operations`/`catalog-intelligence`/`exchange`/`merchant-ownership` dentro de `connectors/`) confirmou **zero violações** — `connectors/` continua sem depender de nenhum domínio além de `product-identity`/`realtime-commerce`, exatamente como documentado desde a Wave 2.
- `ConnectorRegistryImpl.ts` (nome de arquivo) exporta `ConnectorRegistryImpl` (nome de classe) mas é importado como `connectorRegistry` (instância) na maioria dos consumidores — inconsistência pré-existente desde o Release 1.7, **não corrigida**: renomear tocaria dezenas de imports estabelecidos para um ganho puramente cosmético, contra a instrução explícita desta Wave de "não alterar comportamento funcional sem necessidade".

### 14.6 Preparação para escala — revalidada

Nada mudou na conclusão da Wave 5 (§12) — a única adição real desta Wave (`connector_url_snapshots`) escala pelo mesmo motivo que `connector_sync_runs` já escala: uma linha por (connector, URL), upsert, dois índices simples, sem agregação recalculada globalmente. Delta Import, quando adotado por mais conectores, **reduz** custo de rede por sync (menos fetches, não mais) — o oposto de um gargalo novo.

### 14.7 Dívida técnica nova desta Wave

- `productsChanged`/`offersChanged` usam uma janela fixa de 24h — não "desde o último sync bem-sucedido" (exigiria cruzar timestamps entre `connector_sync_runs` e `market_changes` por conector, complexidade não justificada para um número que já é um sinal, não uma auditoria).
- `ConnectorDirectoryService.listAll()` chama `connectorRepo.findByKey()` uma vez por connector (não em lote) — aceitável para 1 connector real hoje, precisa virar uma query em lote (`findByKeys(ids[])`, método novo em `IConnectorRepository`) antes de centenas de merchants tornarem isso um N+1 real.
