# NEXT_STEPS.md

Estado atual e próximos passos do ParaguAI. Atualizado em 2026-08-26 (Product Rebaseline V2 — auditoria).

---

## Estado real (Product Rebaseline V2, 2026-08-26)

Auditoria somente (zero código/migration/deploy). Detalhes e requisitos formais: `docs/product/PRODUCT_REBASELINE_REQUIREMENTS.md` e atualização factual em `docs/operations/PROJECT_STATUS.md`.

**Baseline pronto mas não deployado**: branch `sprint-0/baseline-recovery` (HEAD `29092dd`) contém Home 2.0, Busca, Compare, engines rule-based, e os fixes de ordenação — mas `main` (produção, `227caf3`) **não os contém**. Quality gates: lint 0/1w, tsc 0, **1016/1016 testes**, build OK.

**Bloqueadores de produção mais urgentes (P0)**:
1. Busca em produção **não ordena** (esgotados/last + price asc só no baseline; bug "esgotados primeiro" vivo).
2. RPC `search_products_catalog` **não aplicada** no self-hosted → ordenação global de `/products?sort=price_asc|desc` degrada.
3. SEO quebrado: `NEXT_PUBLIC_SITE_URL` ausente no deploy → `robots.txt` publicado aponta `Host: localhost:3000` e sitemaps em localhost (inindexável).

**Dado de produção (2026-08-26)**: 52.589 produtos, 7 lojas (logo 0% — `LOGO_COVERAGE=0%`, latlng 0/7), 72.413 linhas de `price_history`, `canonical_products` 0, ecossistema vazio (favorites/reviews/buyers/merchants = 0).

## Próximos Sprints (recomendados)

### Sprint 1 (NOW) — Search Ordering + Out-of-Stock + SEO fix — **CÓDIGO PRONTO, deploy RED pendente**

> **Implementado nesta Sprint (GREEN) e disponível no baseline**: ordenação global via RPC, fallback determinístico, SEO fail-fast, 9 testes novos (1025 no total). Ações de produção restantes são **RED e aguardam aprovação** (aplicar RPC no self-hosted, configurar `NEXT_PUBLIC_SITE_URL` no deploy, merge para `main`, rodar validação pós-deploy). Ver `docs/operations/CHANGELOG.md` (2026-08-26).

- [x] Código de ordenação global (RPC search_products_global + search_products_catalog estendida) redigido e testado.
- [x] Fallback determinístico em `services/search.service.ts` (não quebra `/search` sem a RPC).
- [x] SEO: `lib/env.ts` exige `NEXT_PUBLIC_SITE_URL` em produção (fail-fast), sem localhost.
- [x] 9 testes de ordenação; quality gates verdes (lint 0, typecheck, 1025 testes, build, db:lint).
- [ ] **RED**: aplicar `20260827000000_search_products_global.sql` + `20260809120000_search_products_catalog.sql` no self-hosted (após aprovação).
- [ ] **RED**: configurar `NEXT_PUBLIC_SITE_URL=https://www.fronteiraai.com` no ambiente de deploy.
- [ ] **RED**: merge/PR para `main` e deploy; validação pós-deploy.

### Sprint 2 (NOW/NEXT) — Home 2.0 publish + dados
- Publicar a Home 2.0 do baseline (está congelada ADR-050; publish = deploy, não redesenho).
- Datas/atos: preencher `stores.logo_url` (PR-004) e `address`/`latitude`/`longitude` (PR-005) com origem autorizada.

### Sprint 3 (NEXT) — Maps Directions (PR-005)
- Utility `buildGoogleMapsDirectionsUrl()` + CTA "Como chegar" (Ponte da Amizade → loja) em ProductOffers/OfferCard/StoreDetails mobile.

### Releases seguintes (NEXT/LATER)
- Price History público em UI (`/product/[slug]` gráfico; backend já tem 72k linhas) · Câmeras ao Vivo (PR-003, após fonte legal) · IA real (LLM) · Favoritos/Alertas sincronizados (requer Auth) · Reviews.

Pontos de partida históricos (Release 1.5+ e itens datados) permanecem abaixo, preservados como histórico.

---

## Estado histórico — Release 1.4 completo

Para o histórico detalhado de cada Sprint/Release, consultar `docs/operations/CHANGELOG.md`. Para o roadmap estratégico, consultar `docs/product/MASTER_ROADMAP.md`.

**Plataforma** (após Release 1.4): 67 rotas, dados reais, autenticação admin e merchant, Acquisition Engine, surface pública para lojistas. Stack certificada: Next.js 16.2.9 + React 19.2.4 + Supabase + Vercel. Foundation Empresarial v1.0 LOCKED.

---

## Pendências manuais herdadas (requerem acesso ao Supabase/Vercel)

Estas ações não são código — precisam de ação do CTO no painel:

| Ação | Status | Referência |
|---|---|---|
| Aplicar `database/migrations/0008_data_integrity.sql` no SQL Editor | Pendente | ADR-023 |
| Configurar `NEXT_PUBLIC_GA_MEASUREMENT_ID` no painel Vercel | Pendente | Release 0.8 |
| Configurar `NEXT_PUBLIC_CLARITY_PROJECT_ID` no painel Vercel | Pendente | Release 0.8 |
| Registrar no Google Search Console | Pendente | Release 0.8 |
| Upload de imagens reais no bucket `catalog` | Pendente | ADR-022 |
| Aplicar `database/migrations/0013_profiles_role_check.sql` | Pendente | Release 1.2 |

---

