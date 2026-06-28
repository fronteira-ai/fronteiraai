# FEATURES.md

Inventário de funcionalidades por estado real. Gerado por leitura do código e do histórico de Releases. Atualizado em 2026-06-27 (Release 1.4).

---

## Concluído — Core Platform (Releases 0.1–0.8)

### Home institucional (`/`)
- **Objetivo**: vitrine inicial com proposta de valor, categorias, produtos em destaque, lojas em destaque, showcase de IA, "como funciona", marcas, seção Para Lojistas e CTA.
- **Sprint 4.1**: convertida de dados hardcoded para `async` Server Component com `force-dynamic` e dados reais do Supabase (`getStores`, `getBrands`, `getCategories`, `getProductsCatalog`).
- **Release 1.3.1**: `ForLojistasSection.tsx` adicionada; CTAs auth-aware (`HeroCTAs.tsx`).
- **Arquivos**: `app/page.tsx`, `components/home/*`, `components/layout/Navbar.tsx`, `components/layout/Footer.tsx`

### Página de Produto (`/product/[slug]`)
- **Objetivo**: produto completo — galeria, especificações, ofertas de múltiplas lojas, produtos relacionados, favoritar, compartilhar, botão comparar preços. SEO completo (metadata + JSON-LD `Product`).
- **Sprint 4.1**: convertida de `"use client"` + `useProduct` para Server Component com `_cache.ts` compartilhado (ADR-021 — double-fetch eliminado).
- **Arquivos**: `app/product/[slug]/page.tsx`, `layout.tsx`, `_cache.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`

### Favoritos anônimos
- **Objetivo**: favoritar produtos sem login, persistido no localStorage.
- **Arquivos**: `hooks/useFavorites.ts`, `components/product/FavoriteButton.tsx`
- **Nota**: tabela `favorites` existe no Supabase mas não é usada — favoritos são exclusivamente localStorage até auth ser implementado.

### Sistema de motion/animação
- **Objetivo**: animações de entrada, hover, contadores; respeita `prefers-reduced-motion`.
- **Arquivos**: `styles/animations.ts`, `app/globals.css` (keyframes), `components/home/Reveal.tsx`, `components/home/StatCard.tsx`

### Busca global (`/search`)
- **Objetivo**: pesquisa de produtos, lojas, marcas e categorias com URL como fonte de verdade.
- **Arquivos**: `app/search/page.tsx`, `loading.tsx`, `error.tsx`; `hooks/useSearch.ts`; `services/search.service.ts`
- **Limitação**: sem filtro por tipo, paginação ou autocomplete — 8 resultados por seção; produtos na busca não exibem preço (sem join com offers).

### Página de Loja (`/store/[slug]`)
- **Objetivo**: perfil completo de loja — contato, horário, ofertas, lojas relacionadas. SEO (metadata + JSON-LD `LocalBusiness`).
- **Sprint 4.1**: convertida para Server Component com `_cache.ts` (ADR-021).
- **Arquivos**: `app/store/[slug]/page.tsx`, `layout.tsx`, `_cache.ts`, `loading.tsx`, `error.tsx`, `not-found.tsx`; `components/store/*`

### Catálogo de Produtos (`/products`)
- **Objetivo**: listagem filtrada de produtos — categoria, marca, loja, faixa de preço, disponibilidade, busca textual, paginação SSR, ordenação. SEO (metadata + JSON-LD `CollectionPage`).
- **Arquivos**: `app/products/page.tsx`, `loading.tsx`, `error.tsx`; `services/product.service.ts` (`getProductsCatalog`); `hooks/useProductFilters.ts`; `components/product/ProductFilters.tsx`

### Compare Engine (`/compare/[slug]`)
- **Objetivo**: comparar todas as lojas que vendem um produto — preços, ranking, histórico, especificações.
- **Release 0.5**: `services/compare.service.ts` (3 queries por comparação, batch de `price_history` — ADR-020); `app/compare/[slug]/page.tsx`, `app/api/compare/route.ts`; `hooks/useCompare.ts`; `components/compare/*`.
- **Algoritmo de ranking** (ADR-014): pontuação composta 0–100 (preço 50%, disponibilidade 25%, rating da loja 15%, qualidade do cadastro 10%).

