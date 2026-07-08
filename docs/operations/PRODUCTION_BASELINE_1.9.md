# PRODUCTION_BASELINE_1.9.md
# Release 1.9 — Baseline Oficial de Produção

**Categoria**: `docs/operations/` (mesma família de `PROJECT_STATUS.md`/`CHANGELOG.md`/`RELEASE_CERTIFICATION_1.7.md` — nenhuma categoria nova criada, ver ADR-055)
**Data**: 2026-07-08 (PROGRAM Z — RC-10)
**Auditor**: CTO / Claude Sonnet 5
**Commit auditado**: `f47a54f` (`main`, `origin/main`, working tree limpo salvo `.gitignore` não commitado e 2 arquivos soltos não rastreados — ver §9)
**Status**: **BASELINE ESTABELECIDO** — Release 1.9 declarada o estado de referência permanente da plataforma

---

> Este documento é o registro permanente do estado de produção do ParaguAI ao final da Release 1.9. Não substitui `PROJECT_STATUS.md` (que continua a auditoria viva, atualizada a cada Wave) nem `RELEASE_CERTIFICATION_1.7.md` (certificação formal de um Release anterior específico) — é o corte transversal usado como referência permanente para toda Release futura, conforme ADR-055.

---

## 1. Executive Summary

O ParaguAI encerra a Release 1.9 com a fase de fundação de engenharia (Releases 1.0–1.8: Connector Platform, Product Identity, Canonical Catalog, Exchange Intelligence, Real-Time Commerce, Market Intelligence, Marketplace Operations, Merchant Platform, Analytics/Decision/Growth Engine, Trust Platform) totalmente consolidada em produção, e a primeira experiência de produto construída sobre essa fundação — a Premium Home — publicada, congelada (`DESIGN_CONSTITUTION.md` v1.3) e verificada ao vivo em `https://www.fronteiraai.com`.

**Objetivos atingidos**:
- Toda a Release 1.8 (Programs 0/A/B/C/D) e a Release 1.9 (Program F) estão commitadas em `main`/`origin/main` — a divergência entre working tree e git remoto encontrada e corrigida na RC-1 (2026-07-06) não se repete: `git status` limpo, um único branch, um único remote.
- Home Premium publicada, verificada byte-a-byte contra produção (RC-9, 2026-07-08): título, fontes escopadas, e todos os 4 cards do `DashboardStrip` presentes no HTML servido por `www.fronteiraai.com`, correspondendo exatamente ao código-fonte em `main`.
- Quality Gate 100% verde nesta auditoria: lint 0, typecheck 0, 524/524 testes, build OK (188 rotas, `/` estático com `revalidate: 1m`).
- Domínio oficial (`fronteiraai.com`/`www.fronteiraai.com`) resolvendo para o deployment Production correto, confirmado via Vercel CLI + `curl` direto.

**Escopo entregue nesta missão (RC-10)**: auditoria completa read-only de 18 áreas (git/GitHub, Vercel, domínio, Home, Design Constitution, Connector Platform, Canonical Catalog, Market Intelligence, Marketplace Operations, Merchant Platform, Exchange, Supabase, Cron, CI/CD, Quality Gate) e este documento de baseline. **Nenhum código de aplicação, componente, layout, API, banco ou build foi alterado.**

---

## 2. Deployment

| Item | Valor |
|---|---|
| Domínio oficial | `fronteiraai.com` (308 → `www.fronteiraai.com`), `www.fronteiraai.com` (200, canônico) |
| Projeto Vercel | `fronteiraai/fronteiraai` (conta `fronteira-ai`) |
| Branch | `main` (único branch local e remoto além de `origin/HEAD`) |
| Último commit | `f47a54f` — "style(home): final UI polish and spacing refinement" (2026-07-07) |
| Tag de marco | `release-1.9-foundation-complete` |
| Último deployment Production | `fronteiraai-6cu7vfphw-fronteiraai.vercel.app`, ~16h de idade no momento da auditoria, **Ready** |
| Status | Verificado ao vivo: `X-Matched-Path: /`, HTML retornado contém os marcadores exatos do código-fonte atual (título, `font-home-display`/`font-home-sans`, "Economia do dia", "Market Pulse", "Câmbio ao vivo", "Live Marketplace", "Lojas em destaque"); `X-Vercel-Cache: STALE` observado é ISR normal (`revalidate=60`, stale-while-revalidate), não uma falha de deploy |

