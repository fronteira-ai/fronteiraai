# PROJECT_STATUS.md

Auditoria gerada por leitura completa do código-fonte. Substitui o conteúdo anterior deste arquivo.

Última atualização: 2026-06-23 (Sprint 3.5 — Catálogo Premium de Produtos)
Branch auditada: `main` @ `d4c83ff` + Sprint 3.5 (correção de dados + catálogo) desta atualização

> ✅ **Bugs críticos corrigidos (Sprint 3.5)**: os bugs confirmados na Sprint 3.4.1 (`offer.price`/`stock`/`installments`/`url`, `store.banner_url`/`verified` divergindo do schema real) foram corrigidos antes de construir o catálogo de produtos sobre eles — ver `docs/DECISIONS.md` ADR-009. `types/offer.ts`/`types/store.ts` agora usam os nomes reais (`price_usd`/`price_brl`, `in_stock`, `product_url`, `cover_image`, `is_verified`, mais os 13 campos de contato/horário que já existiam no banco).
>
> ⚠️ **Achado de dados (ainda válido, Sprint 3.4)**: as 5 lojas cadastradas continuam com `slug: null` e a tabela `products` continua vazia (0 linhas) — sem dados reais navegáveis hoje em nenhum domínio, incluindo o novo catálogo. Ver ADR-007.

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

Ver `docs/ARCHITECTURE.md` para o mapeamento completo, incluindo o novo fluxo do catálogo de produtos.

## Funcionalidades implementadas

- **Home (`/`)** — todas as seções renderizadas com **dados de exemplo hardcoded** em `app/page.tsx`/`constants/categories.ts`, não com dados reais do Supabase.
- **Página de Produto (`/product/[slug]`)** — integração real ponta-a-ponta: `product.service` + `offer.service` → `useProduct`/layout server-side → componentes. `generateMetadata`, JSON-LD (Product), estados `loading`/`error`/`not-found`. Breadcrumb agora via `components/ui/Breadcrumb.tsx` genérico (Sprint 3.5).
- **Favoritos** — `useFavorites` funcional via `localStorage`, sem dependência de Supabase/autenticação.
- **Navbar/Footer** — completos, estáticos. `/products` deixou de ser link morto (Sprint 3.5).
- **Sistema de motion/animação** — `styles/animations.ts` + keyframes, usado na maioria dos componentes, respeitando `prefers-reduced-motion`.
- **Busca (`/search`)** — fluxo completo ponta-a-ponta, com filtros/paginação/autocomplete ainda pendentes (ver `TECH_DEBT.md`).
- **Página de Loja (`/store/[slug]`)** — integração real ponta-a-ponta, espelhando o Domínio de Produto. **Sprint 3.5**: `StoreDetails` ganhou a seção de Contato/Horário (telefone, WhatsApp, e-mail, site, endereço, horário), antes bloqueada por uma premissa de schema incorreta (ADR-006/ADR-009); avaliações continuam `EmptyState` honesto.
- **Catálogo de Produtos (`/products`)** — **novo nesta sprint (Release 0.2, parte 2)**: listagem com filtros (categoria, marca, loja, faixa de preço, disponibilidade, busca textual) e ordenação (mais recentes / menor preço / maior preço, todos sincronizados com a URL; "mais vendidos"/"melhor avaliação" como estrutura preparada), paginação SSR via `<Link>`, `generateMetadata` (canonical/OG/Twitter/robots por combinação de filtro), JSON-LD `CollectionPage`+`ItemList`+`BreadcrumbList`, `<Suspense>` em torno da listagem (filtros renderizam fora do Suspense). Ver `docs/FEATURES.md` para o detalhe completo.

## Funcionalidades parcialmente implementadas

Nenhuma nesta auditoria — `ProductGrid.tsx` (única pendência apontada na auditoria anterior) foi implementado nesta sprint.

## Funcionalidades não iniciadas

- Listagem `/stores`, `/compare`, `/favorites`, `/price-history`, `/about`, `/contact`, `/privacy`, `/terms` — ainda linkadas no `Navbar`/`Footer`, nenhuma existe (404 em produção).
- Autenticação de usuário (`types/user.ts` vazio, sem Supabase Auth configurado no código da aplicação — embora a tabela `profiles` sugira que a infraestrutura pode já existir no painel, ver `DOMAIN_MODEL.md`).
- Reviews (`types/review.ts` vazio; tabela `reviews` não existe no Supabase).
- IA/Assistente de compras (`services/ai.service.ts` vazio; `ai/` é só placeholders `.gitkeep`).
- Histórico de preços, crawler, painel admin, marketplace multi-vendedor — nada começado.
- Design system formal (`styles/theme.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts` — todos vazios; cores/espaçamento hoje são hardcoded inline via Tailwind arbitrary values).

