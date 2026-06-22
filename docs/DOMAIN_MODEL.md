# DOMAIN_MODEL.md

Modelo de domínio extraído diretamente de `types/*.ts`. Onde um tipo está vazio (placeholder), está marcado como tal — não inventado.

## Filosofia (de `database/DATABASE.md`)

> Produto é único. Loja é única. Oferta é única. O preço pertence à oferta, não ao produto.

Isso significa: o mesmo produto físico (`Product`) pode ter N `Offer`s, uma por loja que o vende, cada uma com seu próprio preço/estoque/condições. Nunca há preço no `Product` em si.

## Entidades implementadas

### `Store` (`types/store.ts`)
```ts
interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  country: string;
  rating: number;
  logo_url: string | null;
  banner_url: string | null;
  verified: boolean;
  created_at: string;
}
```
Representa uma loja parceira (ex.: Cellshop, Nissei). `rating` é um número direto na tabela (não calculado a partir de reviews — `Review` ainda não existe).

### `Product` / `ProductWithRelations` / `ProductHighlight` (`types/product.ts`)
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

interface ProductHighlight {  // forma resumida para vitrines (Home)
  id: string; slug: string; name: string; imageUrl: string | null;
  storeName: string; priceUSD: number; originalPriceUSD?: number; inStock: boolean;
}
```
`Product` nunca tem preço — confere com a filosofia do domínio. `ProductHighlight` é a única exceção textual (tem `priceUSD`), porque representa a *melhor oferta* de um produto já resolvida para exibição, não o produto em si — hoje preenchida com dados de exemplo, no futuro deve vir de uma consulta agregando `products` + `offers`.

### `Offer` / `OfferWithStore` (`types/offer.ts`)
```ts
interface Offer {
  id: string; product_id: string; store_id: string;
  price: number; currency: string; stock: boolean;
  installments: number | null; warranty: string | null; cashback: number | null;
  url: string | null; created_at: string; updated_at: string;
}

interface OfferWithStore extends Offer {
  store: Store | null;
}
```
É aqui que o preço mora. `currency` é livre (string), convertido em runtime via `utils/currency.ts` (suporta `USD`/`BRL` hoje).

### `Brand` (`types/brand.ts`)
```ts
interface Brand { id: string; name: string; slug: string; logo_url: string | null; created_at: string; }
```

### `Category` (`types/category.ts`)
```ts
interface Category { id: string; name: string; slug: string; icon: string | null; created_at: string; }
```
`icon` é uma string livre (hoje usada como emoji, ex. `"📱"`, na Home).

### `Favorite` (`types/favorite.ts`)
```ts
interface Favorite { productId: string; slug: string; name: string; imageUrl: string | null; addedAt: string; }
```
**Não é uma tabela do Supabase** — vive inteiramente no `localStorage` do navegador via `hooks/useFavorites.ts`. Estrutura achatada (não referencia `Product` por FK) porque precisa ser exibível sem nova consulta ao banco.

## Entidades planejadas (tipos vazios — sem forma definida ainda)

- `User` (`types/user.ts`) — autenticação/conta, mencionado em `database/DATABASE.md` como tabela futura.
- `Review` (`types/review.ts`) — avaliações de produto/loja, tabela futura.
- `Search` (`types/search.ts`) — provavelmente forma de resultado/estado de busca; sem uso ainda.

## Relacionamentos

```
Brand ──┐
        ├──< Product >──┐
Category┘                ├──< Offer >── Store
                          │
                    (price vive aqui)
```

- `Product.brand_id` → `Brand.id` (N:1)
- `Product.category_id` → `Category.id` (N:1)
- `Offer.product_id` → `Product.id` (N:1) — um produto tem N ofertas
- `Offer.store_id` → `Store.id` (N:1) — uma loja tem N ofertas
- `Favorite` não tem FK real — é uma cópia achatada de dados de `Product`, fora do banco

## Tabelas descritas em `database/DATABASE.md` mas sem tipo TypeScript ainda

`price_history`, `product_images`, `store_images`, `reviews` (parcialmente cobertas por `types/review.ts`, vazio), `alerts`, `search_logs`, `news`, `coupons`, `restricted_products`, `restricted_categories`, `import_jobs`, `crawler_logs`, `ai_embeddings`. Nenhuma tem migration nem tipo — são apenas visão de futuro documentada.
