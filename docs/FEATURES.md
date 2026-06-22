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

---

## Em desenvolvimento

### Domínio de Loja (Release 0.3 do roadmap)
- **Objetivo**: perfil completo de loja (`/store/[slug]`) com produtos, avaliação, localização.
- **Arquivos**: nenhuma rota criada ainda.
- **Componentes**: `StoreCard` (pronto, usado na Home) · `StoreGrid` (arquivo vazio) · `StoreDetails` (arquivo vazio)
- **Dependências**: `services/store.service.ts` (pronto: `getStores`, `getStore`) · `hooks/useStore.ts` (vazio) · `types/store.ts` (pronto)
- **O que falta**: rota `app/store/[slug]/`, implementar `useStore`, implementar `StoreGrid`/`StoreDetails`, decidir se `getStore` busca por `id` ou deveria buscar por `slug` (hoje só aceita `id`, inconsistente com o padrão `getProductBySlug`).

### Busca (Release 0.4 do roadmap)
- **Objetivo**: pesquisa global de produtos, lojas, marcas e categorias.
- **Arquivos**: `app/search/page.tsx` (não lê `searchParams`)
- **Componentes**: `SearchBar` (funcional só para navegar, redireciona para `/search?q=...`) · `SearchResults` (estático, sempre "Nenhum resultado encontrado")
- **Dependências**: `services/search.service.ts` (`searchEverything`, implementado mas não chamado por nada) · `hooks/useSearch.ts` (vazio) · `types/search.ts` (vazio)
- **O que falta**: ler `?q=` na página, implementar `useSearch` chamando `searchEverything`, renderizar resultados reais em `SearchResults`, filtros/paginação/ordenação (todos citados no roadmap, nenhum começado).

### Listagem de produtos
- **Objetivo**: grid de produtos (presumivelmente para `/products`, linkado no `Footer`/`Navbar`/`Offers`).
- **Arquivos**: nenhuma rota criada.
- **Componentes**: `ProductGrid` (arquivo vazio, não importado por nada)
- **Dependências**: `services/product.service.ts` (`getProducts` já existe e está pronto para alimentar isso).

---

## Planejado (não iniciado)

| Feature | Release no roadmap | Evidência de planejamento |
|---|---|---|
| Comparação de produtos | 0.5 | `docs/ROADMAP.md`, link `/compare` no Navbar/Footer |
| Assistente de IA (chat) | 0.6 | `services/ai.service.ts` vazio, `ai/` só `.gitkeep`, `AIShowcase` é só marketing estático |
| Painel administrativo | 0.7 | `docs/ROADMAP.md` |
| Crawler de preços automático | 0.8 | `database/DATABASE.md` lista `crawler_logs` como tabela futura |
| Contas de usuário / Auth | 0.9 | `types/user.ts` vazio, sem Supabase Auth configurado |
| Histórico de preços | 0.9/1.0 | link `/price-history` no Footer, tabela `price_history` listada como futura |
| Reviews/avaliações | 0.9 | `types/review.ts` vazio |
| Marcas/categorias dinâmicas | — | `services/brand.service.ts`, `services/category.service.ts` vazios |
| Design system formal (tokens) | — | `styles/theme.ts`/`typography.ts`/`spacing.ts`/`radius.ts`/`shadows.ts` vazios, `styles/DESIGN_SYSTEM.md` vazio |
| SEO/Performance/Acessibilidade/PWA | 1.0 | `docs/ROADMAP.md` |
| Apps mobile nativos | 2.0 | `docs/ROADMAP.md` |
| Marketplace multi-vendedor | 4.0 | `docs/ROADMAP.md` |
