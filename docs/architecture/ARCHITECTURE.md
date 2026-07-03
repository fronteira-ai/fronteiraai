# ARCHITECTURE.md

Mapeamento real da arquitetura, gerado por leitura completa do código. Atualizado em 2026-06-27 (Release 1.4).

Documentos relacionados: `docs/engineering/CONVENTIONS.md` (regras de estilo/nomenclatura), `docs/architecture/API_CONTRACTS.md` (contratos de cada service), `docs/architecture/DOMAIN_MODEL.md` (entidades e relacionamentos), `docs/architecture/COMPONENT_INDEX.md` (tabela de todos os componentes), `docs/architecture/DEPENDENCY_GRAPH.md` (grafo de imports entre camadas), `docs/operations/DECISIONS.md` (histórico de decisões arquiteturais).

---

## Estrutura de pastas (real)

```
app/                    rotas (App Router)
  page.tsx              Home — async Server Component, force-dynamic, dados reais
  search/               page.tsx (Server), loading.tsx, error.tsx (Client, unstable_retry)
  products/             page.tsx (Server, filtros + paginação SSR), loading.tsx, error.tsx
  product/[slug]/       layout.tsx (Server, metadata+JSON-LD) + page.tsx (Server) + _cache.ts
  store/[slug]/         layout.tsx (Server, metadata+JSON-LD) + page.tsx (Server) + _cache.ts
  compare/[slug]/       page.tsx (Server, generateMetadata + compare engine)
  lojas/                page.tsx (Server, ranking público de lojas)
  lojas/[slug]/         page.tsx (Server, página premium por loja), loading.tsx, not-found.tsx
  para-lojistas/        page.tsx (Server, landing page institucional)
  admin/                layout.tsx (middleware auth) + 12+ páginas de gestão
  merchant/             layout.tsx (middleware auth) + 11 páginas do portal self-service
  auth/callback/        route.ts (Route Handler — exchange PKCE code por sessão)
  api/
    admin/              Route Handlers: products, stores, offers, brands, categories, import, quality
    merchant/           Route Handlers: dashboard/stats, offers, import, settings, plans, analytics
    compare/            route.ts (API pública de comparação)
  sitemap.ts            sitemap dinâmico (produtos, compare, lojas, /lojas, /para-lojistas)
  robots.ts             robots.txt gerado dinamicamente
  not-found.tsx         404 global com design de marca
  icon.tsx / apple-icon.tsx  favicon dinâmico (ImageResponse)
  manifest.ts           manifesto PWA

src/domains/connectors/  Connector Platform Framework (Release 1.7 — Epic 1; substitui acquisition/)
  types/                contratos (RawOffer, NormalizedOffer, PipelineContext…)
  domain/               Connector, SyncRun, ProductIdentity (value objects — ProductIdentity
                        promovido a domínio próprio src/domains/product-identity/ na Wave 3)
  repositories/         IConnectorRepository, ISyncRunRepository, ICatalogRepository
  infrastructure/       implementações Supabase dos repositórios acima
  normalization/        OfferNormalizer, ProductIdentityResolver (seed do Epic 3)
  mapping/              JsonFieldMapper, CsvFieldMapper
  crawler/              HttpFetchStrategy, ShoppingChinaConnector, reference/ (JSON/CSV)
  discovery/            Wave 2 — SitemapParser, RobotsParser, SitemapDiscoverySource,
                        DiscoveryService (cria lojas "não reivindicadas" via sitemap/robots.txt)
  services/             ConnectorRegistry, SyncOrchestrator (orquestrador), stages/
  scheduler/            ISyncScheduler + VercelCronScheduler (Wave 2 — interval-based,
                        não avalia expressões cron reais), ManualSyncTrigger
  events/               connector.events.ts (Brain events)
  __tests__/            Jest
vercel.json             Wave 2 — primeiro cron deste projeto: /api/cron/connectors/sync (diário)
scripts/                scripts CLI standalone (import-json, import-csv, sync-shoppingchina)
  connectors/           JsonFileConnector, CsvFileConnector, ShoppingChinaConnector
  datasets/             dados de teste
  scripts/              import-json, import-csv, validate-pipeline

src/domains/           Domínios DDD com arquitetura hexagonal
  trust/               Release 1.5 — Sistema completo de Trust (5 epics)
    types/             enums (TrustEventType 39 valores, BrainEntityType 10, BrainAsset 6, etc.)
    domain/            5 entidades de domínio
    repositories/      5 interfaces de repositório
    infrastructure/    5 implementações Supabase
    services/          TrustService, VerificationService, BadgeService, ReviewService, etc.
    events/            trust.events.ts (factory functions) + event-registry.ts (Brain mapeamentos)
    brain/             CognitiveBrainService, EventQualityValidator, KnowledgeGraphService, ObservabilityService, SearchReadinessService
    tests/             Suítes de teste por serviço
  merchant-intelligence/  Release 1.6 — Merchant Command Center (Epic 1)
    types/             enums (HealthStatus, HealthDimension, CatalogIssueType, InsightSeverity, ActionPriority)
                       interfaces (ExecutiveSummary, MerchantHealth, CatalogIntelligence, QuickActionsResult, CommandCenterData)
    services/          ExecutiveSummaryService, MerchantHealthService, CatalogIntelligenceService, QuickActionsService
    __tests__/         24 testes unitários cobrindo os 4 serviços
  merchant-analytics/     Release 1.6 — Merchant Analytics Platform (Epic 2)
    types/             enums (AnalyticsEventType 22v, DeviceType, FunnelStep 6, AnalyticsWindow 4)
                       interfaces (AnalyticsEventPayload, StoredAnalyticsEvent, SessionPayload, StoredSession,
                                  EventStream, FunnelResult, MerchantAnalyticsSummary, ProductAnalyticsResult,
                                  TrafficAnalyticsResult, AnalyticsHealthCheck)
    repositories/      IAnalyticsEventRepository + ISessionRepository (interfaces de contrato DDD)
    infrastructure/    SupabaseAnalyticsEventRepository + SupabaseSessionRepository
    services/          WindowHelper (windowToDate, windowLabel)
                       EventPlatformService (validação + sanitização + batch ≤50 + session side-effects)
                       SessionService (CRUD sessões com anonimato)
                       EventStreamService (reconstrução cronológica da jornada)
                       MerchantAnalyticsService (getSummary, getProductAnalytics, getTrafficAnalytics)
                       FunnelService (6 passos: Search→Impression→Click→MerchantView→Contact→Save)
                       AnalyticsObservabilityService (healthCheck com latência)
    __tests__/         28 testes unitários (EventPlatform 14, MerchantAnalytics 8, Funnel 6)
  merchant-decision/      Release 1.6 — Merchant Decision Engine (Epic 3)
    types/             enums (RecommendationCategory, RecommendationPriority, EstimatedEffort,
                              RecommendationStatus, OpportunityType, ActionStatus, ImpactLevel)
                       interfaces (DecisionContext, Recommendation, Opportunity, DecisionAction,
                                  PriorityScore, DecisionCenterData)
    rules/             Rule.ts (interface pura — fn: context → RuleResult | null)
                       RuleRegistry (Map estático, nunca limpo)
                       bootstrap.ts (registra 11 regras, idempotente)
                       catalog-rules.ts: CatalogImageCoverageRule, StaleImportRule, LowActiveProductsRule
                       trust-rules.ts:   TrustNoVerificationRule, LowTrustScoreRule, TrustNoSignalsRule
                       analytics-rules.ts: HighViewsLowContactRule, LowCTRRule, ZeroOfferSavesRule
                       profile-rules.ts: ProfileNoContactRule, ProfileSingleChannelRule
    repositories/      IActionRepository (interface de contrato DDD)
    infrastructure/    SupabaseActionRepository
    services/          RecommendationEngine (roda todas as regras, fault-isolated por regra)
                       PrioritizationEngine (fórmula transparente: impact+effort+urgency+category, max 100)
                       OpportunityDetector (4 detectores baseados em dados observáveis)
                       ActionService (lifecycle de DecisionAction no DB)
                       DecisionContextBuilder (agrega context de 3 domínios em Promise.all)
    __tests__/         33 testes unitários (RuleRegistry 7, RecommendationEngine 7, OpportunityDetector 7, PrioritizationEngine 12)
  catalog-intelligence/   Release 1.6 — Catalog Intelligence (Epic 4)
    types/             enums (ProductHealthStatus, ProductDiagnosisType, CatalogTrend)
                       interfaces (ProductDiagnosis, ProductHealthRecord, CatalogHealthBreakdown,
                                  CatalogHealthSnapshot, CatalogHealthHistory, CatalogHealthResponse,
                                  CatalogProductsResponse)
    repositories/      ICatalogSnapshotRepository (getHistory, saveSnapshot)
    infrastructure/    SupabaseCatalogSnapshotRepository (upsert por merchant_id+snapshot_date)
    services/          ProductHealthService (scoreOffer: pura, getProductHealthList, getHealthBreakdown)
                       CatalogHistoryService (classe, injeta ICatalogSnapshotRepository)
    __tests__/         23 testes unitários (ProductHealthService 15, CatalogHistoryService 8)

components/
  home/                 10+ componentes — Server exceto SearchBar e HeroCTAs ("use client")
  layout/               Navbar ("use client", scroll listener), Footer (Server)
  product/              11 componentes — Server exceto FavoriteButton/ShareButton/ProductFilters
  store/                StoreCard, StoreDetails, StoreOffers, StoreGrid — todos implementados
  compare/              CompareOfferCard, CompareHeader, CompareTable
  search/               SearchResults (Server), SearchResultsSkeleton
  merchant/
    dashboard/          ScoreCard, RecommendationsPanel, StatsGrid, NextStepCard, GoalsPanel, MerchantProgressCard
    command-center/
      widgets/          ExecutiveSummaryWidget, MerchantHealthWidget, CatalogIssuesWidget, QuickActionsWidget, TrustWidget, RecentActivityWidget
    ui/                 ToastContext, ToastContainer, componentes compartilhados admin+merchant
  admin/                AdminSidebar, AdminStats, ImportQueue, QualityCenter, ui/*
  analytics/            Analytics.tsx (GA4 + Microsoft Clarity)
  ui/                   kit compartilhado: Button, Input, Select, Breadcrumb, Pagination, EmptyState, etc.

hooks/                  useProduct, useFavorites, useSearch, useStore, useProductFilters, useCompare implementados; useOffers vazio
services/               product, offer, store, search, brand, category, compare implementados; ai vazio
                        stores-public.service.ts (service role, server-only, para /lojas público)
                        merchant.service.ts (score, level, progress, goals, next step)
types/                  Product, Offer, Store, Brand, Category, Favorite, Search, PriceHistory, Merchant implementados
                        User, Review vazios

lib/
  supabase.ts           cliente legado (anon key) — usado pela app pública (catálogo, busca, produto, loja)
  supabase/
    server.ts           createServerClient com await cookies() — Server Components com sessão
    client.ts           createBrowserClient — Client Components autenticados
    service.ts          service role (SUPABASE_SERVICE_ROLE_KEY) — API routes e stores-public.service.ts
  env.ts                única fonte de process.env (ADR-001)
  admin-auth.ts         requireAdmin() — valida sessão + role admin/operator, retorna serviceClient
  merchant-auth.ts      requireMerchant() — valida sessão + role merchant, retorna serviceClient

constants/              routes.ts, categories.ts implementados; demais vazios
utils/                  currency.ts, search.ts, storage.ts, slug.ts, analytics.ts implementados; format/validators vazios
styles/                 animations.ts implementado; theme/typography/spacing/radius/shadows vazios
database/
  DATABASE.md / ERD.md  documentação descritiva do esquema
  migrations/           0001–0013 (propostas; algumas aplicadas manualmente pelo CTO)
  seed/                 sistema modular com dry-run por padrão; validate.js, validate_adr019.js
  storage/              init.js (cria bucket catalog)
ai/                     só .gitkeep — nada implementado
assets/                 só .gitkeep — nada implementado
```