### SEO, PWA e Analytics (Releases 0.7–0.8)
- `app/sitemap.ts` — sitemap dinâmico via Supabase (produtos, compare, lojas, `/lojas`, `/para-lojistas`)
- `app/robots.ts` — robots.txt (Allow: /, Disallow: /api/ /_next/)
- `app/not-found.tsx` — 404 global com design de marca
- `app/icon.tsx` / `app/apple-icon.tsx` — favicon dinâmico (ImageResponse)
- `app/manifest.ts` — manifesto PWA
- `components/analytics/Analytics.tsx` — GA4 + Microsoft Clarity
- `utils/analytics.ts` — eventos de tracking (compare, store)
- 6 security headers em `next.config.ts`

### Price Engine
- **Release**: Sprint 3.9 (backend); tabela `price_history` aplicada manualmente em produção.
- **Funções**: `updateOfferPrice()` (único caminho de escrita para preço), `getOfferPriceMetrics()` (lowest, highest, variação %).
- **Arquivos**: `services/offer.service.ts`, `types/priceHistory.ts`, `database/migrations/0006_proposed_price_history.sql`

### Data Foundation
- **Supabase Storage**: bucket `catalog` público — produtos, lojas, marcas. `utils/storage.ts` com builders de URL.
- **RLS pública** (ADR-019): todas as 6 tabelas públicas legíveis pela chave anônima — validado com 22 asserções.
- **Seed Engine**: `database/seed/` — brands, categories, stores, products, offers com dry-run por padrão.

---

## Concluído — Acquisition Engine (Release 0.9)

**Objetivo**: pipeline universal de aquisição de dados — qualquer origem (CSV, JSON, API REST, XML, ERP) passa pelo mesmo pipeline.

**Pipeline**: Conector → Parser → Validation → Normalization → Deduplication → Media Pipeline → CatalogWriter → Observability

**Arquivos**: `acquisition/` (types/, core/, parsers/, engines/, persistence/, observability/, lib/, connectors/, datasets/, scripts/)

**Scripts disponíveis**:
- `npm run acquisition:validate` — 33/33 asserções
- `npm run acquisition:import-json` / `:import-json:execute`
- `npm run acquisition:import-csv` / `:import-csv:execute`

**Conectores de referência**: `JsonFileConnector`, `CsvFileConnector`. Ver `docs/engineering/CONNECTOR_GUIDE.md`.

---

## Concluído — Admin Platform (Release 1.0)

**Objetivo**: plataforma de operações completa para administradores e operadores.

