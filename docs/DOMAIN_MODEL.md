# DOMAIN_MODEL.md

Modelo de domínio extraído diretamente de `types/*.ts`. Onde um tipo está vazio (placeholder), está marcado como tal — não inventado.

> ✅ **Sprint 3.5**: a divergência entre `types/store.ts`/`types/offer.ts` e o schema real do Supabase, confirmada na Sprint 3.4.1 (auditoria, ver ADR-008), foi **corrigida** nesta sprint (ADR-009) antes de implementar o catálogo de produtos. Os dois tipos abaixo já refletem os nomes reais das colunas.

## Filosofia (de `database/DATABASE.md`)

> Produto é único. Loja é única. Oferta é única. O preço pertence à oferta, não ao produto.

Isso significa: o mesmo produto físico (`Product`) pode ter N `Offer`s, uma por loja que o vende, cada uma com seu próprio preço/estoque/condições. Nunca há preço no `Product` em si.

## Entidades implementadas

### `Store` (`types/store.ts`)

```ts
interface Store {
  id: string; name: string; slug: string; description: string;
  city: string; country: string; rating: number;
  logo_url: string | null;
  cover_image: string | null;
  is_verified: boolean;
  phone: string | null; whatsapp: string | null; email: string | null;
  website: string | null; address: string | null; opening_hours: string | null;
  instagram: string | null; latitude: number | null; longitude: number | null;
  delivery: boolean | null; pickup: boolean | null; pix_br: boolean | null;
  active: boolean | null;
  created_at: string;
}
```

24 colunas reais confirmadas na Sprint 3.4.1, todas modeladas no tipo desde a Sprint 3.5. `rating` é um número direto na tabela (não calculado a partir de reviews — não existe tabela `reviews` no Supabase). `StoreDetails.tsx` exibe contato/horário condicionalmente (só os campos que a loja tiver preenchido).

**Achado de dados, ainda válido**: as 5 linhas reais hoje têm `slug: null` e `active: null` em todas (ver ADR-007).

### `Product` / `ProductWithRelations` / `ProductCatalogItem` / `ProductHighlight` (`types/product.ts`)
```ts
interface Product {
  id: string; name: string; slug: string; description: string;
  brand_id: string; category_id: string;
  image_url: string | null;
  specifications: Record<string, string> | null;
  created_at: string;
}

interface ProductWithRelations extends Product {
  brand: Brand | null;
  category: Category | null;
}

// Item do catálogo (/products, Sprint 3.5) — produto + relações, com o
// preço mais baixo entre suas ofertas já resolvido para exibição.
interface ProductCatalogItem extends ProductWithRelations {
  lowestPriceUSD: number | null;
  inStock: boolean;
}

interface ProductHighlight {  // forma resumida para vitrines (Home)
  id: string; slug: string; name: string; imageUrl: string | null;
  storeName: string; priceUSD: number; originalPriceUSD?: number; inStock: boolean;
}
```
`Product` nunca tem preço — confere com a filosofia do domínio. `ProductCatalogItem`/`ProductHighlight` são as exceções textuais (têm preço), porque representam o produto com sua melhor oferta já resolvida para exibição — `ProductCatalogItem` vem de `services/product.service.ts` (`getProductsCatalog`, real, com offers embutidas via PostgREST); `ProductHighlight` ainda é preenchido com dados de exemplo na Home.

**Schema real confirmado** (Sprint 3.4.1 — tabela `products` está com 0 linhas, então as colunas foram confirmadas testando `select(coluna)` uma a uma):
```
id, name, slug, description, brand_id, category_id, image_url,
specifications, created_at, sku, weight, model, updated_at, active,
gtin, release_date
```
Sem nomes trocados — todos os campos do tipo `Product` existem de fato. 7 colunas reais sem tipo correspondente (`sku`, `weight`, `model`, `updated_at`, `active`, `gtin`, `release_date`) — não bloqueantes (services ignoram colunas que não pedem).

### `Offer` / `OfferWithStore` / `OfferWithProduct` (`types/offer.ts`)

```ts
interface Offer {
  id: string; product_id: string; store_id: string; currency: string;
  price_usd: number; price_brl: number; old_price: number | null;
  in_stock: boolean; available: boolean; stock_quantity: number | null;
  condition: string | null; warranty: string | null; cashback: number | null;
  product_url: string | null;
  created_at: string; updated_at: string;
}

interface OfferWithStore extends Offer {
  store: Store | null;
}

interface OfferWithProduct extends Offer {  // Sprint 3.4
  product: Product | null;
}
```

16 colunas reais confirmadas na Sprint 3.4.1, todas modeladas desde a Sprint 3.5 (ADR-009). Decisão de produto registrada na mesma ADR: `in_stock` é a fonte da UI para "disponível para compra" (badge "Em estoque"/"Sem estoque" em `ProductOffers.tsx`/`StoreOffers.tsx`); `available`/`stock_quantity` existem no tipo, sem consumidor ainda. `old_price`/`condition` também modelados, sem uso de UI ainda (candidatos a um badge de desconto na oferta, distinto do desconto já calculado em `ProductCard` a partir de `originalPriceUSD`/`priceUSD` para os dados de exemplo da Home).