---

## 3. Arquitetura

### Domínios reais (`src/domains/`, 14 domínios)

`canonical-catalog`, `catalog-intelligence`, `connectors`, `exchange`, `growth-engine`, `market-insights`, `marketplace-operations`, `merchant-analytics`, `merchant-decision`, `merchant-intelligence`, `merchant-ownership`, `product-identity`, `realtime-commerce`, `trust`.

### Camadas (inalteradas desde `ARCHITECTURE.md`)

```
types/*.ts  →  services/*.service.ts  →  hooks/use*.ts  →  components/*  →  app/*
src/domains/<domínio>/  (DDD hexagonal: types/domain/repositories/infrastructure/services/events/__tests__)
lib/*-factory.ts  (composição — wiring de repositórios+services para cada domínio, consumido por rotas/dashboards)
```

Direção de dependência entre domínios auditada e respeitada (ver `docs/engineering/TECH_DEBT.md`, Release 1.8 Program B Wave 2 e Release 1.7 Wave 6): `connectors/` nunca depende de `marketplace-operations`/`catalog-intelligence`/`exchange`; `trust/` tem zero dependência de saída (domínio-fundação); `market-insights/` depende livremente de `canonical-catalog`/`exchange`/`realtime-commerce`, nenhum depende de volta.

### Home (única superfície de produto construída sobre a fundação até agora)

`app/page.tsx` → `lib/home-premium-service.ts` (camada única de leitura) → serviços de 5 domínios (`marketplace-operations`, `market-insights`, `realtime-commerce`, `exchange`, `connectors`) → 21 componentes em `components/home/**`, cada bloco um Server Component em `<Suspense>` próprio (streaming granular real, Next.js 16). Zero regra de negócio em componente React — árvore completa de renderização confirmada na RC-9 (2026-07-08), zero Home duplicada/morta/condicional encontrada.

### Serviços existentes (amostra por domínio, não exaustiva — ver `docs/architecture/COMPONENT_INDEX.md`)

Connector Platform SDK (`src/domains/connectors/sdk/`), `MarketplaceHealthEngine`/`MerchantPriorityService`/`MarketplaceCoverageService`, `PriceIntelligenceService`/`VolatilityRollupService`/`MarketPulseInsightsService`, `ExchangeRateService`/`AutomaticCurrencyService`/`ExchangeAnalyticsService`, `ChangeDetector`/`VolatilityEngine`/`FreshnessEngine`/`MarketPulseService`, `CognitiveBrainService`/`KnowledgeGraphService` (Trust/Brain).

---

## 4. Releases concluídas

| Release | Nome | Entrega principal |
|---|---|---|
| 0.1–0.9 | MVP scaffold | Domínio Produto/Loja/Busca, Compare Engine v1, Data Integrity, Acquisition Engine — fundação inicial navegável |
| 1.0 | Admin Platform | Operations Center |
| 1.1 | First Live Connector | Shopping China — primeiro conector real em produção |
| 1.2 | Merchant Operating System | Painel do lojista, planos comerciais (arquitetura) |
| 1.3 / 1.3.1 | Dashboard Consultivo & Growth Engine / ParaguAI Experience Integration | — |
| 1.4 | Merchant Growth Platform | Progress Engine, Missions, `/lojas`, `/para-lojistas`, Reputation Center (arquitetura) |
| 1.5 | Trust Experience | Trust Platform completo (5 epics), signals, reviews, timeline, merchant profile |
| 1.6 | Command Center | Analytics Platform, Decision Engine, Catalog Intelligence, Growth Engine (5 Epics) |
| 1.7 | Ecosystem Expansion Platform | Connector Platform Framework, Product Identity (Shadow Mode), Canonical Catalog, Merchant Acquisition & Ownership, Platform Hardening — **CERTIFIED** (`RELEASE_CERTIFICATION_1.7.md`) |
| 1.8 | Marketplace Expansion & Live Commerce | Programs 0/A/B/C/D: Marketplace Operations, Exchange Intelligence, Real-Time Commerce, Connector Platform V2, Market Intelligence Engine, Merchant Partnership Program, Marketplace Coverage Expansion (4 merchants reais, 597 ofertas) |
| **1.9** | **Premium Home Experience** | **Program F**: Home redesenhada + `/categorias`, consumindo exclusivamente domínios já consolidados, ISR real; **PROGRAM Z**: RC-1 a RC-9 — consolidação de repositório, congelamento de Design, governança de Sprint por componente, verificação de produção. **Baseline estabelecido nesta missão (RC-10).** |

