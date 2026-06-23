# PROJECT_STATUS.md

Auditoria gerada por leitura completa do código-fonte (sem alterações de código). Substitui o conteúdo anterior deste arquivo, que descrevia um estado de planejamento ("Sprint 0", 15%) já superado pelo código real.

Última atualização: 2026-06-22 (Sprint 3.4 — Domínio de Loja, Release 0.3)
Branch auditada: `main` @ `494da40` + Sprint 3.4 (Loja) desta auditoria

> ⚠️ **Achado de dados (Sprint 3.4)**: testando manualmente com o Supabase real, as 5 lojas cadastradas têm `slug: null` e a tabela `products` está vazia (0 linhas). Os domínios de Produto, Busca e Loja estão **completos no código** (validados com lint/typecheck/build e testados contra o Supabase real), mas **sem dados reais navegáveis hoje** — `/product/[slug]` e `/store/[slug]` retornam 404 para qualquer slug porque nenhuma linha tem slug preenchido. Ver ADR-007 em `docs/DECISIONS.md` e `docs/TECH_DEBT.md`. Não é um bug de implementação.

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
- **Página de Loja (`/store/[slug]`)** (Sprint 3.4) — segunda rota com integração real ponta-a-ponta, espelhando exatamente o padrão de `/product/[slug]`: `store.service` (`getStoreBySlug`, `getRelatedStores`) + `offer.service` (`getOffersByStore`) → `useStore`/layout server-side → componentes (`StoreDetails`, `StoreOffers`, `StoreGrid`). Inclui `generateMetadata`, JSON-LD (schema.org `LocalBusiness`) e estados `loading.tsx`/`error.tsx`/`not-found.tsx`. Contato e horário de funcionamento **não implementados** (não existem no schema real — ver ADR-006); avaliações mostram `EmptyState` honesto ("Avaliações em breve"), sem dados mocados.

## Funcionalidades parcialmente implementadas

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
| `/store/[slug]` | Client page + Server layout | Completa, integrada ao Supabase (Sprint 3.4) |

## Componentes existentes

- `home/`: Hero, SearchBar, Categories, Offers, FeaturesStores, AIShowcase, HowItWorks, Brands, Stats, CTASection — 10 componentes, todos implementados. `SearchBar` agora delega estado/navegação a `useSearch` (Sprint 3.3).
- `layout/`: Navbar, Footer — implementados.
- `product/`: ProductCard, ProductGallery, ProductHeader, ProductSpecifications, ProductOffers, ProductBreadcrumb, RelatedProducts, FavoriteButton, ShareButton, ProductHighlightCard — implementados. `ProductGrid` — vazio.
- `store/`: StoreCard, StoreDetails, StoreGrid, StoreOffers (3 últimos novos na Sprint 3.4) — todos implementados.
- `search/`: SearchResults (Sprint 3.3, renderiza resultados reais agrupados por tipo), SearchResultsSkeleton — implementados.
- `ui/`: Badge, Button, Chip, Container, Section, SectionTitle, CategoryCard, FeatureCard, StatCard, Logo, Reveal, GlassCard, GradientCard, EmptyState — implementados (14). `Card`, `Input`, `Loading`, `SearchInput` — vazios (4).

## Hooks existentes

- `useProduct` — implementado, usado em `/product/[slug]`.
- `useFavorites` — implementado, usado em `FavoriteButton`.
- `useSearch` — implementado, usado em `SearchBar`.
- `useStore` (Sprint 3.4) — implementado, espelha `useProduct`, usado em `/store/[slug]`.
- `useOffers` — arquivo vazio (placeholder).

## Services existentes

