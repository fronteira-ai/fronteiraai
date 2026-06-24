# FEATURES.md

Inventário de funcionalidades por estado real (verificado lendo cada arquivo, não pelo nome do arquivo).

---

## Concluído

### Home institucional
- **Objetivo**: vitrine inicial apresentando proposta de valor, categorias, produtos em destaque, lojas em destaque, showcase de IA, "como funciona", marcas e CTA.
- **Arquivos**: `app/page.tsx`
- **Componentes**: `Hero`, `SearchBar`, `Categories`, `Offers`, `FeaturesStores`, `AIShowcase`, `HowItWorks`, `Brands`, `Stats`, `CTASection`, `Navbar`, `Footer`
- **Dependências**: `constants/categories.ts` (mock), arrays mockados inline em `app/page.tsx`; nenhuma dependência de Supabase.

### Página de Produto
- **Objetivo**: exibir um produto com galeria, especificações, ofertas de múltiplas lojas, produtos relacionados, favoritar e compartilhar, com SEO (metadata + JSON-LD).
- **Arquivos**: `app/product/[slug]/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
- **Componentes**: `ProductBreadcrumb`, `ProductGallery`, `ProductHeader`, `ProductSpecifications`, `ProductOffers`, `RelatedProducts`, `FavoriteButton`, `ShareButton`
- **Dependências**: `hooks/useProduct`, `services/product.service.ts`, `services/offer.service.ts`, `types/product.ts`, `types/offer.ts`, `utils/currency.ts`, `constants/routes.ts`, Supabase (`products`, `offers`, `brands`, `categories`, `stores` via join)

### Favoritos (anônimo)
- **Objetivo**: permitir favoritar produtos sem login, persistido no navegador.
- **Arquivos**: `hooks/useFavorites.ts`
- **Componentes**: `FavoriteButton`
- **Dependências**: `types/favorite.ts`, `localStorage` (sem Supabase)

### Sistema de motion/animação
- **Objetivo**: padronizar animações de entrada, hover, contadores e respeitar `prefers-reduced-motion`.
- **Arquivos**: `styles/animations.ts`, `app/globals.css` (keyframes)
- **Componentes**: `Reveal`, `StatCard`, uso de `animations.cardHover`/`pulseSoft`/`glow`/`shimmer`/`gradientShift` em praticamente todos os componentes visuais.
- **Dependências**: nenhuma externa (CSS + IntersectionObserver nativos).

### Busca (Release 0.4 do roadmap) — Sprint 3.3
- **Objetivo**: pesquisa global de produtos, lojas, marcas e categorias, com URL (`?q=`) como fonte de verdade e SEO básico.
- **Arquivos**: `app/search/page.tsx` (Server Component, lê `searchParams.q`, `generateMetadata` com canonical/OG/robots), `app/search/loading.tsx`, `app/search/error.tsx` (Client, usa `unstable_retry` — API do Next 16.2 — e detecta estado offline via `navigator.onLine`)
- **Componentes**: `SearchBar` (Client, via `useSearch`) · `SearchResults` (Server, agrupa por tipo: produtos/lojas/categorias/marcas, com estado vazio) · `SearchResultsSkeleton` (loading state) · `EmptyState` (genérico, reaproveitável)
- **Dependências**: `hooks/useSearch.ts` (estado do input + navegação, mantém a URL como fonte de verdade), `services/search.service.ts` (`searchEverything`, agora também busca `categories`, escapa `%`/`_` do termo do usuário antes do `ilike`, limita a 8 resultados por seção, lança erro só se todas as 4 queries falharem), `types/search.ts` (`SearchResponse`), `constants/routes.ts` (`searchPath`/`searchUrl`)
- **SEO**: JSON-LD `WebSite`/`SearchAction` adicionado em `app/layout.tsx` (root), habilitando potencial "sitelinks search box"; resultados de busca (`?q=`) marcados `robots: noindex` (conteúdo fino/duplicado), página de busca sem query é indexável.
- **Limitação conhecida**: produtos retornados pela busca não exibem preço — `searchEverything` não faz join com `offers` (a busca consulta só `products.name`, sem preço, já que preço pertence à oferta, não ao produto). Ver `TECH_DEBT.md`.
- **Performance**: fetch único por request — `generateMetadata` não dispara uma segunda consulta porque só lê `searchParams.q` (não chama `searchEverything`); a busca real ocorre dentro do `<Suspense>` via `getCachedSearch` (`React.cache`).

### Domínio de Loja (Release 0.3 do roadmap) — Sprint 3.4
- **Objetivo**: perfil completo de loja (`/store/[slug]`) com produtos/ofertas, avaliações (estrutura preparada) e localização — espelhando exatamente a arquitetura do Domínio de Produto.
- **Arquivos**: `app/store/[slug]/page.tsx` (Client, via `useStore`), `layout.tsx` (Server, `generateMetadata` + JSON-LD `LocalBusiness`), `loading.tsx`, `error.tsx` (`unstable_retry`), `not-found.tsx`
- **Componentes**: `StoreDetails` (header/perfil: rating, verificado, cidade/país, descrição, **Contato/Horário desde a Sprint 3.5**) · `StoreOffers` (lista de ofertas da loja, cada linha já mostra o produto vinculado) · `StoreGrid` (outras lojas, espelha `RelatedProducts`) · `EmptyState` (reaproveitado, seção "Avaliações em breve")
- **Dependências**: `hooks/useStore.ts`, `services/store.service.ts` (`getStoreBySlug`, `getRelatedStores`), `services/offer.service.ts` (`getOffersByStore`), `types/offer.ts`/`types/store.ts` (corrigidos para o schema real na Sprint 3.5, ver ADR-009), `constants/routes.ts` (`storePath`/`storeUrl`)
- **Contato e horário de funcionamento implementados na Sprint 3.5**: a conclusão original (ADR-006, "colunas não existem no banco") estava errada — corrigida na Sprint 3.4.1 (ADR-008) e implementada no código nesta sprint (ADR-009). `StoreDetails.tsx` exibe telefone/WhatsApp/e-mail/site/endereço/horário condicionalmente, sem mocks. Avaliações reais ainda dependem do domínio de Reviews (`types/review.ts` vazio).
- **Achado de dados**: as 5 lojas reais no Supabase têm `slug: null` hoje, então `/store/[slug]` não tem nenhuma loja navegável em produção até alguém popular esse campo — ver `docs/DECISIONS.md` ADR-007. Não é uma falha de implementação.

### Catálogo de Produtos (Release 0.2, parte 2) — Sprint 3.5
- **Objetivo**: listagem completa de produtos em `/products`, com filtros sincronizados à URL, ordenação, paginação SSR e SEO — base para Comparador de Preços, Favoritos, Alertas e demais features de marketplace previstas no roadmap.
- **Arquivos**: `app/products/page.tsx` (Server, `generateMetadata` com canonical/OG/Twitter/robots, JSON-LD `CollectionPage`+`ItemList`+`BreadcrumbList`, `<Suspense>`), `loading.tsx`, `error.tsx` (`unstable_retry`, espelha `/search`)
- **Componentes**: `ProductFilters` (Client, via `useProductFilters` — busca, categoria, marca, loja, faixa de preço, disponibilidade, ordenação) · `ProductGrid` (Server, antes vazio — grid + `EmptyState`) · `ProductGridSkeleton` (fallback do `<Suspense>`) · `Breadcrumb`/`Pagination` (`ui/`, novos, genéricos e reaproveitáveis) · `ProductCard` (unificado com o antigo `ProductHighlightCard`, ver ADR-010)
- **Dependências**: `services/product.service.ts` (`getProductsCatalog`, novo), `services/category.service.ts`/`brand.service.ts` (implementados nesta sprint, antes vazios), `services/store.service.ts` (`getStores`/`getStoreBySlug`, primeiro consumidor real de `getStores`), `hooks/useProductFilters.ts` (novo, URL como fonte de verdade), `utils/search.ts` (novo, `escapeLikePattern` compartilhado com a Busca)
- **Filtros**: categoria/marca (resolvidos por slug → id), loja (idem, via embedding `offers!inner` em `products`), faixa de preço (`offers.price_usd`, idem), disponibilidade (`offers.in_stock`, idem), busca textual (`products.name`, `ilike` com termo escapado) — todos corretos e escaláveis nativamente via PostgREST.
- **Ordenação**: "mais recentes" (nativa, `created_at desc`); "menor/maior preço" (corrigida em memória dentro da página já buscada — limitação documentada, ver `docs/TECH_DEBT.md`/ADR-011, com proposta de correção via materialized view não aplicada); "mais vendidos"/"melhor avaliação" (estrutura preparada na UI e no tipo `ProductCatalogSort`, sem coluna de apoio real — caem em "mais recentes").
- **Paginação**: real, via `.range()` + `count: "exact"` da própria query filtrada; renderizada com `components/ui/Pagination.tsx` (links `<Link>`, sem JavaScript necessário, URLs indexáveis).
- **Achado de dados**: a tabela `products` está vazia (0 linhas) em produção — o catálogo não pôde ser testado manualmente contra dados reais nesta sprint, validado por leitura de código e pelas checagens de qualidade (lint/typecheck/build).

---

## Planejado (não iniciado)

| Feature | Release no roadmap | Evidência de planejamento |
|---|---|---|
| Filtros/paginação/ordenação na Busca | 0.4 (parte 2) | `docs/NEXT_STEPS.md` — busca já lê `?q=` e renderiza resultados reais, mas sem filtro por tipo/categoria, paginação ou autocomplete ainda (distinto do catálogo `/products`, que já tem os três) |
| Rota `/categories/[slug]` e `/stores` (listagem) | — | `Categories.tsx`/`SearchResults.tsx` linkam para `/categories/${slug}`; `Navbar`/`Footer` linkam para `/stores` — nenhuma das duas rotas existe |
| Comparação de produtos | 0.5 | `docs/ROADMAP.md`, link `/compare` no Navbar/Footer |
| Assistente de IA (chat) | 0.6 | `services/ai.service.ts` vazio, `ai/` só `.gitkeep`, `AIShowcase` é só marketing estático |
| Painel administrativo | 0.7 | `docs/ROADMAP.md` |
| Crawler de preços automático | 0.8 | `database/DATABASE.md` lista `crawler_logs` como tabela futura |
| Contas de usuário / Auth | 0.9 | `types/user.ts` vazio, sem Supabase Auth configurado |
| Histórico de preços | 0.9/1.0 | link `/price-history` no Footer, tabela `price_history` listada como futura |
| Reviews/avaliações | 0.9 | `types/review.ts` vazio |
| Ordenação por preço com agregação no banco | — | `database/migrations/0003_proposed_product_catalog_price_view.sql` (Sprint 3.5, não aplicada) — ver ADR-011 |
| Design system formal (tokens) | — | `styles/theme.ts`/`typography.ts`/`spacing.ts`/`radius.ts`/`shadows.ts` vazios, `styles/DESIGN_SYSTEM.md` vazio |
| SEO/Performance/Acessibilidade/PWA | 1.0 | `docs/ROADMAP.md` |
| Apps mobile nativos | 2.0 | `docs/ROADMAP.md` |
| Marketplace multi-vendedor | 4.0 | `docs/ROADMAP.md` |
