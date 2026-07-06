# CONNECTOR_PLATFORM_ARCHITECTURE_REVIEW.md
# Revisão de Arquitetura — Connector Platform

**Versão**: 1.0
**Criado**: 2026-07-04 (Release 1.8 — Program A — Wave 4, pausada pelo CTO para esta revisão antes de implementar novos Connectors Tier 1)
**Status**: Fotografia real do código, lida por leitura completa de todo `src/domains/connectors/` — não uma descrição aspiracional
**Categoria**: `docs/engineering/` (junto de `CONNECTOR_GUIDE.md`, que explica *como* criar um Connector; este documento explica *o que existe hoje e por quê*)

---

## 0. Por que este documento existe agora

Esta Wave começou implementando a recertificação do Shopping China (sitemap real em vez de 3 categorias hardcoded) e retry/backoff em `HttpFetchStrategy` — ambos concluídos e validados (dry-run real contra o site ao vivo, Quality Gate verde). O CTO então pausou a implementação dos 3 novos Connectors (Mega Eletrônicos, Roma Shopping, Atacado Connect) para exigir esta revisão de arquitetura primeiro. Este documento é essa revisão: o estado real, completo e verificado do Connector Platform, para que qualquer decisão sobre os próximos Connectors seja tomada com o quadro inteiro visível, não descoberto incrementalmente conector por conector.

---

## 1. O que foi concluído nesta Wave (2026-07-04)

- **Shopping China recertificado** (`src/domains/connectors/crawler/shoppingchina/`): descoberta de produto migrada de 3 categorias hardcoded + corte fixo de 10 produtos/categoria para o sitemap real da loja (`https://www.shoppingchina.com.py/sitemap.xml`, confirmado ao vivo: **27.402 URLs de produto** reais). `listing-parser.ts` deixou de fazer scraping de página de listagem — agora só extrai `slug`/`externalId` de uma URL de produto já vinda do sitemap. `detail-parser.ts` mantido (já funcional), refatorado para reaproveitar `parseAmount`/`cleanText` do novo módulo compartilhado em vez de duplicar a lógica inline.
- **`HttpFetchStrategy` ganhou retry/backoff** (`crawler/fetch/HttpFetchStrategy.ts`) — mesma política linear de `ExchangeRateApiHttpClient.fetchJson` (2 retries, backoff linear, retry em 5xx/429). Fecha o gap nomeado em `TECH_DEBT.md` (Wave 3): todo Connector sitemap-driven futuro herda esta resiliência automaticamente, sem precisar reimplementar por conector.
- **Dois módulos novos compartilhados** (`crawler/shared/`), pensados desde já para serem reaproveitados pelos próximos Connectors sitemap-driven, não só pelo Shopping China:
  - `SitemapCrawler.ts` — anda um `sitemap.xml`/`sitemap_index.xml`, recursa em sub-sitemaps até uma profundidade máxima (evita loop em feed malformado), filtra URLs por predicado. Reaproveita `SitemapParser` (`discovery/parsers/`, já existente desde a Wave 2 do Release 1.7) em vez de um segundo parser de XML.
  - `textParsing.ts` — `parseAmount` (formato "1.234.567"/"13,00" da região), `cleanText`, `findFirstCurrencyAmount` (varre texto livre por U$/Gs./R$ em ordem de prioridade).
- **Validado com dado real, não mockado**: dry-run rodado contra `shoppingchina.com.py` ao vivo (`npm run sync:shoppingchina`), sitemap real buscado, 5 produtos reais buscados/parseados/validados/normalizados/deduplicados com sucesso através do pipeline completo.
- **Quality Gate**: lint 0, typecheck 0, build OK, 452/452 testes (nenhum teste novo ainda para os módulos compartilhados — ver §9), `db:lint` OK. Migrations das Waves 1-3 (`marketplace_operations`, `exchange_intelligence`, `realtime_commerce`) **aplicadas em produção nesta sessão** (`npm run db:push`, autorizado pelo CTO) — pré-requisito que faltava para qualquer Connector poder provar Change Detection/Exchange/Marketplace Operations.