---

## Dependências

```json
{
  "@supabase/supabase-js": "^2.108.2",
  "@supabase/ssr": "^0.12.0",
  "lucide-react": "^1.21.0",
  "next": "16.2.9",
  "react": "19.2.4",
  "react-dom": "19.2.4"
}
```

Dev: `tailwindcss ^4`, `@tailwindcss/postcss`, `eslint 9 + eslint-config-next`, `typescript ^5`, `tsx ^4.19.0` (scripts CLI do Connector Platform), `sharp ^0.33.0` (imagens no Connector Platform — `MediaStage`).

Sem libs de state management, data-fetching (React Query/SWR), validação (zod) ou testes — tipagem direta do retorno do Supabase (`as Product[]`) sem validação em runtime.

---

## Clientes Supabase — três variantes (ADR-028)

| Cliente | Arquivo | Chave | Contexto permitido | Propósito |
|---|---|---|---|---|
| Legado/público | `lib/supabase.ts` | anon | Client + Server (app pública) | Leitura pública do catálogo |
| Server SSR | `lib/supabase/server.ts` | anon | Server Components, Route Handlers | Validar sessão admin/merchant |
| Browser | `lib/supabase/client.ts` | anon | Client Components autenticados | Leitura com sessão ativa |
| Service Role | `lib/supabase/service.ts` | service role | Somente Server | Writes admin/merchant + dados merchant em páginas públicas |