`OfferWithProduct` é o inverso de `OfferWithStore`: usado em `getOffersByStore` (perspectiva "quais produtos esta loja oferece"), enquanto `OfferWithStore` é usado em `getOffersByProduct` (perspectiva "quais lojas vendem este produto"). Os dois joins (`offers→stores` e `offers→products`) foram confirmados funcionando (PostgREST resolve a relação por FK real).

### `Brand` (`types/brand.ts`)
```ts
interface Brand { id: string; name: string; slug: string; logo_url: string | null; created_at: string; }
```
Desde a Sprint 3.5, alimenta o filtro de marca em `/products` via `services/brand.service.ts` (`getBrands`/`getBrandBySlug`, antes vazio).

### `Category` (`types/category.ts`)
```ts
interface Category { id: string; name: string; slug: string; icon: string | null; created_at: string; }
```
`icon` é uma string livre (hoje usada como emoji, ex. `"📱"`, na Home). Desde a Sprint 3.5, alimenta o filtro de categoria em `/products` via `services/category.service.ts` (`getCategories`/`getCategoryBySlug`, antes vazio).

### `Favorite` (`types/favorite.ts`)
```ts
interface Favorite { productId: string; slug: string; name: string; imageUrl: string | null; addedAt: string; }
```
**Não é uma tabela do Supabase** — vive inteiramente no `localStorage` do navegador via `hooks/useFavorites.ts`. Estrutura achatada (não referencia `Product` por FK) porque precisa ser exibível sem nova consulta ao banco.

### `SearchResponse` (`types/search.ts`) — Sprint 3.3
```ts
interface SearchResponse {
  query: string;
  products: Product[]; stores: Store[]; brands: Brand[]; categories: Category[];
  total: number; durationMs: number;
}
```
Não é uma tabela — é a forma de retorno agregado de `services/search.service.ts` (`searchEverything`), que consulta as 4 tabelas em paralelo. Como `Product` aqui não vem de um join com `offers`, os produtos retornados pela busca não têm preço — diferente de `ProductCatalogItem` (catálogo), que resolve o preço mínimo via embedding de `offers` (ver `TECH_DEBT.md`).

## Entidades planejadas (tipos vazios — sem forma definida ainda)

- `User` (`types/user.ts`) — autenticação/conta, mencionado em `database/DATABASE.md` como tabela futura.
- `Review` (`types/review.ts`) — avaliações de produto/loja. A tabela `reviews` **não existe** no Supabase (confirmado via query — `404 Could not find the table`).

## Tabelas reais sem tipo TypeScript nem uso no código

- **`profiles`**: existe no Supabase (0 linhas), com colunas `id`, `email`, `created_at` confirmadas. Padrão típico de scaffold automático do Supabase Auth — sugere que Auth pode já estar habilitado no projeto Supabase, mesmo sem uso no código da aplicação ainda.
- **`favorites`**: existe no Supabase (0 linhas), com colunas `id`, `product_id`, `created_at` confirmadas. Coexiste com a feature de favoritos já implementada via `localStorage` (`hooks/useFavorites.ts`) — duas implementações paralelas e desconectadas do "mesmo" conceito.

## Relacionamentos

```
Brand ──┐
        ├──< Product >──┐
Category┘                ├──< Offer >── Store
                          │
                    (price vive aqui)
```

- `Product.brand_id` → `Brand.id` (N:1) — FK confirmada (join `products→brands` resolvido pelo PostgREST)
- `Product.category_id` → `Category.id` (N:1) — FK confirmada (join `products→categories` resolvido)
- `Offer.product_id` → `Product.id` (N:1) — um produto tem N ofertas — FK confirmada (join `offers→products` resolvido)
- `Offer.store_id` → `Store.id` (N:1) — uma loja tem N ofertas — FK confirmada (join `offers→stores` resolvido)
- `Favorite` não tem FK real — é uma cópia achatada de dados de `Product`, fora do banco (distinto da tabela real `favorites`, que existe no Supabase mas não é usada pelo código)
- `profiles` não tem relação conhecida com nenhuma entidade do domínio atual (sem uso no código)

## Tabelas descritas em `database/DATABASE.md` mas sem tipo TypeScript ainda

`price_history`, `product_images`, `store_images`, `reviews`, `alerts`, `search_logs`, `news`, `coupons`, `restricted_products`, `restricted_categories`, `import_jobs`, `crawler_logs`, `ai_embeddings`, `users`. Nenhuma dessas 14 tabelas existe de fato no Supabase ainda (confirmado, Sprint 3.4.1) — a documentação estava certa, são apenas visão de futuro. Nenhuma tem migration nem tipo. `price_history` ganhou, na Sprint 3.7, uma arquitetura proposta (não implementada) em `docs/DECISIONS.md` ADR-013.

## Ferramentas de dados (Sprint 3.7, sem mudança de schema)

`database/seed/` (código) e `database/migrations/0004`/`0005` (propostas, não aplicadas) não alteram nenhuma entidade documentada acima — `0004` adiciona constraints `UNIQUE (slug)` e índices sobre colunas já existentes; `0005` cria uma view derivada (`store_ranking_summary`), não uma tabela nova. Ver `docs/DECISIONS.md` ADR-012/ADR-015.