**Não implementado, pausado por decisão do CTO**: Mega Eletrônicos, Roma Shopping, Atacado Connect (novos Connectors) e o spike de confirmação técnica de Mobile Zone/Visão VIP (já resolvido informalmente nesta sessão — ver §10 — mas nenhum código escrito para eles).

---

## 2. Arquitetura em camadas

```
IConnector (contrato)
      │
      │ .fetch() → ConnectorBatch { items: RawOffer[] }
      ▼
SyncOrchestrator.run(metadata, items, options)
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Pipeline (ordem fixa, um PipelineContext atravessa tudo)        │
│                                                                   │
│  1. ValidationStage          — RawOffer → aceito/rejeitado        │
│  2. NormalizationStage       — RawOffer → NormalizedOffer         │
│  3. DeduplicationStage       — new/update/skip + existingSnapshot │
│  4. ProductIdentityShadowStage — shadow-mode, nunca altera catálogo│
│  5. MediaStage (opcional)    — download+webp+upload para Storage │
│  6. CatalogWriteStage        — upsert real em products/offers    │
│  7. MarketChangeDetectionStage — detecta e grava em market_changes│
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
SyncRun persistido (connector_sync_runs) + Brain events (se merchantId)
```

**Direção de dependência (nunca invertida)**: `connectors/` depende de `product-identity/` (Core Asset, Release 1.7 Wave 3) e de `realtime-commerce/` (Core Asset, Program A Wave 2) — nunca o contrário. `connectors/` nunca depende de `trust/` diretamente — emissão de eventos Brain acontece via `EventService` injetado, chamado pelo próprio `SyncOrchestrator`, não por uma stage.

---

## 3. Estrutura de diretórios (completa, lida em 2026-07-04)

```
src/domains/connectors/
├── index.ts                        # barrel público do domínio
├── crawler/
│   ├── bootstrap.ts                 # importa todo connector p/ auto-registro
│   ├── fetch/
│   │   ├── IFetchStrategy.ts        # contrato + FetchOptions (retries, retryDelayMs)
│   │   ├── HttpFetchStrategy.ts     # impl. real, com retry/backoff (Wave 4)
│   │   └── index.ts
│   ├── shared/                      # NOVO nesta Wave — reaproveitável por qualquer connector sitemap-driven
│   │   ├── SitemapCrawler.ts
│   │   └── textParsing.ts
│   ├── reference/                   # connectors de exemplo/dry-run, não produção
│   │   ├── CsvFileConnector.ts
│   │   └── JsonFileConnector.ts
│   └── shoppingchina/                # único connector de produção hoje
│       ├── config.ts
│       ├── connector.ts
│       ├── listing-parser.ts         # Wave 4: parse de URL, não mais de HTML de listagem
│       ├── detail-parser.ts
│       └── index.ts
├── discovery/                        # descoberta de LOJAS novas — não de produtos
│   ├── parsers/{RobotsParser,SitemapParser}.ts
│   ├── services/{DiscoveryService,SitemapDiscoverySource}.ts
│   └── types/discovery.types.ts
├── domain/{Connector,SyncRun}.ts
├── events/connector.events.ts
├── mapping/{IFieldMapper,CsvFieldMapper,JsonFieldMapper}.ts
├── normalization/OfferNormalizer.ts
├── repositories/{ICatalogRepository,IConnectorRepository,ISyncRunRepository}.ts
├── infrastructure/Supabase{Catalog,Connector,SyncRun}Repository.ts
├── scheduler/{ISyncScheduler,VercelCronScheduler,ManualSyncTrigger}.ts
├── services/
│   ├── ConnectorRegistry.ts
│   ├── ConnectorHealthService.ts
│   ├── SyncOrchestrator.ts
│   ├── metrics.ts
│   └── stages/{Validation,Normalization,Deduplication,ProductIdentityShadow,Media,CatalogWrite,MarketChangeDetection}Stage.ts + ISyncStage.ts
├── types/{connector,enums,index,pipeline,raw,validation}.types.ts
└── __tests__/ (10 arquivos — ver §9)
```

---

## 4. O contrato central — `IConnector`