**Autenticação**: `@supabase/ssr`, cookie-based, roles `admin`/`operator`. Três clientes Supabase: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/service.ts`.

**Módulos**:
- Dashboard com métricas de catálogo
- CRUD: products, stores, offers, brands, categories
- Pipeline de importação com UI (conecta ao Acquisition Engine)
- Centro de qualidade — validação de integridade
- Log de importações (`import_logs`)
- Configurações

**Arquivos**: `app/admin/*` (12+ rotas), `app/api/admin/*`, `lib/admin-auth.ts`, `components/admin/*`

---

## Concluído — First Live Connector (Release 1.1)

**Objetivo**: primeiro conector real de uma loja integrado ao Acquisition Engine.

**Loja**: Shopping China (`shoppingchina.com.py`). `FetchEngine` com `HttpFetchStrategy`, parser de listagem e detalhe HTML, rate limiting. 30 produtos reais em 3 categorias. Migrations aplicadas: 0010 (store + connector_configs) + 0011 (UNIQUE em offers).

---

## Concluído — Merchant OS (Release 1.2)

**Objetivo**: portal self-service completo para lojistas — cadastro, dashboard, gestão de ofertas.

**Portal**: `app/merchant/*` (11 páginas): login, onboarding (5 passos), dashboard, offers, import, settings, plans, analytics (stub).

**Merchant Score**: 0-100, calculado on-demand em `computeMerchantScore()` — preço/disponibilidade/completude do perfil/velocidade de importação.

**Banco de dados**: 6 novas tabelas — `merchant_plans`, `merchants`, `merchant_stores`, `merchant_audit_logs`, `merchant_analytics_events`, `merchant_recommendations`. Migration 0012.

**Planos**: Free / Pro / Business / Enterprise — tabela `merchant_plans` com seed. Gateway de pagamento: Release futuro.

**ADRs**: ADR-031 a ADR-035

---

## Concluído — Dashboard Consultivo (Release 1.3)

**Objetivo**: transformar o dashboard do Merchant OS em motor de crescimento orientado a ação.

**Componentes**:
- `NextStepCard` — ação única prioritária com urgência (critical/high/medium)
- `GoalsPanel` — 10 missões de progresso com progress bars
- `ScoreCard` redesenhado — 6 níveis de lojista com ladder

**Níveis**: Iniciante → Bronze → Prata → Ouro → Diamante → Elite

**Serviços**: `getMerchantLevel()`, `computeNextStep()`, `computeGoals()` em `services/merchant.service.ts`.

---

## Concluído — Merchant Growth Platform (Release 1.4)

**Objetivo**: tornar a reputação dos lojistas pública e criar superfície de aquisição para o side da oferta.

**Páginas públicas**:
- `/lojas` — ranking de até 30 lojas ordenado por Merchant Score
- `/lojas/[slug]` — página premium por loja: hero, badges (Verificada, Score), stats, sobre, contato, serviços, ofertas reais, lojas relacionadas. JSON-LD `LocalBusiness`.
- `/para-lojistas` — landing page institucional: benefícios, como funciona, planos, FAQ, CTAs.

**Outros**:
- `MerchantProgressCard` — barra de progresso do perfil (7 critérios)
- Navbar: "Lojas" adicionado ao menu; "Para Lojistas" no menu
- Footer: "Para Lojistas" com coluna própria
- Sitemap: `/lojas`, `/lojas/[slug]`, `/para-lojistas`

**Arquivos**: `app/lojas/page.tsx`, `app/lojas/[slug]/page.tsx`, `app/para-lojistas/page.tsx`, `services/stores-public.service.ts`

**ADRs**: ADR-036 a ADR-039

---

## Planejado (Releases 1.5+)

| Feature | Release alvo | Referência |
|---|---|---|
| Sistema de reviews de compradores (tabela `reviews`, moderação) | 1.5 | ADR-038 |
| Analytics dashboard para merchants com dados reais | 1.5 | ADR-039 |
| `/merchant/settings` — salvar WhatsApp/phone/website | 1.5 | MASTER_ROADMAP |
| Expansão de conectores (Nissei, Cellshop, Mega Eletrônicos, Atacado Games) | 1.5 | MASTER_ROADMAP |
| Busca com filtros avançados e autocomplete | 1.5 | docs/engineering/TECH_DEBT.md |
| Price History visível para compradores (gráfico em `/product/[slug]`) | 1.5 | ADR-017 |
| Favoritos sincronizados com Supabase (requer Auth) | 1.5–2.0 | MASTER_ROADMAP |
| Alertas de preço para usuários autenticados | 2.0 | MASTER_ROADMAP |
| Recomendações personalizadas (histórico de busca/favoritos) | 2.0 | MASTER_ROADMAP |
| ParaguAI Brain v1 — busca semântica em linguagem natural | 2.0 | VISION_2035.md |
| Ranking de ofertas inteligente (ADR-014 implementado em código) | 2.0 | ADR-014 |
| Ordenação por preço com view materializada (ADR-011) | 1.x | ADR-011 |
| App mobile nativo (iOS + Android) | 3.0 | MASTER_ROADMAP |
| API pública para parceiros | 3.0–4.0 | MASTER_ROADMAP |
| Marketplace multi-vendedor | 4.0 | MASTER_ROADMAP |
| Design system formal (tokens em `styles/`) | — | docs/engineering/TECH_DEBT.md |

---

## Placeholders intencionais (arquivos vazios)

Os arquivos abaixo existem como reserva de nome para trabalho planejado. Não são código esquecido.

| Arquivo | Status | Quando preencher |
|---|---|---|
| `services/ai.service.ts` | Vazio | ParaguAI Brain (Release 2.0+) |
| `hooks/useOffers.ts` | Vazio | Quando houver tela de gestão de ofertas client-side |
| `types/user.ts` | Vazio | Auth/conta de usuário comprador |
| `types/review.ts` | Vazio | Release 1.5 (reviews de compradores) |
| `components/ui/Card.tsx` | Vazio | Se extraído como componente genérico |
| `components/ui/Loading.tsx` | Vazio | Spinner global (hoje cada página tem seu skeleton) |
| `components/ui/SearchInput.tsx` | Vazio | Campo de busca com ícone embutido (distinto do Input genérico) |
| `utils/format.ts` | Vazio | Formatadores de data/número não ainda necessários |
| `utils/slug.ts` | **Implementado** desde Release 0.9 (`slugify()`) |
| `utils/validators.ts` | Vazio | Validadores de runtime (Release futura) |
