# COMPONENT_INDEX.md

Índice de todos os componentes em `components/`, com tipo de renderização, props e status. Gerado por leitura de cada arquivo.

## home/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `Hero` | Server | — | Implementado |
| `SearchBar` | Client (via `useSearch`) | `defaultValue?: string` | Implementado: delega estado/navegação a `hooks/useSearch.ts` |
| `Categories` | Server | `categories: (Category & { productCount?: number })[]` | Implementado |
| `Offers` | Server | `products: ProductHighlight[]` | Implementado; renderiza `ProductCard` (Sprint 3.5, antes `ProductHighlightCard`) |
| `FeaturesStores` | Server | `stores: (Store & { productCount?: number })[]` | Implementado |
| `AIShowcase` | Server | — | Implementado (estático, sem IA real) |
| `HowItWorks` | Server | — | Implementado |
| `Brands` | Server | `brands: Brand[]` | Implementado |
| `Stats` | Server | — | Implementado (números hardcoded) |
| `CTASection` | Server | — | Implementado |

## layout/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `Navbar` | Client (scroll listener) | — | Implementado; `/products` agora resolve para uma rota real (Sprint 3.5) — `/stores`/`/compare` ainda não |
| `Footer` | Server | — | Implementado; `/products` resolve; `/stores`, `/favorites`, `/price-history`, `/about`, `/contact`, `/privacy`, `/terms` continuam sem rota |

## product/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `ProductCard` (`memo`) | Server | `slug`, `name`, `imageUrl: string \| null`, `priceUSD?`, `originalPriceUSD?`, `subtitle?`, `inStock?` | Implementado (Sprint 3.5, ADR-010): unifica o antigo `ProductCard`+`ProductHighlightCard` (removido) com props achatadas; reaproveitado por `RelatedProducts`, `SearchResults`, `ProductGrid` e `home/Offers` |
| `ProductGrid` | Server (`memo`) | `products: ProductCatalogItem[]` | Implementado (Sprint 3.5 — antes vazio): grid responsivo + `EmptyState` |
| `ProductGridSkeleton` | Server | `count?: number` | Implementado (Sprint 3.5): fallback de `<Suspense>`/`loading.tsx` de `/products` |
| `ProductFilters` | Client (`useProductFilters`) | `categories: Category[]`, `brands: Brand[]`, `stores: Store[]` | Implementado (Sprint 3.5): busca/categoria/marca/loja/preço/disponibilidade/ordenação sincronizados com a URL |
| `ProductGallery` (`memo`) | Client (`useState`) | `images: string[]`, `alt: string` | Implementado |
| `ProductHeader` (`memo`) | Server | `product: ProductWithRelations` | Implementado |
| `ProductSpecifications` (`memo`) | Server | `specifications: Record<string,string> \| null` | Implementado |
| `ProductOffers` (`memo`) | Server | `offers: OfferWithStore[]` | Implementado; Sprint 3.5 (ADR-009): usa `price_usd`/`price_brl`/`in_stock`/`product_url` reais |
| `RelatedProducts` (`memo`) | Server | `products: Product[]` | Implementado; mapeia para as props achatadas de `ProductCard` (Sprint 3.5) |
| `FavoriteButton` | Client (`useFavorites`) | `product: ProductWithRelations` | Implementado |
| `ShareButton` | Client (Web Share API/clipboard) | `slug: string`, `title: string` | Implementado |

**Removidos na Sprint 3.5**: `ProductHighlightCard` (unificado em `ProductCard`, ADR-010), `ProductBreadcrumb` (substituído por `components/ui/Breadcrumb.tsx`, genérico).

## store/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `StoreCard` (`memo`) | Server | `store: Store`, `productCount?: number` | Implementado; Sprint 3.5: `cover_image`/`is_verified` (antes `banner_url`/`verified`, ver ADR-009) |
| `StoreDetails` (`memo`) | Server | `store: Store` | Implementado; Sprint 3.5: ganhou a seção de Contato/Horário (telefone, WhatsApp, e-mail, site, endereço, horário), antes bloqueada pelo ADR-006 |
| `StoreOffers` (`memo`) | Server | `offers: OfferWithProduct[]` | Implementado; Sprint 3.5 (ADR-009): usa `price_usd`/`price_brl`/`in_stock`/`product_url` reais |
| `StoreGrid` (`memo`) | Server | `stores: Store[]`, `title?: string` | Implementado |