```ts
interface ConnectorMetadata {
  id: string; name: string; version: string;
  type: ConnectorType; storeSlug: string; description?: string;
}

interface IConnector {
  readonly metadata: ConnectorMetadata;
  fetch(): Promise<ConnectorBatch>;   // ConnectorBatch = { connectorId, connectorVersion, fetchedAt, items: RawOffer[] }
}
```

Qualquer fonte de dado — HTML raspado, arquivo CSV/JSON, chamada de API REST, feed de parceiro — só precisa satisfazer este contrato. `ConnectorType` (`enums.ts`) já modela `JsonFile | CsvFile | ApiRest | XmlFile | Erp | ManualUpload | Crawler` — 6 dos formatos de integração que o Merchant Partnership Program (`docs/business/MERCHANT_PARTNERSHIP_PROGRAM.md`) precisará no futuro já existem aqui, sem nenhuma mudança de arquitetura.

`RawOffer`/`RawProduct` (`types/raw.types.ts`) são o formato universal de saída — todo parser de todo connector converge para essas duas interfaces antes de entrar no pipeline.

---

## 5. O pipeline, estágio por estágio

| # | Stage | O que faz | Falha de item | Falha em massa |
|---|---|---|---|---|
| 1 | `ValidationStage` | Valida `product.name`, `storeSlug` (slug válido), `priceUSD` (>0, numérico); warnings para `brand`/`category`/`inStock` ausentes (mapeados a default, não rejeitados) | Rejeitado, registrado em `ctx.errors`, excluído do restante do pipeline | N/A — item a item |
| 2 | `NormalizationStage` | `RawOffer` → `NormalizedOffer` (slugs gerados, moeda default `"USD"` se ausente) | `try/catch` por item, erro registrado | N/A |
| 3 | `DeduplicationStage` | Resolve `existingProductId`/`existingOfferId` via slug+loja; compara preço/estoque/descrição/imagem para decidir `new`/`update`/`skip`; **Wave 2 (Real-Time Commerce)**: carrega `existingSnapshot` para a stage seguinte usar | Erro → `skip`, contabilizado | Falha ao resolver `storeId` → item vira `"new"` sem `existingProductId` (a loja precisa já existir — nunca criada aqui, ver §7) |
| 4 | `ProductIdentityShadowStage` | Avalia correspondência de identidade de produto (Shadow Mode — nunca altera o catálogo real) para itens `"new"` | Erro capturado, nunca propaga | Nenhuma — puramente observacional |
| 5 | `MediaStage` (pulável via `skipMedia`) | Baixa imagem, converte para WebP (se `sharp` disponível), sobe para o bucket `catalog` do Supabase Storage. Em dry-run, só resolve a URL sem baixar | Erro → `resolvedImageUrl: null`, não bloqueia o item | N/A |
| 6 | `CatalogWriteStage` | Upsert real de brand/categoria/produto/offer + `price_history`. Em dry-run, **nada é escrito** — todos os itens ficam `"skipped"` | Exceção capturada, marcado `"error"` | N/A |
| 7 | `MarketChangeDetectionStage` | **Novo na Wave 2.** Compara `existingSnapshot` (Stage 3) com o estado pós-escrita, grava em `market_changes` via `ChangeDetectionService` | Erro capturado por item, nunca derruba o sync do catálogo | Pulada inteiramente em dry-run |

Todo estágio implementa `ISyncStage` (`name: string`, `execute(ctx): Promise<PipelineContext>`), recebe e devolve o mesmo `PipelineContext` — isso é o que torna a ordem trocável/testável isoladamente (cada stage tem seu próprio arquivo de teste, ver §9).

---

## 6. Componentes compartilhados e reutilizáveis (o que qualquer Connector novo deve reaproveitar, nunca duplicar)

