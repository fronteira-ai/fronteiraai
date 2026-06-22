# PROJECT_STATUS.md

Auditoria gerada por leitura completa do código-fonte (sem alterações de código). Substitui o conteúdo anterior deste arquivo, que descrevia um estado de planejamento ("Sprint 0", 15%) já superado pelo código real.

Última atualização: 2026-06-22 (Sprint 3.3 — Domínio de Busca, Release 0.4)
Branch auditada: `main` @ `d52f9df` + Sprint 3.3 (Busca) desta auditoria

---

## Visão geral

**ParaguAI** é um marketplace de comparação de preços (UI em português) para lojas do Paraguai/região de fronteira. Usuários pesquisam produtos/lojas/marcas; o produto final prevê busca assistida por IA, histórico de preços e recomendações. Mercado inicial: Ciudad del Este.

## Objetivo do produto

Tornar-se a maior plataforma inteligente de compras do Paraguai, ajudando o usuário a: pesquisar produtos, comparar preços entre lojas, descobrir lojas confiáveis e receber recomendações de compra via IA — antes de atravessar a fronteira.

## Stack utilizada

- **Next.js 16.2.9** (App Router, Turbopack) + **React 19.2.4** + **TypeScript** (strict)
- **Tailwind CSS v4** (`@theme inline` em `app/globals.css`, sem `tailwind.config`)
- **Supabase** (`@supabase/supabase-js`) como backend/DB (PostgreSQL)
- **lucide-react** para ícones
- Hospedagem/deploy: **Vercel**
- Sem suíte de testes configurada. Sem CI (não há `.github/workflows` nem `vercel.json` no repositório).

## Arquitetura atual

Fluxo em camadas, conforme `docs/CLAUDE.md`/`CLAUDE.md`:

```
types/*.ts → services/*.service.ts → hooks/use*.ts → components/* → app/*
```

Ver `docs/ARCHITECTURE.md` (atualizado nesta auditoria) para o mapeamento completo.

## Funcionalidades implementadas

- **Home (`/`)** — todas as seções (Hero, Categories, Offers, FeaturesStores, AIShowcase, HowItWorks, Brands, Stats, CTASection) renderizadas com **dados de exemplo hardcoded** em `app/page.tsx`/`constants/categories.ts`, não com dados reais do Supabase.
- **Página de Produto (`/product/[slug]`)** — única rota com integração real ponta-a-ponta: `product.service` + `offer.service` → `useProduct`/layout server-side → componentes (`ProductHeader`, `ProductGallery`, `ProductSpecifications`, `ProductOffers`, `ProductBreadcrumb`, `RelatedProducts`, `FavoriteButton`, `ShareButton`). Inclui `generateMetadata`, JSON-LD (schema.org Product) e estados `loading.tsx`/`error.tsx`/`not-found.tsx`.
- **Favoritos** — `useFavorites` funcional via `localStorage` (`useSyncExternalStore`), sem dependência de Supabase/autenticação.
- **Navbar/Footer** — completos, estáticos.
- **Sistema de motion/animação** (Sprint 3.2) — `styles/animations.ts` + keyframes em `globals.css`, usado em quase todos os componentes (`Reveal`, `cardHover`, contadores animados em `StatCard`), com respeito a `prefers-reduced-motion`.
- **Busca (`/search`)** (Sprint 3.3) — fluxo completo ponta-a-ponta: `app/search/page.tsx` (Server Component) lê `searchParams.q`, tem `generateMetadata` (canonical, OG, `robots: noindex` para resultados com query), e renderiza `SearchResultsAsync` dentro de `<Suspense>` (fallback `SearchResultsSkeleton`). `hooks/useSearch.ts` governa o input/navegação mantendo a URL como fonte de verdade. `services/search.service.ts` (`searchEverything`) busca `products`/`stores`/`brands`/`categories` em paralelo, escapa `%`/`_` do termo do usuário, limita 8 resultados por seção, e lança erro apenas se todas as queries falharem (capturado por `app/search/error.tsx`, que usa a API `unstable_retry` do Next 16.2 e detecta estado offline). `SearchResults` agrupa por tipo com `EmptyState` para estado vazio/sem query. JSON-LD `WebSite`/`SearchAction` adicionado em `app/layout.tsx`.

## Funcionalidades parcialmente implementadas