**Regra crítica**: `lib/supabase/service.ts` NUNCA deve ser importado por Client Components. `SUPABASE_SERVICE_ROLE_KEY` não tem prefixo `NEXT_PUBLIC_*` e não é exposta ao navegador.

---

## Camadas e fluxo de dados

### App pública (leitura de catálogo)
```
Page (Server) → service (lib/supabase.ts, anon key) → Supabase → Database
```

### Autenticação admin / merchant
```
Route Handler → requireAdmin() / requireMerchant()
  → lib/supabase/server.ts (valida sessão + profiles.role)
  → se autorizado: lib/supabase/service.ts (bypassa RLS para writes)
```

### Páginas públicas de merchant (lojas)
```
app/lojas/page.tsx (Server) → stores-public.service.ts (service role)
  → merchants + stores → Supabase
```

Quatro padrões coexistem no app público:

**1. Produto e Loja** (`/product/[slug]`, `/lojas/[slug]`): `layout.tsx`/`generateMetadata` e `page.tsx` compartilham fetches via `_cache.ts` (ADR-021 — double-fetch eliminado no Sprint 4.1). Antes do Sprint 4.1, essas páginas eram inteiramente `"use client"` + hook, resultando em double-fetch a cada visita. (`/store/[slug]` foi a rota de loja original nesse padrão; removida no Release 1.8 Sprint 0.1 por ser um duplicado de `/lojas/[slug]` — ver Achados de Segurança/SEO em `TECH_DEBT.md`.)