| Componente | Reaproveita | Não reaproveita (armadilha comum) |
|---|---|---|
| `HttpFetchStrategy` | Toda busca HTTP de HTML — timeout, retry/backoff, user-agent | Não serve para JSON de API (ver `ExchangeRateApiHttpClient`, propositalmente um cliente separado) nem para conteúdo que exige JS (ver §10) |
| `SitemapCrawler` (novo) | Descoberta de URLs de produto para qualquer connector sitemap-driven | Não deduplica URLs entre sitemaps diferentes de domínios diferentes — cada `collectUrls()` é por sitemap |
| `SitemapParser`/`RobotsParser` (`discovery/parsers/`) | Parsing de XML de sitemap e regras de robots.txt — usado tanto por Discovery (lojas novas) quanto agora por Crawling (produtos) | Nomeado como Discovery, mas genérico — qualquer código futuro que precise ler robots.txt/sitemap deve importar daqui, nunca reimplementar regex de `<loc>` |
| `textParsing.ts` (novo) | Parsing de preço/moeda em texto livre no padrão da região (`.` milhar, `,` decimal; prefixos U$/Gs./R$) | Não cobre formatos fora do padrão da região (ex.: um parceiro que envie `1,234.56` no padrão americano precisaria de uma função própria) |
| `OfferNormalizer` | Todo connector, sem exceção — nunca reimplementar geração de slug/normalização de moeda | — |
| `ValidationStage`/`validateOffer` | Toda validação de `RawOffer`, mesmas regras para todo connector | — |
| `IFieldMapper` (`CsvFieldMapper`/`JsonFieldMapper`) | Qualquer fonte estruturada (CSV/JSON) — inclusive um futuro feed de parceiro no mesmo formato | Não serve para HTML — isso é papel do `IFetchStrategy` + um parser dedicado |
| `ConnectorHealthService` | Health Score de qualquer connector, incluindo Shopping China recertificado | Não recomputa nada — lê de `connector_sync_runs`, já escrito pelo `SyncOrchestrator` |
| `SyncOrchestrator` + os 7 stages | **Todo** connector entra exatamente no mesmo pipeline — isso é estrutural, não uma convenção que um novo connector poderia contornar (`ManualSyncTrigger`/o cron route não têm um caminho alternativo) | — |

---

## 7. Regra estrutural que nenhum Connector pode violar

`CatalogWriteStage`/`ICatalogRepository.findStoreIdBySlug` **nunca cria uma loja** — se a loja não existir, o item falha com `store not found: {slug}`. A única exceção autorizada é `DiscoveryService` (`discovery/services/DiscoveryService.ts`), que cria uma linha em `stores` diretamente via `SupabaseClient`, **sem passar por `ICatalogRepository`** — isso é deliberado, não um vazamento de camada: mantém a garantia de `CatalogWriteStage` intacta para todo connector regular (JSON/CSV/ShoppingChina/futuro api-rest), e restringe "criar loja do zero" a um único ponto auditável.

Consequência prática para os próximos Connectors: **Mega Eletrônicos, Roma Shopping e Atacado Connect precisam de uma linha em `stores` já existente** antes do primeiro sync — ou via Discovery (se ainda não descobertas) ou via inserção manual/seed. Nenhum dos 3 tem uma linha confirmada em produção hoje (achado da auditoria Wave 3 — `docs/marketplace/Tier1_Merchants.md` §5 não confirma `stores` row para eles, só para Shopping China/Cellshop/Nissei/Mega Eletrônicos/Atacado Games via `database/seed/stores/data.js`, embora sem connector real associado).

---

## 8. Integrações cross-domain já reais (não hipotéticas)

