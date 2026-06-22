# COMPONENT_INDEX.md

Índice de todos os componentes em `components/`, com tipo de renderização, props e status. Gerado por leitura de cada arquivo.

## home/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `Hero` | Server | — | Implementado |
| `SearchBar` | Client (`useState`, `useRouter`) | — | Implementado (navega para `/search?q=`, não pesquisa de fato) |
| `Categories` | Server | `categories: (Category & { productCount?: number })[]` | Implementado |
| `Offers` | Server | `products: ProductHighlight[]` | Implementado |
| `FeaturesStores` | Server | `stores: (Store & { productCount?: number })[]` | Implementado |
| `AIShowcase` | Server | — | Implementado (estático, sem IA real) |
| `HowItWorks` | Server | — | Implementado |
| `Brands` | Server | `brands: Brand[]` | Implementado |
| `Stats` | Server | — | Implementado (números hardcoded) |
| `CTASection` | Server | — | Implementado |

## layout/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `Navbar` | Client (scroll listener) | — | Implementado; menu linka para rotas inexistentes (`/stores`, `/products`, `/compare`) |
| `Footer` | Server | — | Implementado; linka para rotas inexistentes (`/favorites`, `/price-history`, `/about`, `/contact`, `/privacy`, `/terms`) |

## product/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `ProductCard` (`memo`) | Server | `product: Product`, `lowestPriceUSD?: number` | Implementado |
| `ProductGrid` | — | — | **Vazio** (placeholder) |
| `ProductHighlightCard` (`memo`) | Server | `product: ProductHighlight` | Implementado |
| `ProductGallery` (`memo`) | Client (`useState`) | `images: string[]`, `alt: string` | Implementado |
| `ProductHeader` (`memo`) | Server | `product: ProductWithRelations` | Implementado |
| `ProductSpecifications` (`memo`) | Server | `specifications: Record<string,string> \| null` | Implementado |
| `ProductOffers` (`memo`) | Server | `offers: OfferWithStore[]` | Implementado |
| `ProductBreadcrumb` (`memo`) | Server | `categoryName?: string \| null`, `productName: string` | Implementado |
| `RelatedProducts` (`memo`) | Server | `products: Product[]` | Implementado |
| `FavoriteButton` | Client (`useFavorites`) | `product: ProductWithRelations` | Implementado |
| `ShareButton` | Client (Web Share API/clipboard) | `slug: string`, `title: string` | Implementado |

## store/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `StoreCard` (`memo`) | Server | `store: Store`, `productCount?: number` | Implementado; link para `/store/[slug]`, rota ainda inexistente |
| `StoreGrid` | — | — | **Vazio** (placeholder) |
| `StoreDetails` | — | — | **Vazio** (placeholder) |

## search/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `SearchResults` | Server | `title?: string` | Implementado como UI, mas estático — sempre renderiza "Nenhum resultado encontrado", não recebe nem busca dados reais |

## ui/

| Componente | Tipo | Props | Status |
|---|---|---|---|
| `Badge` | Server | `children`, `className?` | Implementado |
| `Button` | Server (renderiza `<Link>` ou `<button>`) | `variant`, `href?`, `onClick?`, `className?`, `type?`, `loading?`, `disabled?` | Implementado |
| `Card` | — | — | **Vazio** (placeholder) |
| `Chip` | Server/interativo via prop | `children`, `onClick?`, `className?` | Implementado |
| `Container` | Server | `children`, `className?` | Implementado |
| `EmptyState` | — | — | **Vazio** (placeholder) |
| `GlassCard` | Server | `children`, `className?`, `hover?` | Implementado |
| `GradientCard` | Server | `children`, `className?` | Implementado |
| `Input` | — | — | **Vazio** (placeholder) |
| `Loading` | — | — | **Vazio** (placeholder, distinto de `app/product/[slug]/loading.tsx`, que é real) |
| `Logo` | Server | `size?: "sm"\|"md"\|"lg"` | Implementado |
| `Reveal` (`memo`) | Client (`IntersectionObserver`) | `children`, `direction?`, `delay?`, `className?` | Implementado, respeita `prefers-reduced-motion` |
| `SearchInput` | — | — | **Vazio** (placeholder) |
| `Section` | Server | `children`, `className?`, `id?` | Implementado |
| `SectionTitle` | Server | `eyebrow?`, `title`, `description?`, `align?` | Implementado |
| `CategoryCard` (`memo`) | Server | `icon`, `name`, `href?`, `productCount?` | Implementado |
| `FeatureCard` (`memo`) | Server | `icon: ComponentType`, `step`, `title`, `description` | Implementado |
| `StatCard` (`memo`) | Client (`IntersectionObserver`, contador animado) | `value`, `suffix?`, `label`, `animate?` | Implementado, respeita `prefers-reduced-motion` |

---

## Resumo

- **Total de arquivos de componente**: 41
- **Implementados**: 33
- **Vazios (placeholder)**: 8 (`ProductGrid`, `StoreGrid`, `StoreDetails`, `Card`, `EmptyState`, `Input`, `Loading`, `SearchInput`)
- **Client Components**: 6 (`SearchBar`, `Navbar`, `ProductGallery`, `FavoriteButton`, `ShareButton`, `Reveal`, `StatCard` — 7, ver detalhe acima)
- **Componentes duplicados/quase-duplicados**: `ProductCard` × `ProductHighlightCard` (ver `TECH_DEBT.md`)
