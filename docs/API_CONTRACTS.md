# API_CONTRACTS.md

Contratos de todas as funções de `services/*.service.ts` que têm implementação. Não existe API HTTP própria (sem `app/api/`) — "API" aqui significa a interface entre a camada de services e o restante da aplicação, que por sua vez encapsula o Supabase.

## product.service.ts

### `getProducts(): Promise<Product[]>`
- **Tabela**: `products`, `select("*")`
- **Erro**: loga e retorna `[]`
- **Consumidores**: nenhum hoje (pronto para alimentar uma futura listagem `/products`)

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
- **Consumidores**: nenhum (código morto até a busca ser ligada — ver `TECH_DEBT.md`)

## offer.service.ts

### `getOffers(): Promise<Offer[]>`
- **Tabela**: `offers`, `select("*")`
- **Erro**: loga e retorna `[]`
- **Consumidores**: nenhum hoje

### `getOffersByProduct(productId: string): Promise<OfferWithStore[]>`
- **Tabela**: `offers`, `select("*, store:stores(*)")`, filtra `product_id`, ordena por `price` ascendente
- **Erro**: loga e retorna `[]`
- **Consumidores**: `app/product/[slug]/layout.tsx`, `hooks/useProduct.ts` → `ProductOffers`

## store.service.ts

### `getStores(): Promise<Store[]>`
- **Tabela**: `stores`, `select("*")`, ordena por `rating` descendente
- **Erro**: loga e retorna `[]`
- **Consumidores**: nenhum hoje (Home usa array mockado, não esta função)

### `getStore(id: string)`
- **Tabela**: `stores`, `select("*")`, `.eq("id", id).single()`
- **Erro**: não trata explicitamente
- **Tipo de retorno**: implícito — inconsistente com o resto do arquivo
- **Observação**: busca por `id`, não por `slug`, diferente do padrão `getProductBySlug`. Quando o domínio de Loja for implementado (`/store/[slug]`), provavelmente vai precisar de um `getStoreBySlug(slug)` análogo.
- **Consumidores**: nenhum hoje

## search.service.ts

### `searchEverything(search: string): Promise<SearchResponse>`
- **Tabelas**: `products`, `stores`, `brands`, `categories` em paralelo (`Promise.all`), todas com `ilike("name", pattern)` e `.limit(8)` (`RESULTS_PER_SECTION`)
- **Sanitização**: o termo do usuário passa por `escapeLikePattern` (escapa `%`/`_` com `\`) antes de virar `%termo%`, para que não seja interpretado como wildcard do Postgres
- **Comportamento especial**: se `search.trim()` for vazio, retorna uma `SearchResponse` vazia (`total: 0`) sem consultar o banco
- **Erro**: loga cada `error` individualmente; lança `Error` apenas se **todas** as 4 queries falharem (erro parcial não interrompe a resposta)
- **Retorno**: `{ query, products: Product[], stores: Store[], brands: Brand[], categories: Category[], total, durationMs }` (`types/search.ts`)
- **Consumidores**: `app/search/page.tsx` (via `React.cache`, dentro de `<Suspense>`)

## Services sem implementação (apenas placeholder)

`brand.service.ts`, `category.service.ts`, `ai.service.ts` — arquivos existem, sem conteúdo. Nenhum contrato a documentar ainda.

---

## Tabelas do Supabase referenciadas pelo código

| Tabela | Usada por | Colunas referenciadas no código |
|---|---|---|
| `products` | `product.service.ts` | `*`, join `brand:brands(*)`, `category:categories(*)`, filtros por `slug`, `category_id`, `id`, `name` |
| `offers` | `offer.service.ts` | `*`, join `store:stores(*)`, filtro por `product_id`, ordenação por `price` |
| `stores` | `store.service.ts`, `search.service.ts` | `*`, filtro por `id`, `name`; ordenação por `rating` |
| `brands` | `search.service.ts` | `*`, filtro por `name` |
| `categories` | `search.service.ts` | `*`, filtro por `name` |

Nenhuma migration versionada existe para confirmar o schema real dessas tabelas — este documento reflete apenas o que o código assume que existe (ver `TECH_DEBT.md`).