- **Product Identity** (Core Asset, Release 1.7 Wave 3): `ProductIdentityShadowStage` chama `ctx.productIdentityService.evaluateAndLog(...)` para todo item `"new"` — shadow mode, nunca reatribui.
- **Real-Time Commerce** (Core Asset, Program A Wave 2): `MarketChangeDetectionStage` chama `ctx.changeDetectionService.detectAndRecord(...)` — agora com as tabelas reais em produção (`market_changes` etc., aplicadas nesta Wave).
- **Marketplace Operations** (Program 0 Wave 1): `ConnectorHealthService` é chamado tanto pelo Ecosystem Monitor (`app/api/admin/monitor/summary/route.ts`) quanto por `app/api/admin/marketplace-operations/connectors/route.ts` — uma implementação, dois consumidores, sem duplicação.
- **Trust/Brain**: `SyncOrchestrator` emite `connectorSyncStarted/Completed/Failed` via `EventService`, mas **só quando `merchantId` é fornecido** (sync disparado por merchant, não admin/cron global) — mesma limitação documentada desde o Release 1.7 Epic 1.
- **Exchange Intelligence**: integração é indireta — `offers.currency` (escrito por qualquer connector via `OfferNormalizer`) é o que `AutomaticCurrencyService` lê depois, sob demanda. Nenhum connector chama Exchange diretamente.
- **Canonical Catalog**: não integrado na pipeline em si — Canonical Match acontece por um processo separado (`CanonicalProductService.bootstrapFromProduct`, `product-identity`'s `CanonicalMergeSuggestionService`), não uma stage do Connector Platform.

---

## 9. Cobertura de testes real (10 arquivos, todos em `__tests__/`)

`ValidationStage`, `DeduplicationStage`, `CatalogWriteStage`, `SyncOrchestrator` (4 cenários incl. stage-order e dry-run), `ConnectorRegistry`, `ConnectorHealthService`, `CsvFieldMapper`, `JsonFieldMapper`, `OfferNormalizer`, `HttpFetchStrategy` (3 cenários, agora exercitando retry indiretamente — ver §1). Discovery tem sua própria suíte (`discovery/__tests__/`, 3 arquivos).

**Gap real, não corrigido nesta Wave**: `SitemapCrawler` e `textParsing.ts` (os dois módulos novos) **não têm teste próprio ainda** — validados apenas indiretamente pelo dry-run real do Shopping China. `listing-parser.ts`/`detail-parser.ts` do Shopping China também nunca tiveram teste unitário (nem antes desta Wave, nem depois) — certificação até agora depende de dry-run ao vivo, não de suíte automatizada. Registrado em `TECH_DEBT.md`.

---

## 10. Achados relevantes para decidir os próximos Connectors

- **Mobile Zone e Visão VIP são genuinamente CSR** (confirmado nesta sessão, fora do código): `visaovip.com` é Next.js App Router com payload RSC essencialmente vazio (77 bytes de conteúdo real nos chunks `self.__next_f.push`); `mobilezone.com.py` é uma SPA React pura (`<div id="root">`, 2688 bytes, zero conteúdo server-rendered). **Nenhum `IFetchStrategy` baseado em headless browser existe neste projeto** — Playwright/Puppeteer não são dependências do projeto hoje. Construir um Connector real para essas 2 lojas exige, no mínimo, uma nova `IFetchStrategy` (ou uma variante do contrato, já que HTML puro não basta) mais a decisão de adicionar essa dependência — não uma tarefa de "escrever mais um parser".
- **Sitemap não é garantia de cobertura completa**: a auditoria da Wave 3 já havia notado isso para Atacado Connect (sitemap de ~900 URLs vs. 8.400+ produtos numa única categoria) — qualquer Connector sitemap-driven precisa decidir se complementa com paginação de categoria quando o sitemap for claramente incompleto, não assumir que o sitemap é a fonte única de verdade.
- **`stores` row é pré-requisito, não parte do connector**: nenhum dos 3 próximos alvos (Mega Eletrônicos, Roma Shopping, Atacado Connect) tem confirmação de linha em `stores` — isso precisa ser resolvido (Discovery ou seed manual) antes do primeiro sync real, não durante a implementação do connector.
- **Moeda varia por loja e precisa de decisão explícita por connector**: Shopping China é Gs.-primário com fallback USD; Mega Eletrônicos é USD/BRL sem Gs.; Roma Shopping expõe 4 moedas simultâneas. `textParsing.findFirstCurrencyAmount` já modela prioridade USD→PYG→BRL, mas cada connector ainda precisa decidir explicitamente qual moeda persistir em `offers.currency` — não é automático.

---

## 11. Recomendação

Com Shopping China recertificado e a infraestrutura compartilhada (`SitemapCrawler`, `textParsing`, retry/backoff) pronta e testada contra dado real, os 3 próximos Connectors (Mega Eletrônicos, Roma Shopping, Atacado Connect) são consideravelmente mais baratos de construir do que o Shopping China original — a maior parte do trabalho de infraestrutura já está feita. O bloqueio real para retomar não é técnico, é de decisão: confirmar se as 3 lojas têm (ou precisam ganhar) uma linha em `stores`, e revisar este documento antes de prosseguir, conforme solicitado.