## search/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `SearchResults` | Server | `results: SearchResponse` | Implementado: agrupa por tipo (produtos/lojas/categorias/marcas), `EmptyState` para sem-query/zero-resultados; produtos renderizam via `ProductCard` (props achatadas, Sprint 3.5) |
| `SearchResultsSkeleton` | Server | — | Implementado: fallback de `<Suspense>`/`loading.tsx` |

## ui/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `Badge` | Server | `children`, `className?` | Implementado |
| `Breadcrumb` (`memo`) | Server | `items: { label: string; href?: string }[]` | Implementado (Sprint 3.5): trilha genérica + JSON-LD `BreadcrumbList`, reaproveitada por `/product/[slug]`, `/store/[slug]` e `/products` |
| `Button` | Server (renderiza `<Link>` ou `<button>`) | `variant`, `href?`, `onClick?`, `className?`, `type?`, `loading?`, `disabled?` | Implementado |
| `Card` | — | — | **Vazio** (placeholder) |
| `Chip` | Server/interativo via prop | `children`, `onClick?`, `className?` | Implementado |
| `Container` | Server | `children`, `className?` | Implementado |
| `EmptyState` (`memo`) | Server | `icon?`, `title`, `description?`, `action?` | Implementado |
| `GlassCard` | Server | `children`, `className?`, `hover?` | Implementado |
| `GradientCard` | Server | `children`, `className?` | Implementado |
| `Input` | Server | `label?`, ...`InputHTMLAttributes` | Implementado (Sprint 3.5 — antes vazio): usado pelos campos de busca/preço de `ProductFilters` |
| `Loading` | — | — | **Vazio** (placeholder, distinto de `app/*/loading.tsx`, que são reais) |
| `Logo` | Server | `size?: "sm"\|"md"\|"lg"` | Implementado |
| `Pagination` | Server | `currentPage`, `totalPages`, `buildHref: (page: number) => string` | Implementado (Sprint 3.5): paginador SSR via `<Link>`, reaproveitável por listagens futuras |
| `Reveal` (`memo`) | Client (`IntersectionObserver`) | `children`, `direction?`, `delay?`, `className?` | Implementado, respeita `prefers-reduced-motion` |
| `Select` | Server | `label?`, `value`, `onChange`, `options`, `placeholder?` | Implementado (Sprint 3.5 — novo): usado pelos filtros de categoria/marca/loja/ordenação de `ProductFilters` |
| `SearchInput` | — | — | **Vazio** (placeholder, distinto de `Input` genérico) |
| `Section` | Server | `children`, `className?`, `id?` | Implementado |
| `SectionTitle` | Server | `eyebrow?`, `title`, `description?`, `align?` | Implementado |
| `CategoryCard` (`memo`) | Server | `icon`, `name`, `href?`, `productCount?` | Implementado |
| `FeatureCard` (`memo`) | Server | `icon: ComponentType`, `step`, `title`, `description` | Implementado |
| `StatCard` (`memo`) | Client (`IntersectionObserver`, contador animado) | `value`, `suffix?`, `label`, `animate?` | Implementado, respeita `prefers-reduced-motion` |

---

## Resumo

- **Implementados**: 45 (Sprint 3.5 adicionou `ProductGrid` que estava vazio, `ProductGridSkeleton`, `ProductFilters`, `ui/Breadcrumb`, `ui/Pagination`, `ui/Input` que estava vazio, `ui/Select`; removeu `ProductHighlightCard` e `ProductBreadcrumb` por unificação/duplicação)
- **Vazios (placeholder)**: 3 (`Card`, `Loading`, `SearchInput`)
- **Client Components**: 8 (`SearchBar`, `Navbar`, `ProductGallery`, `FavoriteButton`, `ShareButton`, `Reveal`, `StatCard`, `ProductFilters` — novo) + `app/{search,products}/error.tsx`, `app/store/[slug]/error.tsx` (Client, fora de `components/`)
- **Duplicações conhecidas**: nenhuma — `ProductCard`×`ProductHighlightCard` (única identificada) resolvida na Sprint 3.5 (ADR-010)