**2. Compare** (`/compare/[slug]`): Server Component puro; sem layout separado — `generateMetadata` e o corpo usam o mesmo `cache()` inline. Zero double-fetch.

**3. Busca e Catálogo** (`/search`, `/products`): Server Components com `<Suspense>` para a seção de resultados; filtros/cabeçalho renderizam fora do Suspense. Single-fetch.

**4. Home** (`/`): `async` Server Component com `force-dynamic`; dados reais em paralelo via `Promise.all`.

---

## Padrão `_cache.ts` (ADR-021)

Problema resolvido no Sprint 4.1: em rotas com `layout.tsx` + `page.tsx` ambos Server Components, `generateMetadata` no layout e o render da page chamavam os mesmos services independentemente — double-fetch por visita.

Solução: módulo `_cache.ts` por rota dinâmica, exportando funções envoltas em `React.cache()`:

```
app/product/[slug]/layout.tsx ──┐
                                 ├── importam getCachedProduct, getCachedOffers
app/product/[slug]/page.tsx  ──┘       do mesmo módulo:
                                    app/product/[slug]/_cache.ts
                                         │
                          export const getCachedProduct = cache(getProductBySlug)
                          export const getCachedOffers  = cache(getOffersByProduct)
```

`React.cache()` garante que, dentro de um único render pass, ambos (layout e page) reusam o mesmo resultado de query — 1 fetch por entidade por visita.

---

## Fluxo da busca

```
SearchBar (client) --router.push(?q=X)--> /search?q=X
                                  │
                      SearchPage (Server Component)
                      lê searchParams.q, gera metadata (canonical/OG/robots)
                                  │
                    <Suspense fallback={SearchResultsSkeleton}>
                      SearchResultsAsync → getCachedSearch(q) → searchEverything(q)
                    </Suspense>
                                  │
                      SearchResults (Server) — agrupa por tipo
                      EmptyState se total === 0 ou sem query
```

`searchEverything` faz `Promise.all` de 4 queries `ilike` (products/stores/brands/categories), com `escapeLikePattern` aplicado antes de montar o padrão. Máximo 8 resultados por seção.