## Release 1.5 — Trust & Reputation

**Objetivo**: construir a camada de confiança verificável da plataforma — reviews de compradores, analytics de merchants com dados reais, e expansão de catálogo.

### Módulo 1 — Sistema de Reviews (ADR-038)

Reviews de compradores para lojas. Tabela `reviews` (não existe ainda), moderação básica.

**Escopo**:
- Migration: criar tabela `reviews` (`id, store_id, user_id, rating, body, created_at, moderated`)
- RLS: `anon` lê reviews aprovados; `authenticated` insere (1 por store_id por user)
- `services/review.service.ts`: `getReviewsByStore`, `createReview`
- `types/review.ts`: `Review` interface
- `StoreReviews` component — lista de reviews em `/store/[slug]`
- `/lojas/[slug]` — integrar reviews à página pública da loja
- Merchant dashboard — exibir média de avaliação recebida

**Dependências**: Auth de comprador (tabela `profiles` existente, mas sem fluxo de login do comprador ainda — ver Módulo 4).

### Módulo 2 — Analytics Dashboard de Merchant (ADR-039)

Dashboard de leitura dos eventos em `merchant_analytics_events` (write-only em Release 1.4).

**Escopo**:
- `/merchant/analytics` — gráficos de visitas em `/lojas/[slug]`, cliques em ofertas, fontes de tráfego
- `services/merchant-analytics.service.ts`: `getMerchantAnalytics(merchantId, period)`
- Eventos a rastrear em Release 1.5: pageview em `/lojas/[slug]`, clique em oferta, clique em "contato"
- Stub atual em `app/merchant/analytics/page.tsx` → substituir por componentes reais

### Módulo 3 — Configurações do Lojista

Permitir que lojistas salvem seus dados de contato via portal (hoje campos ficam vazios).

**Escopo**:
- `/api/merchant/settings` (PATCH) — salvar `contact_phone`, `contact_whatsapp`, `company_website`, `about`
- `app/merchant/settings/page.tsx` — formulário funcional (hoje stub)
- Refletir imediatamente em `/lojas/[slug]`

### Módulo 4 — Expansão de Conectores

Novos conectores para o Acquisition Engine usando o `FetchEngine` estabelecido em Release 1.1 (Shopping China).

**Candidatos** (prioridade por volume de produtos):
- Nissei
- Cellshop
- Mega Eletrônicos  
- Atacado Games

**Pattern**: cada conector = 1 arquivo em `acquisition/connectors/`, parser HTML específico, rate limiting, teste de dry-run.

### Módulo 5 — Busca Avançada

Melhorias na busca que aumentam conversão diretamente.

**Escopo**:
- Autocomplete no `SearchBar` (debounce + dropdown com sugestões)
- Filtro por tipo no `/search` (só produtos / só lojas)
- Produtos na busca com preço (join com `offers` em `searchEverything`)
- Paginação em `/search` (hoje 8 resultados fixos por seção)

### Módulo 6 — Price History Público

Tornar o histórico de preços visível para compradores.

**Escopo**:
- Gráfico de histórico em `/product/[slug]` (linha temporal de `price_history`)
- `PriceHistoryChart` component (pode usar `recharts` ou SVG puro)
- `getOfferPriceMetrics` já implementado e validado (ADR-018) — só falta consumidor de UI

---

## Dívida técnica aberta (não bloqueante para 1.5)

Ver `docs/engineering/TECH_DEBT.md` para a lista completa. Itens de maior impacto:

| Item | Impacto | Referência |
|---|---|---|
| Offer Ranking (ADR-014) não aplicado em `/product/[slug]` | Médio — ofertas ordenadas por preço apenas, não por score | ADR-014 |
| Ordenação por preço no catálogo é "best effort" por página | Baixo | ADR-011 |
| `getStore(id)` — código morto sem consumidor | Baixo | `store.service.ts` |
| `searchProducts` — código morto sem consumidor | Baixo | `product.service.ts` |
| `getOffers()` — código morto sem consumidor | Baixo | `offer.service.ts` |
| `app/layout.tsx` — título/description ainda "Create Next App" | Baixo | Arquivo raiz |
| Tipagem sem validação em runtime (`as Tipo[]`) | Médio (risco oculto) | `CONVENTIONS.md` |
| Design system formal (tokens em `styles/`) | Baixo | `styles/DESIGN_SYSTEM.md` |

---

## Histórico consolidado (Releases entregues)

| Release | Entrega principal | Sprints |
|---|---|---|
| 0.1–0.3 | Produto, Busca, Loja | 3.2–3.4 |
| 0.4 | Domínio de Busca | 3.3 |
| 0.5 | Compare Engine | 4.0 |
| 0.6 | Public Release Readiness, double-fetch eliminado | 4.1 |
| 0.7 | MVP público: imagens, sitemap, robots, 404, SEO | 4.2 |
| 0.8 | Go Live Foundation: analytics, PWA, segurança | 4.3 |
| 0.9 | Acquisition Engine: pipeline universal + Shopping China + Admin MVP | — |
| 1.0 | Admin Platform: CRUD, auth, import pipeline | — |
| 1.1 | First Live Connector: Shopping China em produção | — |
| 1.2 | Merchant OS: portal self-service + 6 tabelas merchant | — |
| 1.3 | Dashboard Consultivo: Score, Níveis, Goals, NextStep | — |
| 1.4 | Merchant Growth Platform: /lojas, /para-lojistas, Progress Engine | — |

Para detalhes de cada entrega, ver `docs/operations/CHANGELOG.md`.
