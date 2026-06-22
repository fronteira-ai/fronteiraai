# ARCHITECTURE.md

Mapeamento real da arquitetura, gerado por leitura completa do código. Complementa (e corrige pontos desatualizados de) `docs/CLAUDE.md`, que descreve a arquitetura *pretendida* — este documento descreve a arquitetura *como está implementada hoje*.

Documentos relacionados, mais granulares: `docs/CONVENTIONS.md` (regras de estilo/nomenclatura), `docs/API_CONTRACTS.md` (contratos de cada service), `docs/DOMAIN_MODEL.md` (entidades e relacionamentos), `docs/COMPONENT_INDEX.md` (tabela de todos os componentes), `docs/DEPENDENCY_GRAPH.md` (grafo de imports entre camadas), `docs/DECISIONS.md` (histórico de decisões arquiteturais).

---

## Estrutura de pastas (real)

```
app/                    rotas (App Router)
  page.tsx              Home — Server Component, dados estáticos
  search/                page.tsx (Server, lê searchParams.q + generateMetadata), loading.tsx, error.tsx (Client, unstable_retry)
  product/[slug]/       layout.tsx (Server, fetch+metadata+JSON-LD) + page.tsx (Client, refetch via hook)
components/
  home/                 10 componentes, todos Server Components exceto SearchBar ("use client", via useSearch)
  layout/               Navbar ("use client", scroll listener), Footer (Server)
  product/              10 componentes, Server exceto FavoriteButton/ShareButton/ProductGallery ("use client")
  store/                 StoreCard (Server); StoreGrid/StoreDetails vazios
  search/                SearchResults (Server, resultados reais agrupados por tipo), SearchResultsSkeleton
  ui/                    kit compartilhado, 18 arquivos (14 implementados, 4 vazios)
hooks/                  useProduct, useFavorites, useSearch implementados; useStore/useOffers vazios
services/               product/offer/store/search implementados (search em uso desde a Sprint 3.3); brand/category/ai vazios
types/                  Product/Offer/Store/Brand/Category/Favorite/Search implementados; User/Review vazios
lib/                    supabase.ts (cliente), env.ts (novo, não commitado, não usado)
constants/              routes.ts/categories.ts implementados; demais (config/colors/navigation/currencies/countries/restrictedProducts) vazios
utils/                  currency.ts implementado; format/search/slug/validators vazios
styles/                 animations.ts implementado e amplamente usado; theme/typography/spacing/radius/shadows vazios
database/               DATABASE.md/ERD.md (documentação descritiva); migrations/seed/sql só .gitkeep — sem SQL versionado
ai/                     só .gitkeep — nada implementado
assets/                 só .gitkeep — nada implementado
docs/                   documentação de produto/processo (este arquivo e os 5 irmãos)
```

## Dependências

`package.json`: `@supabase/supabase-js ^2.108.2`, `lucide-react ^1.21.0`, `next 16.2.9`, `react`/`react-dom 19.2.4`. Dev: `tailwindcss ^4`, `@tailwindcss/postcss`, `eslint 9` + `eslint-config-next 16.2.9`, `typescript ^5`. Sem libs de state management, data-fetching (React Query/SWR), validação (zod) ou testes — tudo é `useState`/`useEffect` manual e tipagem direta do retorno do Supabase (`as Product[]`, sem validação em runtime).

## Camadas e fluxo de dados (intencional vs. real)

Fluxo declarado em `docs/CLAUDE.md`:

```
Page → Hook → Service → Supabase → Database
```

Na prática, **dois padrões coexistem**:

1. **Produto** (o único fluxo "completo"): o **layout** (Server Component) chama `product.service`/`offer.service` diretamente via `cache()` do React para metadata + JSON-LD; a **page** (Client Component) chama os mesmos dados de novo através de `useProduct` (que internamente chama os mesmos services). Resultado: **a mesma query ao Supabase roda duas vezes por request** — uma no servidor (layout, para SEO) e uma no cliente (page, para render). Isso funciona, mas é redundante e gasta uma chamada extra a cada acesso à página de produto.
2. **Home**: não há fluxo nenhum até o service — os componentes recebem arrays mockados criados inline em `app/page.tsx`/`constants/categories.ts`, tipados com os tipos reais (`Store`, `Brand`, `ProductHighlight`) para que a troca por dados reais não exija mudar os componentes — mas a troca ainda não foi feita.