---

## Fluxo do compare

```
/compare/[slug]  (Server Component)
       │
  cache(getProductComparisonBySlug) — 3 queries batch (ADR-020):
    1. products JOIN brands + categories
    2. offers JOIN stores
    3. price_history.in("offer_id", offerIds)
       │
  ranking em memória (ADR-014): pontuação composta 0–100
       │
  CompareOfferCard × N
```

---

## Fluxo do catálogo de produtos

```
ProductsPage (Server) lê searchParams → getCategories/getBrands/getStores em paralelo
                                      → <Suspense>
                                           ProductCatalogAsync → getProductsCatalog(filters)
                                         </Suspense>
                                           ├── resolve slug → id (category/brand/store)
                                           ├── products + offers!inner|!left (PostgREST)
                                           ├── .range() + count: "exact" (paginação real)
                                           └── ProductGrid → ProductCard × N
```

Ordenação por preço (`price_asc`/`price_desc`) é corrigida em memória por página — limitação conhecida (ADR-011). View materializada proposta mas não aplicada.

---

## Fluxo do Merchant OS

```
/merchant/login → supabase.auth.signInWithPassword() → /merchant/dashboard
                                                             │
                                         requireMerchant() (lib/merchant-auth.ts)
                                         valida sessão + profiles.role = 'merchant'
                                                             │
                                         /api/merchant/dashboard/stats (serviceClient)
                                         computa Score, Level, NextStep, Goals on-demand
```

---

## Connector Platform Framework (Release 1.7 — Epic 1)

`src/domains/connectors/` é o domínio DDD que absorveu o antigo `acquisition/` (Release 0.9, retirado no Epic 1). É importado tanto pelos Route Handlers (`app/api/admin/import/*`, `app/api/merchant/imports/*`, via `lib/connectors-factory.ts`) quanto pelos scripts CLI standalone em `scripts/` (via `tsx`). Usa `process.env` diretamente nos scripts (ADR-012); nas rotas, usa o `serviceClient` já resolvido por `requireAdmin()`/`requireMerchant()`.

```
ConnectorRegistry.get("loja:v1").fetch()
    │
 ConnectorBatch → SyncOrchestrator.run(metadata, items, options)
    │
 Validation → Normalization → Deduplication → [Media] → CatalogWrite → PipelineMetrics
    │
 connectorRepo.upsertFromMetadata() + syncRunRepo.create()/update() (persistência de Connector/SyncRun)
```

`CatalogWriteStage` grava através de `ICatalogRepository` (nunca um `SupabaseClient` bruto — corrige o vazamento de infraestrutura que existia em `acquisition/types/pipeline.ts`). A implementação Supabase usa o `serviceClient` para bypassar RLS; a chave anônima não tem permissão de INSERT em catálogo.

Novas tabelas: `connectors` (registro persistente de conectores) e `connector_sync_runs` (execução de sincronização, com `merchant_id` opcional) — migration `0022_connector_platform.sql`. `import_logs` foi superada na Wave 2 (ver seção abaixo) — todos os leitores/escritores foram migrados para `connector_sync_runs`.

---

## Merchant Connectors + Scheduler + Discovery (Release 1.7 — Wave 2)

**Ownership + entitlements**: `app/api/merchant/imports/run/route.ts` agora verifica, antes de disparar qualquer sincronização, que o merchant é dono da loja do conector (`merchantOwnsStoreSlug()`, `services/merchant.service.ts` — resolve `connector.metadata.storeSlug` → `stores.id` → linha em `merchant_stores`) e que o plano do merchant permite conectores e não excedeu a cota mensal (`checkImportEntitlement()`, lê `merchant_plans.has_connectors`/`max_imports_month` e conta execuções não-dry-run em `connector_sync_runs` no mês corrente). Ambas as funções vivem em `services/merchant.service.ts`, não em `src/domains/connectors/`, mantendo o domínio de merchant desacoplado do domínio de conectores — a rota de API é o ponto de integração.