- `product.service.ts` — implementado (`getProducts`, `getProductBySlug`, `getRelatedProducts`, `searchProducts`).
- `offer.service.ts` — implementado (`getOffers`, `getOffersByProduct`, `getOffersByStore` novo na Sprint 3.4).
- `store.service.ts` — implementado (`getStores`, `getStore`, `getStoreBySlug` e `getRelatedStores` novos na Sprint 3.4).
- `search.service.ts` — implementado e em uso: `searchEverything` busca `products`/`stores`/`brands`/`categories`, escapa `%`/`_` do termo do usuário, limita resultados por seção, chamado por `app/search/page.tsx` via `React.cache`.
- `brand.service.ts`, `category.service.ts`, `ai.service.ts` — vazios.

## Tipos existentes

`Product`/`ProductWithRelations`/`ProductHighlight`, `Offer`/`OfferWithStore`/`OfferWithProduct` (novo, Sprint 3.4), `Store`, `Brand`, `Category`, `Favorite`, `Search` (`SearchResponse`) — implementados. `User`, `Review` — vazios.

## Providers existentes

**Nenhum.** Não há `providers/` no projeto, nenhum React Context global, nenhum theme/auth provider. Estado global (favoritos) é resolvido via módulo singleton + `useSyncExternalStore`, fora do padrão de providers.

## Integração com Supabase

Cliente único em `lib/supabase.ts`, criado a partir de `env.NEXT_PUBLIC_SUPABASE_URL`/`env.NEXT_PUBLIC_SUPABASE_ANON_KEY`. **Consolidado nesta sprint** (ver `docs/DECISIONS.md`, ADR-001): toda leitura de `process.env` agora passa exclusivamente por `lib/env.ts`, que lança erro descritivo e distinto para ambiente local ("defina em `.env.local`, veja `.env.example`") vs. Vercel ("configure no painel do projeto"), em vez do antigo `createClient(url!, key!)` que só dizia `supabaseUrl is required.`. Testado manualmente: build com `.env.local` ausente produz a mensagem nova corretamente.

Esquema do banco documentado em `database/DATABASE.md`/`ERD.md` (não código, apenas descrição), mas **sem migrations versionadas** — `database/seed`, `database/sql` contêm apenas `.gitkeep`; `database/migrations` ganhou na Sprint 3.4 uma primeira **proposta** não aplicada (`0001_proposed_store_contact_hours.sql`, ver ADR-006). O schema real continua existindo apenas no painel do Supabase.

Consulta direta ao Supabase nesta sprint confirmou: `stores` tem 5 linhas reais, todas com `slug: null`; `products` tem 0 linhas. Ver o aviso no topo deste documento e ADR-007.

## Integração com Vercel / Deploy

Projeto linkado a um projeto Vercel (`.vercel/project.json` presente localmente, ignorado pelo Git). Histórico recente de commits (`9e8298e`, `ae432d3`, `3d3f1ff`, `647382f`) indica uma sessão de troubleshooting de deploy, já resolvida (build local reproduzido em worktree limpo passa). Variáveis de ambiente do Supabase precisam estar configuradas no painel do projeto Vercel — não há como confirmar isso a partir do repositório; ver `docs/NEXT_STEPS.md`/relatório da sprint para o status verificado via CLI nesta sessão.

`.env.example` (raiz do projeto) agora é commitável — corrigido nesta sprint um `.gitignore` que bloqueava esse arquivo por engano (regra genérica `.env*` sem exceção). Ver ADR-002.

## CI atual

**Não existe.** Nenhum workflow de GitHub Actions, nenhum hook de pre-push automatizado além do que o Vercel roda no próprio build de deploy.

## Status do build

✅ `npm run build` — sucesso (Turbopack, 5 rotas: `/` estático, `/_not-found`, `/product/[slug]` dinâmico, `/search` dinâmico, `/store/[slug]` dinâmico — nova nesta sprint).

## Status do lint

✅ `npm run lint` — 0 erros, 6 warnings (`@next/next/no-img-element` em `ProductCard`, `ProductGallery` (×2), `ProductHighlightCard`, `StoreCard`, `app/store/[slug]/page.tsx` (banner) — uso de `<img>` em vez de `next/image`).