## Páginas existentes

| Rota | Tipo | Status |
|---|---|---|
| `/` | Server Component | Completa (dados estáticos) |
| `/search` | Server Component (com `<Suspense>`) | Completa, integrada ao Supabase |
| `/products` | Server Component (com `<Suspense>`) | **Nova (Sprint 3.5)**, integrada ao Supabase |
| `/product/[slug]` | Client page + Server layout | Completa, integrada ao Supabase |
| `/store/[slug]` | Client page + Server layout | Completa, integrada ao Supabase |

## Componentes existentes

- `home/`: 10 componentes implementados; `Offers` agora renderiza `ProductCard` (antes `ProductHighlightCard`, removido).
- `layout/`: Navbar, Footer — implementados.
- `product/`: `ProductCard` (unificado, ADR-010), `ProductGrid`/`ProductGridSkeleton`/`ProductFilters` (novos, Sprint 3.5), `ProductGallery`, `ProductHeader`, `ProductSpecifications`, `ProductOffers`, `RelatedProducts`, `FavoriteButton`, `ShareButton` — todos implementados. `ProductHighlightCard`/`ProductBreadcrumb` removidos.
- `store/`: StoreCard, StoreDetails, StoreOffers, StoreGrid — todos implementados.
- `search/`: SearchResults, SearchResultsSkeleton — implementados.
- `ui/`: 16 implementados (12 anteriores + `EmptyState` + `Breadcrumb`/`Pagination`/`Input`/`Select`, novos/preenchidos na Sprint 3.5). `Card`, `Loading`, `SearchInput` — vazios (3).

Ver `docs/COMPONENT_INDEX.md` para o detalhe item a item.

## Hooks existentes

- `useProduct`, `useFavorites`, `useSearch`, `useStore` — implementados.
- `useProductFilters` (Sprint 3.5) — implementado, sincroniza os filtros do catálogo com a URL.
- `useOffers` — arquivo vazio (placeholder, sem consumidor planejado nesta sprint).

## Services existentes

- `product.service.ts` — implementado (`getProducts`, `getProductBySlug`, `getRelatedProducts`, `searchProducts`, `getProductsCatalog` novo na Sprint 3.5).
- `offer.service.ts` — implementado (`getOffers`, `getOffersByProduct`, `getOffersByStore`; ordenação corrigida para `price_usd` na Sprint 3.5).
- `store.service.ts` — implementado (`getStores`, `getStore`, `getStoreBySlug`, `getRelatedStores`).
- `search.service.ts` — implementado, `searchEverything`.
- `category.service.ts`, `brand.service.ts` — **implementados na Sprint 3.5** (antes vazios): `getCategories`/`getCategoryBySlug`, `getBrands`/`getBrandBySlug`.
- `ai.service.ts` — vazio.

## Tipos existentes

`Product`/`ProductWithRelations`/`ProductCatalogItem` (novo, Sprint 3.5)/`ProductHighlight`, `Offer`/`OfferWithStore`/`OfferWithProduct` (corrigidos para o schema real na Sprint 3.5, ADR-009), `Store` (corrigido, idem), `Brand`, `Category`, `Favorite`, `Search` — implementados. `User`, `Review` — vazios.

## Providers existentes

**Nenhum.** Sem `providers/`, sem React Context global, sem theme/auth provider. Estado global (favoritos) é resolvido via módulo singleton + `useSyncExternalStore`.

## Integração com Supabase

Cliente único em `lib/supabase.ts`, criado a partir de `lib/env.ts` (única fonte de `process.env`, ADR-001).

Esquema do banco documentado em `database/DATABASE.md`/`ERD.md` (não código, apenas descrição); `database/migrations` tem 3 propostas não aplicadas (`0001` superada, `0002` integridade de `stores`, `0003` view de agregação de preço para o catálogo — Sprint 3.5). O schema real continua existindo apenas no painel do Supabase.

Auditoria direta confirmou (Sprint 3.4.1, corrigido no código na Sprint 3.5): `stores` tem 24 colunas reais, `offers` tem 16 — ambas agora totalmente modeladas em `types/`. `stores` tem 5 linhas reais, todas com `slug: null`; `products` tem 0 linhas (ver ADR-007, ainda não resolvido — depende de alguém popular dados via painel do Supabase).

## Integração com Vercel / Deploy

Projeto linkado a um projeto Vercel. Variáveis de ambiente do Supabase precisam estar configuradas no painel do projeto Vercel.