## Fluxo da busca (Sprint 3.3)

```
SearchBar (client, via useSearch) --router.push(searchPath(q))--> /search?q=X
                                        │
                                        ▼
                          SearchPage (Server Component)
                          lê searchParams.q, gera metadata (canonical/OG/robots)
                                        │
                                        ▼
                          <Suspense fallback={SearchResultsSkeleton}>
                            SearchResultsAsync → getCachedSearch(q) → searchEverything(q)
                          </Suspense>
                                        │
                                        ▼
                          SearchResults (Server) — agrupa por tipo,
                          EmptyState se total === 0 ou sem query
```

`services/search.service.ts` (`searchEverything`) faz `Promise.all` de quatro `ilike` queries (`products`/`stores`/`brands`/`categories`), escapando `%`/`_` do termo do usuário antes de montar o padrão (evita que o usuário injete wildcards do Postgres), limita 8 resultados por seção, e lança erro apenas se todas as queries falharem — capturado por `app/search/error.tsx` (Client Component, usa a prop `unstable_retry` do Next 16.2, distingue erro genérico de estado offline via `navigator.onLine`). `hooks/useSearch.ts` é puramente de apresentação: mantém o valor do input e empurra a navegação via `searchPath()`, sem chamar o service diretamente — a busca real acontece no servidor, dentro do Server Component da página, com `React.cache` evitando refetch entre `generateMetadata` (que não chama `searchEverything`, só lê `q`) e o corpo da página.

## Fluxo dos produtos

```
ProductPage (client, useParams) → useProduct(slug)
                                       │
                       getProductBySlug ─┼─ getOffersByProduct
                       getRelatedProducts┘
                                       │
                          supabase.from("products"/"offers")
```

Em paralelo, `app/product/[slug]/layout.tsx` roda no servidor: `getCachedProduct`/`getCachedOffers` (memorizados com `React.cache`, mas só dentro do próprio request do layout — não compartilhado com o client component da page) para `generateMetadata` + JSON-LD.

`notFound()` é chamado dentro do corpo de um Client Component (`"use client"` + `useParams`), que funciona no Next 16 mas é atípico — o padrão recomendado em App Router é resolver `params`/`notFound` no Server Component e passar os dados como props para um Client Component apenas onde há interatividade (favoritar, galeria). Aqui a página inteira é client-side, perdendo streaming/SSR para o conteúdo principal (só o `layout` é SSR, para metadata/SEO).

## Fluxo das lojas

```
StoreCard (recebe Store via props, vindo de app/page.tsx mockado)
       │
       └─ link para /store/[slug] → rota INEXISTENTE (404)
```

`store.service.ts` (`getStores`, `getStore`) está implementado e correto, mas nenhuma rota/hook o consome ainda. `StoreGrid`/`StoreDetails`/`useStore` são placeholders vazios — o domínio de Loja está no início do Release 0.3 (ver `docs/ROADMAP.md`).

## Server Components vs. Client Components

- **Server (default)**: `app/page.tsx`, `app/search/page.tsx`, `app/product/[slug]/layout.tsx`, todos os componentes de `home/` exceto `SearchBar`, `Footer`, a maioria de `ui/`, `ProductHeader`/`ProductSpecifications`/`ProductOffers`/`ProductBreadcrumb`/`RelatedProducts`/`ProductHighlightCard`/`ProductCard`, `StoreCard`, `SearchResults`.
- **Client (`"use client"`)**: `SearchBar`, `Navbar` (scroll listener), `Reveal`/`StatCard` (IntersectionObserver), `ProductGallery` (estado de imagem ativa), `FavoriteButton`/`ShareButton` (interação + `localStorage`/clipboard), `useFavorites`/`useProduct` (hooks), e a **página inteira** `app/product/[slug]/page.tsx`.

A separação segue a convenção do CLAUDE.md ("client só quando precisa de estado/eventos"), exceto pela page de produto ser inteiramente client quando poderia ser majoritariamente server com ilhas de interatividade.