**`import_logs` superada**: `SyncOrchestrator.run()` já grava `connector_sync_runs` incondicionalmente desde o Epic 1 (para runs de merchant e admin/globais). A escrita dupla em `import_logs` foi removida das rotas de import; `app/admin/logs/page.tsx` e `app/merchant/imports/page.tsx` foram repontados para `connector_sync_runs` via um mapeador compartilhado (`lib/sync-run-mapper.ts::toImportLogShape()`), preservando o formato `ImportLog` que essas páginas já consomem — nenhuma mudança de UI foi necessária. Histórico anterior ao Epic 1 não existe em `connector_sync_runs` (descontinuidade esperada, não é bug).

**Scheduler**: primeiro cron deste projeto — `vercel.json` (`{"crons":[{"path":"/api/cron/connectors/sync","schedule":"0 6 * * *"}]}`, diário, seguro para o tier Hobby). Autenticado por segredo compartilhado (`lib/cron-auth.ts::requireCronSecret()`, checa `Authorization: Bearer $CRON_SECRET`) — o primeiro padrão de auth por segredo neste projeto (todo outro guard, `requireAdmin`/`requireMerchant`, é baseado em sessão/cookie, inutilizável por um hit de cron). `CRON_SECRET` precisa ser configurado manualmente no painel da Vercel (Production + Preview). A rota (`app/api/cron/connectors/sync/route.ts`, `maxDuration=60`, primeira rota deste projeto a declarar isso) decide em runtime quais conectores estão "devidos", por intervalo (`connectors.config.syncFrequencyHours`, jsonb já existente, sem migration) — deliberadamente **não** avalia expressões cron reais (ver `VercelCronScheduler.ts`, que preenche o seam `ISyncScheduler` do Epic 1 de forma literal, sem executar nada — a rota de cron consulta os repositórios diretamente).

**Ecosystem Monitor**: `/admin/monitor` — computado sob demanda a partir de `connector_sync_runs`/`connectors` (sem tabela de agregação nova, no espírito do ADR-034). Duas APIs: `GET /api/admin/monitor/summary` (saúde por conector — último sync, status, taxa de erro sobre as últimas 20 execuções) e `GET /api/admin/monitor/runs` (histórico paginado, todos os conectores).

**Discovery**: `src/domains/connectors/discovery/` — descobre lojas via sitemap/robots.txt público, nunca scraping agressivo. `RobotsParser`/`SitemapParser` são hand-rolled (regex/string, sem nova dependência — consistente com a preferência deste projeto por parsing leve). `SitemapDiscoverySource` (implementa `IDiscoverySource`, deliberadamente **não** `IConnector` — produz uma loja candidata, não `RawOffer[]`) busca `/robots.txt` → aborta se o sitemap estiver bloqueado → busca `/sitemap.xml` (1 nível de `<sitemapindex>`, no máximo). `DiscoveryService` é o **único** caminho de código autorizado a criar uma linha em `stores` sem que ela já exista — insere diretamente via `SupabaseClient` bruto, nunca via `ICatalogRepository`, para que a garantia "a loja precisa já existir" do `CatalogWriteStage` nunca seja tocada para conectores normais. Nenhuma coluna de ownership foi adicionada a `stores` — "não reivindicado" continua sendo, estruturalmente, "uma loja sem linha em `merchant_stores`". Apenas colunas de proveniência foram adicionadas (`discovered_at`, `discovery_connector_key`, migration `0023`). Disparo: `POST /api/admin/discovery/run` (admin, um domínio por vez) — sem lista de domínios-semente nem sweep automático nesta Wave.

---

## Server Components vs. Client Components

**Server (default)**: `app/page.tsx`, `app/search/page.tsx`, `app/products/page.tsx`, `app/product/[slug]/layout.tsx` e `page.tsx` (desde Sprint 4.1), `app/compare/[slug]/page.tsx`, `app/lojas/*` (rota canônica de loja desde o Release 1.8 Sprint 0.1), `app/para-lojistas/`, `Footer`, maioria de `ui/`, todos os componentes de store/product/compare/search, `components/home/*` exceto SearchBar e HeroCTAs.

**Client (`"use client"`)**: `SearchBar`, `HeroCTAs` (estado de auth), `Navbar` (scroll listener), `Reveal`/`StatCard` (IntersectionObserver), `ProductGallery` (imagem ativa), `FavoriteButton`/`ShareButton`, `ProductFilters` (useProductFilters), formulários de admin/merchant, `ToastContext`, `ToastContainer`. Hooks (`useFavorites`, `useSearch`, `useProductFilters`, `useCompare`) são client-only mas não há mais nenhuma page pública inteiramente client-side — padrão resolvido no Sprint 4.1.