- **Domínio de Loja** — `types/store.ts`, `services/store.service.ts` e `components/store/StoreCard.tsx` funcionam e são usados na Home, mas **não existe rota `/store/[slug]`**, e `components/store/StoreGrid.tsx`, `StoreDetails.tsx` e `hooks/useStore.ts` existem como arquivos vazios (placeholders).
- **`components/product/ProductGrid.tsx`** — arquivo vazio; nada o importa ainda (não usado para listar produtos em `/products`, rota que também não existe).

## Funcionalidades não iniciadas

- Listagem `/products`, `/stores`, `/compare`, `/favorites`, `/price-history`, `/about`, `/contact`, `/privacy`, `/terms` — todas linkadas no `Navbar`/`Footer`, nenhuma existe (404 em produção).
- Autenticação de usuário (`types/user.ts` vazio, sem Supabase Auth configurado).
- Reviews (`types/review.ts` vazio).
- Marcas e categorias dinâmicas (`services/brand.service.ts`, `services/category.service.ts` vazios; Home usa listas estáticas).
- IA/Assistente de compras (`services/ai.service.ts` vazio; `ai/` é só placeholders `.gitkeep`).
- Histórico de preços, crawler, painel admin, marketplace multi-vendedor — nada começado.
- Design system formal (`styles/theme.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts`, `styles/DESIGN_SYSTEM.md` — todos vazios; cores/espaçamento hoje são hardcoded inline via Tailwind arbitrary values, não tokens centralizados).

## Páginas existentes

| Rota | Tipo | Status |
|---|---|---|
| `/` | Server Component | Completa (dados estáticos) |
| `/search` | Server Component (com `<Suspense>`) | Completa, integrada ao Supabase |
| `/product/[slug]` | Client page + Server layout | Completa, integrada ao Supabase |

## Componentes existentes

- `home/`: Hero, SearchBar, Categories, Offers, FeaturesStores, AIShowcase, HowItWorks, Brands, Stats, CTASection — 10 componentes, todos implementados. `SearchBar` agora delega estado/navegação a `useSearch` (Sprint 3.3).
- `layout/`: Navbar, Footer — implementados.
- `product/`: ProductCard, ProductGallery, ProductHeader, ProductSpecifications, ProductOffers, ProductBreadcrumb, RelatedProducts, FavoriteButton, ShareButton, ProductHighlightCard — implementados. `ProductGrid` — vazio.
- `store/`: StoreCard — implementado. `StoreGrid`, `StoreDetails` — vazios.
- `search/`: SearchResults (Sprint 3.3, renderiza resultados reais agrupados por tipo), SearchResultsSkeleton (novo) — implementados.
- `ui/`: Badge, Button, Chip, Container, Section, SectionTitle, CategoryCard, FeatureCard, StatCard, Logo, Reveal, GlassCard, GradientCard, EmptyState (Sprint 3.3) — implementados (14). `Card`, `Input`, `Loading`, `SearchInput` — vazios (4).

## Hooks existentes

- `useProduct` — implementado, usado em `/product/[slug]`.
- `useFavorites` — implementado, usado em `FavoriteButton`.
- `useSearch` (Sprint 3.3) — implementado, usado em `SearchBar`.
- `useStore`, `useOffers` — arquivos vazios (placeholders).

## Services existentes

- `product.service.ts` — implementado (`getProducts`, `getProductBySlug`, `getRelatedProducts`, `searchProducts`).
- `offer.service.ts` — implementado (`getOffers`, `getOffersByProduct`).
- `store.service.ts` — implementado (`getStores`, `getStore`).
- `search.service.ts` — implementado e em uso (Sprint 3.3): `searchEverything` agora também busca `categories`, escapa `%`/`_` do termo do usuário, limita resultados por seção, e é chamado por `app/search/page.tsx` via `React.cache`.
- `brand.service.ts`, `category.service.ts`, `ai.service.ts` — vazios.

## Tipos existentes

`Product`/`ProductWithRelations`/`ProductHighlight`, `Offer`/`OfferWithStore`, `Store`, `Brand`, `Category`, `Favorite`, `Search` (`SearchResponse`, Sprint 3.3) — implementados. `User`, `Review` — vazios.

## Providers existentes

**Nenhum.** Não há `providers/` no projeto, nenhum React Context global, nenhum theme/auth provider. Estado global (favoritos) é resolvido via módulo singleton + `useSyncExternalStore`, fora do padrão de providers.

## Integração com Supabase