---

## 5. Estado da Home

| Campo | Valor |
|---|---|
| Nome | Premium Home Experience |
| Status | **FROZEN** (READ-ONLY) |
| Superfície congelada | `app/page.tsx`, `app/categorias/page.tsx`, todo `components/home/**`, resultado visual de `Navbar`/`Footer` como renderizados na Home, tokens em `app/globals.css` consumidos por esses componentes |
| Design Constitution vigente | `docs/design/DESIGN_CONSTITUTION.md` **v1.3** (2026-07-07, RC-8) |
| Registro vivo de componentes | `docs/design/HOME_COMPONENTS.md` — **29/29 componentes listados em status Frozen** nesta auditoria |
| Processo de evolução futura | Sprint isolada de componente único (ADR-053), exceções pontuais nomeadas exigem ADR própria (precedente: ADR-054/RC-8) |
| Responsável | CTO |
| Última verificação de produção | RC-9 (2026-07-08) — HTML ao vivo comparado literalmente contra o código-fonte, correspondência confirmada |

---

## 6. Quality Gate

Executado nesta auditoria (2026-07-08), não reaproveitado de relatório anterior:

| Verificação | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` (ESLint flat config) | **0 erros, 0 warnings** |
| Typecheck | `npx tsc --noEmit` | **0 erros** |
| Tests | `npm test` (Jest) | **524/524 passando**, 81 suites |
| Build | `npm run build` (Next.js 16.2.9, Turbopack) | **OK** — 188 rotas, compilado em 11.4s, `/` confirmado `○ (Static)` com `Revalidate: 1m` |

---

## 7. Infraestrutura

| Componente | Estado |
|---|---|
| **GitHub** | `github.com/fronteira-ai/fronteiraai`, único remote (`origin`), branch `main` sincronizada, tags `foundation-v1.0`/`release-1.5`/`release-1.9-foundation-complete`/`v0.1.0`/`v1.5.0-rc1` |
| **Vercel** | Projeto `fronteiraai/fronteiraai`, deployment Production `Ready` e alinhado ao domínio oficial |
| **Supabase** | Projeto único (não há par staging/produção — gap nomeado em `.github/workflows/database.yml`); 17 migrations legadas congeladas em `database/migrations/` (0001–0017, pré-Migration System V2/ADR-040) + 14 migrations ativas timestampadas em `supabase/migrations/` (Release 1.6 Epic 2–5 até Release 1.8 Program A Wave 4) |
| **Cron** | 2 crons diários nativos da Vercel (`vercel.json`: `connectors/sync` 06:00, `marketplace-operations/snapshot` 07:00) + 3 rotas de alta frequência (`exchange/refresh` */5, `realtime-commerce/market-pulse` e `buyer-alerts` */15) desacopladas para `.github/workflows/high-frequency-crons.yml` (ADR-052, RC-3) — **dormant**: `CRON_SECRET`/`CRON_APP_URL` ainda não configurados em GitHub Actions Secrets, então as 3 rotas de alta frequência não são disparadas por nenhum scheduler hoje |
| **CI/CD** | `.github/workflows/database.yml` (pipeline de migration, gates PR em `supabase/migrations/**`) — **dormant**: `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF`/`SUPABASE_DB_PASSWORD` não configurados, `push-migrations`/`health-checks` são pulados; `.github/workflows/high-frequency-crons.yml` — ver linha Cron acima |

---

## 8. Componentes Estratégicos

| Componente | Status |
|---|---|
| Canonical Catalog | Ativo em produção — identidade permanente de produto, fundação de Compare/Search; Canonical Match rate honesto e baixo (Product Identity em Shadow Mode) |
| Connector Platform (V2) | Ativo — SDK unificado, Capability Matrix, Certification Framework, Delta Import operacional (validado com sync real); 5 merchants certificados com dado real (Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect + descoberta via sitemap/robots), Mobile Zone/Visão VIP bloqueados (client-side rendering, sem headless browser no projeto), 4 merchants Tier 1 bloqueiam crawlers de IA (rota comercial, `docs/business/`) |
| Marketplace Operations | Ativo — `MarketplaceHealthEngine`, `MerchantPriorityService`, `MarketplaceCoverageService`, dashboard `/admin/marketplace-operations`, snapshot diário |
| Market Intelligence | Ativo — `PriceIntelligenceService`, `VolatilityRollupService`, `MarketPulseInsightsService`; valor real proporcional à cobertura de Canonical Match, hoje baixa |
| Merchant Platform | Ativo — onboarding, claim verificado + delegação, dashboard, planos comerciais; zero lojas reivindicadas em produção hoje (funil de produto, não bug de engenharia) |
| Exchange | Ativo, mecanismo multi-provider com 1 provedor real registrado (ExchangeRate-API, ADR-043); **`EXCHANGE_RATE_API_KEY` não configurada neste ambiente** — `exchange_rates` vazia em produção, Câmbio degrada graciosamente na Home |
| Analytics | Ativo — `buyer_events` append-only, `merchant_analytics_daily`, 8 APIs, hook `useAnalytics` conectado em 4 pontos mínimos |
| Brain (Trust) | Ativo — `CognitiveBrainService`/`KnowledgeGraphService`, ponte real com `buyer_events`; 21 `TrustEventType` (Release 1.6/1.8) ainda sem entrada em `TRUST_EVENT_BRAIN_IMPACT` (gap de documentação, não bloqueante) |
| Trust Platform | Ativo — signals, reviews, verificação, timeline, merchant profile, Knowledge Graph |

---

## 9. Technical Debt

Apenas pendências reais, confirmadas nesta auditoria ou em `docs/engineering/TECH_DEBT.md` e ainda não resolvidas — nenhuma melhoria hipotética listada.

- **`CRON_SECRET`/`CRON_APP_URL` não configurados** — as 3 rotas de cron de alta frequência (`exchange/refresh`, `realtime-commerce/market-pulse`, `buyer-alerts`) não são disparadas por nenhum scheduler hoje.
- **Secrets do `database.yml` não configurados** — `push-migrations`/`health-checks` do pipeline de CI de migrations são pulados.
- **`EXCHANGE_RATE_API_KEY` não provisionada** — `exchange_rates` vazia em produção.
- **Supabase é um projeto único**, sem par staging/produção — todo push de migration vai direto para produção quando o CI for ativado.
- **Duas árvores de migration coexistem** (`database/migrations/` 0001–0017 congelada, `supabase/migrations/` 14 arquivos ativos) — intencional e documentado (`database/migrations/README.md`), não uma duplicação acidental, mas exige atenção de quem audita o histórico de schema pela primeira vez.
- **Zero lojas reivindicadas em produção** — Merchant Platform/Brain funcionais, mas sem volume real ainda (funil, não bug).
- **Canonical Match rate baixo** (Product Identity em Shadow Mode) — Market Intelligence estatisticamente correto, pouco significativo até a cobertura de Connectors crescer.
- **2 arquivos não rastreados na raiz do repositório** (`local.html`, `prod.html`) e `.gitignore` modificado não commitado — encontrados nesta auditoria, não gerados por esta missão; não incluídos no commit desta missão, aguardando triagem do CTO.
- **21 `TrustEventType`** (`analytics_*`, `catalog_*`, `growth_*`) sem entrada em `TRUST_EVENT_BRAIN_IMPACT` — gap de documentação do Brain, não bloqueante.
- **5 serviços pré-Wave 4/5 embutem `supabase.from(...)` direto** em vez de repositório (`ProductHealthService`, `GrowthContextBuilder`, `DecisionContextBuilder`, `CatalogIntelligenceService`, `ExecutiveSummaryService`) — inconsistência de padrão, sem bug de comportamento.
- **Sem rate limiting real em nenhuma API pública de mutação** (`/api/exchange/convert`, `/api/compare`, `/api/canonical-catalog/[slug]` entre outras) — dependem só de autenticação de sessão onde aplicável.

---

## 10. Known Limitations

Somente limitações confirmadas por auditoria ao vivo ou já documentadas — nenhuma extrapolação.

- Câmeras ao Vivo (`LiveCameras.tsx`) é arquitetura preparada, zero integração de stream real, por mandato explícito.
- Chat de IA (Assistente IA / `AIShowcase`) não implementado, apenas preparação de integração — mandato explícito.
- `/categorias/[slug]` (página de detalhe de categoria) não existe — cada card linka para `/products?category=slug`.
- Market Pulse/Marketplace em Tempo Real ainda não tem dado de `price_increased`/`price_decreased` — os 4 conectores reais só sincronizaram uma vez cada até o momento da última auditoria de conteúdo.
- ISR da Home (`revalidate=60`) pode servir HTML com até alguns minutos de defasagem em baixo tráfego (`stale-while-revalidate`) — comportamento normal do Next.js, não um bug, mas relevante para quem interpretar "produção parece desatualizada".
- Mobile Zone e Visão VIP permanecem bloqueados (client-side rendering confirmado, sem headless browser no projeto — exigiria ADR própria).
- 4 merchants Tier 1 (Cellshop, Nissei, Casa Americana, New Zone) bloqueiam crawlers de IA — caminho exclusivamente comercial (`docs/business/`), nunca contornar `robots.txt`/Cloudflare.

---

## 11. Production Checklist

- [x] `main`/`origin/main` sincronizados, working tree sem trabalho não commitado relevante (exceto os 2 arquivos soltos nomeados em §9, triagem pendente)
- [x] Domínio oficial resolvendo para o deployment Production correto
- [x] Home Premium ao vivo verificada byte-a-byte contra o código-fonte
- [x] Design Constitution vigente e 100% dos componentes da Home em status Frozen
- [x] Lint 0 / Typecheck 0 / 524 testes / Build OK
- [x] Todos os domínios estratégicos (Canonical Catalog, Connector Platform, Marketplace Operations, Market Intelligence, Merchant Platform, Exchange, Analytics, Brain, Trust) ativos em produção
- [x] Tech Debt e Known Limitations registrados sem maquiagem
- [ ] `CRON_SECRET`/`CRON_APP_URL` e secrets do `database.yml` configurados (pendência de configuração manual, fora do escopo desta missão documental)
- [ ] `EXCHANGE_RATE_API_KEY` provisionada
- [ ] Triagem dos 2 arquivos não rastreados (`local.html`, `prod.html`) e do `.gitignore` modificado

---

## 12. Definition of Ready — Release 2.0

A plataforma está pronta para iniciar a Release 2.0 sob as seguintes condições, todas satisfeitas nesta auditoria:

1. **Fundação de engenharia estável**: 14 domínios em produção, zero dependência circular, Quality Gate 100% verde.
2. **Home Premium congelada e verificada**: primeira experiência de produto pública funcionando ponta-a-ponta sobre a fundação, sem pendência de correção visual aberta.
3. **Governança documental madura**: 55 ADRs registrados (`docs/operations/DECISIONS.md`), Knowledge System com 11 categorias estáveis, processo de Sprint por componente vigente para a Home.
4. **Pendências conhecidas são de configuração, não de arquitetura**: os 3 itens não concluídos do checklist acima (§11) são credenciais/secrets a provisionar, não trabalho de engenharia a redesenhar — não bloqueiam o início de um novo Release de produto.

**A Release 2.0 está autorizada a iniciar.** Ver `docs/product/releases/RELEASE_2_0_PREVIEW.md` e `docs/product/ROADMAP_2_0.md`.