---

## Roteamento

App Router puro. Sem route groups, paralelo ou intercepting routes. Parâmetros dinâmicos: `[slug]` em produto, loja, compare, lojas.

| Rota | Tipo | Propósito |
|---|---|---|
| `/` | Server, dynamic | Home com dados reais |
| `/search?q=` | Server | Busca global |
| `/products?filtros` | Server | Catálogo filtrado |
| `/product/[slug]` | Server | Detalhe de produto |
| `/compare/[slug]` | Server | Comparação de lojas por produto |
| `/lojas` | Server | Ranking público de lojas |
| `/lojas/[slug]` | Server | Detalhe de loja (rota canônica — `/store/[slug]` removida no Release 1.8 Sprint 0.1, era um duplicado; agora um redirect 308 em `next.config.ts`) |
| `/para-lojistas` | Server | Landing page |
| `/admin/*` | Server (autenticado) | Plataforma de operações |
| `/merchant/*` | Server (autenticado) | Portal do lojista |
| `/auth/callback` | Route Handler | PKCE auth exchange |
| `/api/admin/*` | Route Handlers | CRUD admin |
| `/api/merchant/*` | Route Handlers | APIs do portal |
| `/api/compare` | Route Handler | API pública de comparação |

**Rotas mortas** (referenciadas em Navbar/Footer mas sem `page.tsx`): `/stores` (listagem genérica), `/categories/[slug]`.

---

## Providers

Admin e merchant têm `ToastContext`/`ToastContainer` compartilhados. Sem `ThemeProvider` ou `QueryClientProvider`. A app pública não tem nenhum provider global.

---

## Services — convenção

Toda função que consulta Supabase: retorna tipo esperado ou `[]`/`null` em erro, loga via `console.error`, nunca lança. Convenção seguida em todos os services implementados.

**Exceção documentada**: `stores-public.service.ts` usa `getSupabaseServiceClient()` em vez do cliente anon padrão. Importável apenas por Server Components — nunca por Client Components.

---

## Melhorias identificadas (abertas)

- **Offer Ranking (ADR-014)**: estratégia documentada e implementada no Compare Engine (`/compare/[slug]`), mas `getOffersByProduct` (página de produto) ainda ordena só por `price_usd`.
- **View materializada de preço (ADR-011)**: proposta em `0003_proposed_product_catalog_price_view.sql`, não aplicada. Ordenação por preço no catálogo é "best effort" (correta dentro da página, não garante ordem global entre páginas).
- **Constraints de integridade (migration 0008)**: UNIQUE em slugs e índices de performance — criados e prontos mas não aplicados via SQL Editor.
- **Tipagem sem validação em runtime**: todos os services fazem `data as Tipo[]`. Mudança de schema no banco não quebra TypeScript, só quebra em runtime.
- **`validate.js`**: detecta FKs órfãs por `IS NULL`, não por anti-join real. Adequado para volume atual; precisará de RPC quando o volume crescer.
- **`getStore(id)`**: código morto sem consumidor real desde Sprint 3.4 (substituído por `getStoreBySlug`). Sem tipo de retorno explícito.
- **`app/layout.tsx`**: título/descrição ainda "Create Next App" do template — nunca customizados para ParaguAI.
- **`buyer_events`/`buyer_sessions.buyer_id → auth.users(id)`** (achado da auditoria da ADR-046, `docs/product/releases/RELEASE_1_8_BUYER_IDENTITY_MODEL.md` §2.2): acoplamento entre identidade de domínio de comprador e mecanismo de autenticação — nenhum outro domínio deveria referenciar `auth.users` diretamente. Corrige-se migrando o alvo da FK para `buyers.id` (Buyer Domain, ADR-045/046) na Wave 6 do Release 1.8.
- **Trust domain usa `profiles(id)` onde Merchant Platform usa `merchants(id)`** para o mesmo conceito de "merchant" (achado da mesma auditoria, §2.3): inconsistência de convenção entre domínios construídos em momentos diferentes (Release 1.5 vs. 1.2), não um bug de integridade — qualquer correlação entre os dois hoje precisa passar por `auth.users.id` como tradutor implícito. Não corrigido, registrado para uma sprint de manutenção futura.