## Status do TypeScript

✅ `npx tsc --noEmit` — 0 erros.

## Sprint 3.2 — Consolidação (sem novas features de negócio)

Esta sprint não adicionou funcionalidades; consolidou a base de engenharia: unificação do acesso a `process.env` em `lib/env.ts` (ADR-001), correção do `.gitignore` que bloqueava `.env.example` (ADR-002), limpeza de scripts quebrados/não-portáveis em `package.json` (ADR-003, ADR-004), e a criação de seis documentos permanentes de engenharia: `docs/DECISIONS.md`, `CONVENTIONS.md`, `API_CONTRACTS.md`, `DOMAIN_MODEL.md`, `COMPONENT_INDEX.md`, `DEPENDENCY_GRAPH.md`. Nenhuma rota, componente ou comportamento de produto foi alterado.

## Sprint 3.3 — Domínio de Busca (Release 0.4, parte 1)

Liga a busca de ponta a ponta: `app/search/page.tsx` lê `searchParams.q` e ganha `generateMetadata` (canonical/OG/robots); `hooks/useSearch.ts` e `services/search.service.ts` saem do estado de placeholder/código morto; `SearchResults` passa a renderizar resultados reais agrupados por tipo (produtos/lojas/categorias/marcas) com estado vazio via `EmptyState` (novo componente genérico em `ui/`); adicionados `loading.tsx`/`error.tsx`/`SearchResultsSkeleton` espelhando o padrão já usado em `/product/[slug]`; JSON-LD `WebSite`/`SearchAction` adicionado ao root layout, que também ganhou metadata customizada (antes era o padrão do `create-next-app`). Filtros, paginação e autocomplete ficam para uma fase 2 do Release 0.4. Validado com `npm run lint`/`typecheck`/`build`.

## Sprint 3.4 — Domínio de Loja (Release 0.3)

Fecha o terceiro domínio central da Home, espelhando exatamente a arquitetura do Domínio de Produto: `store.service.ts` ganha `getStoreBySlug`/`getRelatedStores`; `offer.service.ts` ganha `getOffersByStore` (+ tipo `OfferWithProduct`); `hooks/useStore.ts` espelha `useProduct.ts`; `components/store/StoreDetails.tsx`/`StoreGrid.tsx`/`StoreOffers.tsx` saem do estado de placeholder; `app/store/[slug]/` ganha `layout.tsx` (metadata + JSON-LD `LocalBusiness`), `page.tsx`, `loading.tsx`, `error.tsx` (`unstable_retry`), `not-found.tsx`; `constants/routes.ts` ganha `storePath`/`storeUrl`, usado por `StoreCard` no lugar de string literal. Contato e horário de funcionamento **não foram implementados** (não existem no schema real do Supabase) — proposta de migration documentada em `database/migrations/0001_proposed_store_contact_hours.sql` (ADR-006), não aplicada. Avaliações mostram um `EmptyState` honesto, sem dados fictícios. Testes manuais contra o Supabase real revelaram que nenhuma loja tem `slug` preenchido hoje (ADR-007) — achado de dados, não de código. Validado com `npm run lint`/`typecheck`/`build`.

---

## Status Geral: **40%**

Critério: dos 8 domínios do roadmap original (Home, Produto, Loja, Busca, Comparação, IA, Admin, Crawler), 3 estão completos no código com integração real ao Supabase (Produto, Busca, Loja — embora sem dados reais navegáveis hoje, ver aviso no topo), 1 está com UI pronta mas dados mockados (Home), e os demais 4 não foram iniciados. A fundação técnica (arquitetura, tipos, convenções, build/lint/TS limpos) está sólida, e os três domínios centrais da Home (Produto, Busca, Loja) estão tecnicamente fechados — o próximo gargalo real é dados de produção, não código.
