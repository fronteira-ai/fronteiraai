# NEXT_STEPS.md

Estado atual e próximos passos do ParaguAI. Atualizado em 2026-06-27 (Release 1.4 entregue).

Para o histórico detalhado de cada Sprint/Release, consultar `docs/operations/CHANGELOG.md`. Para o roadmap estratégico, consultar `docs/product/MASTER_ROADMAP.md`.

---

## Estado atual: Release 1.4 completo

**Plataforma funcionando em produção** com 67 rotas, dados reais, autenticação admin e merchant, Acquisition Engine, e surface pública para lojistas.

Release 1.4 entregou:
- `/lojas` — ranking público de lojas por Merchant Score
- `/lojas/[slug]` — página premium por loja com dados reais, JSON-LD, SEO
- `/para-lojistas` — landing page institucional
- `MerchantProgressCard` — progresso do perfil no dashboard
- Navbar/Footer atualizados
- Sitemap expandido

**Stack certificada**: Next.js 16.2.9 + React 19.2.4 + Supabase + Vercel. Foundation Empresarial v1.0 LOCKED (8 documentos permanentes).

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