Cliente único em `lib/supabase.ts`, criado a partir de `env.NEXT_PUBLIC_SUPABASE_URL`/`env.NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Consolidado nesta sprint** (ver `docs/DECISIONS.md`, ADR-001): toda leitura de `process.env` agora passa exclusivamente por `lib/env.ts`, que lança erro descritivo e distinto para ambiente local ("defina em `.env.local`, veja `.env.example`") vs. Vercel ("configure no painel do projeto"), em vez do antigo `createClient(url!, key!)` que só dizia `supabaseUrl is required.`. Testado manualmente: build com `.env.local` ausente produz a mensagem nova corretamente.

Esquema do banco documentado em `database/DATABASE.md`/`ERD.md` (não código, apenas descrição), mas **sem migrations versionadas** — `database/migrations`, `database/seed`, `database/sql` contêm apenas `.gitkeep`. O schema real existe somente no painel do Supabase.

## Integração com Vercel / Deploy

Projeto linkado a um projeto Vercel (`.vercel/project.json` presente localmente, ignorado pelo Git). Histórico recente de commits (`9e8298e`, `ae432d3`, `3d3f1ff`, `647382f`) indica uma sessão de troubleshooting de deploy, já resolvida (build local reproduzido em worktree limpo passa). Variáveis de ambiente do Supabase precisam estar configuradas no painel do projeto Vercel — não há como confirmar isso a partir do repositório; ver `docs/NEXT_STEPS.md`/relatório da sprint para o status verificado via CLI nesta sessão.

`.env.example` (raiz do projeto) agora é commitável — corrigido nesta sprint um `.gitignore` que bloqueava esse arquivo por engano (regra genérica `.env*` sem exceção). Ver ADR-002.

## CI atual

**Não existe.** Nenhum workflow de GitHub Actions, nenhum hook de pre-push automatizado além do que o Vercel roda no próprio build de deploy.

## Status do build

✅ `npm run build` — sucesso (Turbopack, 4 rotas: `/` estático, `/_not-found`, `/product/[slug]` dinâmico, `/search` dinâmico — passou a ser dinâmico nesta sprint por depender de `searchParams`).

## Status do lint

✅ `npm run lint` — 0 erros, 5 warnings (`@next/next/no-img-element` em `ProductCard`, `ProductGallery` (×2), `ProductHighlightCard`, `StoreCard` — uso de `<img>` em vez de `next/image`).

## Status do TypeScript

✅ `npx tsc --noEmit` — 0 erros.

## Sprint 3.2 — Consolidação (sem novas features de negócio)

Esta sprint não adicionou funcionalidades; consolidou a base de engenharia: unificação do acesso a `process.env` em `lib/env.ts` (ADR-001), correção do `.gitignore` que bloqueava `.env.example` (ADR-002), limpeza de scripts quebrados/não-portáveis em `package.json` (ADR-003, ADR-004), e a criação de seis documentos permanentes de engenharia: `docs/DECISIONS.md`, `CONVENTIONS.md`, `API_CONTRACTS.md`, `DOMAIN_MODEL.md`, `COMPONENT_INDEX.md`, `DEPENDENCY_GRAPH.md`. Nenhuma rota, componente ou comportamento de produto foi alterado.

## Sprint 3.3 — Domínio de Busca (Release 0.4, parte 1)

Liga a busca de ponta a ponta: `app/search/page.tsx` lê `searchParams.q` e ganha `generateMetadata` (canonical/OG/robots); `hooks/useSearch.ts` e `services/search.service.ts` saem do estado de placeholder/código morto; `SearchResults` passa a renderizar resultados reais agrupados por tipo (produtos/lojas/categorias/marcas) com estado vazio via `EmptyState` (novo componente genérico em `ui/`); adicionados `loading.tsx`/`error.tsx`/`SearchResultsSkeleton` espelhando o padrão já usado em `/product/[slug]`; JSON-LD `WebSite`/`SearchAction` adicionado ao root layout, que também ganhou metadata customizada (antes era o padrão do `create-next-app`). Filtros, paginação e autocomplete ficam para uma fase 2 do Release 0.4. Validado com `npm run lint`/`typecheck`/`build`.

---

## Status Geral: **35%**

Critério: dos 8 domínios do roadmap original (Home, Produto, Loja, Busca, Comparação, IA, Admin, Crawler), 2 estão completos com dados reais (Produto, Busca), 1 está com UI pronta mas dados mockados (Home), 1 está começado parcialmente (Loja), e os demais 4 não foram iniciados. A fundação técnica (arquitetura, tipos, convenções, build/lint/TS limpos) está sólida, e a Busca sair do estado "decorativo" fecha um dos três domínios centrais da Home (Produto, Loja, Busca).
