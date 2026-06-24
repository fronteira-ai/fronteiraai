# API_CONTRACTS.md

Contratos de todas as funções de `services/*.service.ts` que têm implementação. Não existe API HTTP própria (sem `app/api/`) — "API" aqui significa a interface entre a camada de services e o restante da aplicação, que por sua vez encapsula o Supabase.

## product.service.ts

### `getProducts(): Promise<Product[]>`
- **Tabela**: `products`, `select("*")`
- **Erro**: loga e retorna `[]`
- **Consumidores**: nenhum hoje (a Sprint 3.5 alimentou `/products` via `getProductsCatalog`, abaixo, não esta função)

### `getProductBySlug(slug: string): Promise<ProductWithRelations | null>`
- **Tabela**: `products`, `select("*, brand:brands(*), category:categories(*)")`, `.eq("slug", slug).single()`
- **Erro**: loga e retorna `null`
- **Consumidores**: `app/product/[slug]/layout.tsx` (server, via `React.cache`), `hooks/useProduct.ts` (client)

### `getRelatedProducts(categoryId: string, excludeProductId: string, limit = 4): Promise<Product[]>`
- **Tabela**: `products`, filtra `category_id` igual e `id` diferente, `limit`
- **Erro**: loga e retorna `[]`
- **Consumidores**: `hooks/useProduct.ts` → `RelatedProducts`

### `searchProducts(search: string)`
- **Tabela**: `products`, `ilike("name", "%search%")`
- **Erro**: não trata explicitamente (retorna `data` que pode ser `null`)
- **Tipo de retorno**: implícito (não anotado) — inconsistente com o resto do arquivo
- **Consumidores**: nenhum (código morto — distinto de `searchEverything` e de `getProductsCatalog`)

### `getProductsCatalog(filters?: ProductCatalogFilters): Promise<ProductCatalogResult>` — Sprint 3.5
- **Tabela**: `products`, `select("*, brand:brands(*), category:categories(*), offers(...)")`, com `{ count: "exact" }`
- **Filtros aceitos**: `categorySlug`, `brandSlug`, `storeSlug`, `search` (nome, `ilike` com termo escapado via `utils/search.ts`), `onlyInStock`, `minPriceUSD`, `maxPriceUSD`, `sort` (`relevance` | `price_asc` | `price_desc` | `newest` | `best_selling` | `top_rated`), `page`, `perPage` (padrão 12)
- **Resolução de filtros**: `categorySlug`/`brandSlug`/`storeSlug` são resolvidos para `id` via `getCategoryBySlug`/`getBrandBySlug`/`getStoreBySlug` antes da query principal
- **Embedding de `offers`**: usa `offers!left` quando nenhum filtro de oferta está ativo (mantém produtos sem oferta visíveis), ou `offers!inner` quando `storeSlug`/`onlyInStock`/`minPriceUSD`/`maxPriceUSD` estão presentes (restringe aos produtos com pelo menos uma oferta que atenda os filtros)
- **Paginação**: `.range()` baseado em `page`/`perPage`; `total`/`totalPages` vêm de `count: "exact"` da própria query filtrada
- **Ordenação**: `newest`/`best_selling`/`top_rated`/sem sort usam `created_at desc` no banco (`best_selling`/`top_rated` são estrutura preparada — sem coluna de apoio real, caem no mesmo "newest"); `price_asc`/`price_desc` corrigem a ordem da página já buscada em memória, usando o menor preço entre as ofertas embutidas (limitação documentada: correta dentro da página, não garante ordem global entre páginas — ver `docs/DECISIONS.md` ADR-011)
- **Erro**: loga e retorna `{ products: [], total: 0, page, perPage, totalPages: 0 }`
- **Consumidores**: `app/products/page.tsx`

## offer.service.ts

### `getOffers(): Promise<Offer[]>`
- **Tabela**: `offers`, `select("*")`
- **Erro**: loga e retorna `[]`
- **Consumidores**: nenhum hoje

### `getOffersByProduct(productId: string): Promise<OfferWithStore[]>`
- **Tabela**: `offers`, `select("*, store:stores(*)")`, filtra `product_id`, ordena por `price_usd` ascendente (Sprint 3.5 — antes `price`, coluna que não existia, ver ADR-009)
- **Erro**: loga e retorna `[]`
- **Consumidores**: `app/product/[slug]/layout.tsx`, `hooks/useProduct.ts` → `ProductOffers`

### `getOffersByStore(storeId: string): Promise<OfferWithProduct[]>` — Sprint 3.4
- **Tabela**: `offers`, `select("*, product:products(*)")`, filtra `store_id`, ordena por `price_usd` ascendente (Sprint 3.5, idem acima)
- **Erro**: loga e retorna `[]`
- **Consumidores**: `app/store/[slug]/layout.tsx`, `hooks/useStore.ts` → `StoreOffers`

## store.service.ts

### `getStores(): Promise<Store[]>`
- **Tabela**: `stores`, `select("*")`, ordena por `rating` descendente
- **Erro**: loga e retorna `[]`
- **Consumidores**: `app/products/page.tsx` (lista de opções do filtro de loja, Sprint 3.5) — primeiro consumidor real desta função