## CI atual

**Não existe.** Nenhum workflow de GitHub Actions, nenhum hook de pre-push automatizado além do que o Vercel roda no próprio build de deploy.

## Status do build

✅ `npm run build` — ver relatório da Sprint 3.5 para o resultado mais recente (rotas esperadas: `/`, `/_not-found`, `/product/[slug]`, `/search`, `/store/[slug]`, `/products` — nova nesta sprint).

## Status do lint

✅ `npm run lint` — ver relatório da Sprint 3.5 para o resultado mais recente.

## Status do TypeScript

✅ `npx tsc --noEmit` — ver relatório da Sprint 3.5 para o resultado mais recente.

## Sprint 3.2 — Consolidação (sem novas features de negócio)

Unificação do acesso a `process.env` em `lib/env.ts` (ADR-001), correção do `.gitignore` (ADR-002), limpeza de scripts (ADR-003/004), criação de 6 documentos permanentes de engenharia.

## Sprint 3.3 — Domínio de Busca (Release 0.4, parte 1)

Liga a busca de ponta a ponta: `app/search/page.tsx`, `hooks/useSearch.ts`, `services/search.service.ts`, `SearchResults` com estados reais, `EmptyState` (novo, reaproveitável), JSON-LD `WebSite`/`SearchAction` no root layout.

## Sprint 3.4 — Domínio de Loja (Release 0.3)

Fecha o terceiro domínio central da Home, espelhando a arquitetura do Domínio de Produto: `getStoreBySlug`/`getRelatedStores`, `getOffersByStore`, `hooks/useStore.ts`, `StoreDetails`/`StoreGrid`/`StoreOffers`, `app/store/[slug]/` completo, `storePath`/`storeUrl`.

## Sprint 3.4.1 — Consolidação da Camada de Dados (auditoria, sem novas telas)

Auditoria direta do Supabase real (sem alterar código): confirmou que `types/offer.ts`/`types/store.ts` divergem do schema real (ADR-008), que contato/horário de loja já existiam no banco (corrigindo ADR-006), e que 4 FKs usadas pelos services são reais. Nenhuma correção de código aplicada — ficou para aprovação.

## Sprint 3.5 — Catálogo Premium de Produtos (Release 0.2, parte 2)

Duas frentes, nesta ordem (decisão tomada com o CTO antes de iniciar a implementação, ver pergunta de decisão registrada na sessão):

1. **Correção do modelo de dados** (ADR-009): `types/offer.ts`/`types/store.ts` corrigidos para os nomes reais do schema (ver aviso no topo deste documento); `utils/currency.ts` perdeu a conversão por taxa fixa (não tem mais consumidor); `StoreDetails.tsx` ganhou a seção de Contato/Horário.
2. **Catálogo de produtos** (`/products`): `services/category.service.ts`/`brand.service.ts` implementados (antes vazios); `services/product.service.ts` ganhou `getProductsCatalog` (filtros via PostgREST embedding `offers!inner`/`offers!left`, paginação real via `count: "exact"`, ordenação por preço corrigida em memória por página — limitação documentada, ADR-011); `components/product/ProductGrid.tsx` implementado (antes vazio), `ProductGridSkeleton`/`ProductFilters` novos; `hooks/useProductFilters.ts` novo (URL como fonte de verdade); `components/ui/Breadcrumb.tsx`/`Pagination.tsx`/`Input.tsx`/`Select.tsx` novos/preenchidos; `ProductCard`/`ProductHighlightCard` unificados (ADR-010), `ProductBreadcrumb` substituído pelo `Breadcrumb` genérico; `app/products/{page,loading,error}.tsx` novos, com `generateMetadata`, JSON-LD `CollectionPage`+`ItemList`+`BreadcrumbList` e `<Suspense>`.

Proposta de migration (não aplicada): `database/migrations/0003_proposed_product_catalog_price_view.sql` (materialized view para ordenação de preço escalável). Validado com `npm run lint`/`typecheck`/`build` — ver relatório da sprint para o resultado.

---

## Status Geral: **50%**

Critério: dos 8 domínios do roadmap original (Home, Produto, Loja, Busca, Catálogo/Listagem, Comparação, IA, Admin, Crawler), 4 estão completos no código com integração real ao Supabase (Produto, Busca, Loja, Catálogo — novo), 1 está com UI pronta mas dados mockados (Home), e os demais 3 não foram iniciados. A correção da camada de tipos (ADR-009) elimina os bugs latentes que impediam considerar Produto/Loja prontos para dados reais; a fundação técnica permanece sólida (arquitetura, convenções, build/lint/TS limpos).