## Roteamento

App Router puro, sem route groups, sem paralelo/intercepting routes. Único parâmetro dinâmico: `app/product/[slug]`. `app/search` lê `?q=` apenas na intenção (o link existe, a leitura não). Várias rotas são referenciadas em `Navbar`/`Footer` mas não existem: `/stores`, `/products`, `/compare`, `/favorites`, `/price-history`, `/about`, `/contact`, `/privacy`, `/terms`, `/#categorias`, `/#ia` (os dois últimos são anchors válidos dentro de `/`).

## Providers

Nenhum. Sem `ThemeProvider`, sem `AuthProvider`, sem `QueryClientProvider`. `app/layout.tsx` é o root layout padrão do `create-next-app` (título/descrição ainda "Create Next App" — nunca customizado).

## Services

Ver inventário em `PROJECT_STATUS.md`. Convenção consistente: toda função retorna o tipo esperado ou `[]`/`null` em erro, loga via `console.error`, nunca lança. Bem seguida nos 4 services implementados.

## Tipos

Modelagem 1:1 com tabelas do Supabase (`Product`, `Offer`, `Store`, `Brand`, `Category`, `Favorite`), mais tipos de composição (`ProductWithRelations`, `OfferWithStore`, `ProductHighlight`) para os `select()` com joins. Padrão saudável e consistente onde implementado.

## Camadas — avaliação

A camada que está **mais madura** é `types/` + os 4 services implementados — modelagem de dados consistente e sem duplicação. A camada **mais fraca** é `hooks/`: de 5 hooks declarados (`useProduct`, `useStore`, `useSearch`, `useOffers`, `useFavorites`), só 2 têm corpo. Isso força padrões ad-hoc quando alguém precisar de lojas/busca antes desses hooks existirem.

## Duplicações identificadas

1. **Fetch duplicado de produto** — `layout.tsx` (server) e `page.tsx` (client, via `useProduct`) buscam o mesmo produto/ofertas de forma independente, sem compartilhar cache entre os dois (o `React.cache()` usado no layout não atravessa a fronteira server/client). Toda visita à página de produto dispara a query ao Supabase ao menos duas vezes.
2. **`components/product/ProductCard.tsx`** vs **`components/product/ProductHighlightCard.tsx`** — ambos são "card de produto clicável com imagem, nome e preço", com layout quase idêntico, divergindo só nos campos extras (desconto/estoque no Highlight) e no tipo de entrada (`Product` vs `ProductHighlight`). Poderiam convergir para um único componente parametrizado.
3. ~~Validação de env do Supabase duplicada~~ — **resolvido na Sprint 3.2** (ver `docs/DECISIONS.md`, ADR-001): `lib/env.ts` é agora a única fonte de `process.env`, `lib/supabase.ts` e `constants/routes.ts` consomem `env` de lá.
4. **`constants/routes.ts`** só cobre `product*`; `StoreCard` constrói o link da loja como string literal (`` `/store/${store.slug}` ``) em vez de usar um helper como `storePath()` análogo a `productPath()` — inconsistência que vai se multiplicar conforme mais rotas forem adicionadas.

## Melhorias identificadas

- Unificar o fetch de produto: mover toda a busca para o Server Component (layout/page server) e passar os dados como props para um Client Component pequeno só para as partes interativas (galeria, favoritar, compartilhar), eliminando o `useProduct` client-side ou reduzindo seu uso a casos que realmente precisam de refetch no cliente.
- Versionar o schema do banco (`database/migrations`) em vez de mantê-lo só no painel do Supabase e em markdown descritivo.
- Adicionar tipagem de retorno do Supabase com validação em runtime (ou ao menos `zod`) em vez de `as Product[]` — hoje uma mudança de schema no banco não quebra o TypeScript, só quebra em runtime.

## Definição de sucesso da arquitetura (mantida do documento original)

Um desenvolvedor novo deve entender, em minutos: onde o código pertence, como os dados fluem, como os módulos interagem e onde adicionar novas features. Com a estrutura atual isso é majoritariamente verdade — a maior fonte de confusão é justamente a duplicação de fetch entre layout e page do produto, e a quantidade de arquivos vazios que parecem implementados até serem abertos.