### `getStore(id: string)`
- **Tabela**: `stores`, `select("*")`, `.eq("id", id).single()`
- **Erro**: não trata explicitamente
- **Tipo de retorno**: implícito — inconsistente com o resto do arquivo
- **Observação**: busca por `id`, não por `slug`. Redundante com `getStoreBySlug` (abaixo) desde a Sprint 3.4 — mantido por não ter sido pedida sua remoção, continua sem consumidor.
- **Consumidores**: nenhum hoje

### `getStoreBySlug(slug: string): Promise<Store | null>` — Sprint 3.4
- **Tabela**: `stores`, `select("*")`, `.eq("slug", slug).single()`
- **Erro**: loga e retorna `null`
- **Consumidores**: `app/store/[slug]/layout.tsx` (server, via `React.cache`), `hooks/useStore.ts` (client), `services/product.service.ts` (`getProductsCatalog`, resolução do filtro `storeSlug`, Sprint 3.5)

### `getRelatedStores(excludeStoreId: string, limit = 4): Promise<Store[]>` — Sprint 3.4
- **Tabela**: `stores`, filtra `id` diferente, ordena por `rating` descendente, `limit`
- **Erro**: loga e retorna `[]`
- **Consumidores**: `hooks/useStore.ts` → `StoreGrid`

## category.service.ts — Sprint 3.5 (antes vazio)

### `getCategories(): Promise<Category[]>`
- **Tabela**: `categories`, `select("*")`, ordena por `name` ascendente
- **Erro**: loga e retorna `[]`
- **Consumidores**: `app/products/page.tsx` (opções do filtro de categoria)

### `getCategoryBySlug(slug: string): Promise<Category | null>`
- **Tabela**: `categories`, `select("*")`, `.eq("slug", slug).single()`
- **Erro**: loga e retorna `null`
- **Consumidores**: `services/product.service.ts` (`getProductsCatalog`), `app/products/page.tsx` (`generateMetadata`, título com nome da categoria filtrada)

## brand.service.ts — Sprint 3.5 (antes vazio)

### `getBrands(): Promise<Brand[]>`
- **Tabela**: `brands`, `select("*")`, ordena por `name` ascendente
- **Erro**: loga e retorna `[]`
- **Consumidores**: `app/products/page.tsx` (opções do filtro de marca)

### `getBrandBySlug(slug: string): Promise<Brand | null>`
- **Tabela**: `brands`, `select("*")`, `.eq("slug", slug).single()`
- **Erro**: loga e retorna `null`
- **Consumidores**: `services/product.service.ts` (`getProductsCatalog`), `app/products/page.tsx` (`generateMetadata`)

## search.service.ts

### `searchEverything(search: string): Promise<SearchResponse>`
- **Tabelas**: `products`, `stores`, `brands`, `categories` em paralelo (`Promise.all`), todas com `ilike("name", pattern)` e `.limit(8)` (`RESULTS_PER_SECTION`)
- **Sanitização**: o termo do usuário passa por `escapeLikePattern` (`utils/search.ts`, Sprint 3.5 — antes uma função local duplicada neste arquivo) antes de virar `%termo%`
- **Comportamento especial**: se `search.trim()` for vazio, retorna uma `SearchResponse` vazia (`total: 0`) sem consultar o banco
- **Erro**: loga cada `error` individualmente; lança `Error` apenas se **todas** as 4 queries falharem (erro parcial não interrompe a resposta)
- **Retorno**: `{ query, products: Product[], stores: Store[], brands: Brand[], categories: Category[], total, durationMs }` (`types/search.ts`)
- **Consumidores**: `app/search/page.tsx` (via `React.cache`, dentro de `<Suspense>`)

## Services sem implementação (apenas placeholder)

`ai.service.ts` — arquivo existe, sem conteúdo. Nenhum contrato a documentar ainda.

---

## Tabelas do Supabase referenciadas pelo código

| Tabela | Usada por | Colunas referenciadas no código |
|---|---|---|
| `products` | `product.service.ts` | `*`, joins `brand:brands(*)`, `category:categories(*)`, `offers(...)` (catálogo); filtros por `slug`, `category_id`, `brand_id`, `id`, `name` |
| `offers` | `offer.service.ts`, `product.service.ts` | `*`, joins `store:stores(*)`/`product:products(*)`; filtro por `product_id`/`store_id`/`in_stock`/`price_usd`; ordenação por `price_usd`/`created_at` |
| `stores` | `store.service.ts`, `search.service.ts`, `product.service.ts` | `*`, filtro por `id`, `slug`, `name`; ordenação por `rating` |
| `brands` | `search.service.ts`, `brand.service.ts` | `*`, filtro por `slug`, `name` |
| `categories` | `search.service.ts`, `category.service.ts` | `*`, filtro por `slug`, `name` |

Nenhuma migration versionada e aplicada existe para confirmar o schema real dessas tabelas no banco de produção — este documento reflete o que o código assume, já alinhado com o schema real confirmado por auditoria direta (Sprint 3.4.1/3.5, ver `docs/DOMAIN_MODEL.md`).
