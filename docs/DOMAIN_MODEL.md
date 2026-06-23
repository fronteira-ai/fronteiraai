# DOMAIN_MODEL.md

Modelo de domínio extraído diretamente de `types/*.ts`. Onde um tipo está vazio (placeholder), está marcado como tal — não inventado.

> ⚠️ **Sprint 3.4.1 (auditoria de dados)**: os tipos abaixo foram confrontados com o schema real do Supabase (consulta direta, coluna por coluna, via PostgREST — sem chave de serviço, só leitura). **`Store` e `Offer` estavam incorretos**: vários campos que o código usa não existem no banco com esse nome, e o banco tem ~15 colunas que nenhum tipo modela. Cada entidade abaixo agora tem uma seção "Schema real confirmado" junto da seção "Tipo TypeScript atual" para deixar a divergência explícita. Ver `docs/DECISIONS.md` ADR-008 para o achado completo e o plano de correção (não aplicado ainda).

## Filosofia (de `database/DATABASE.md`)

> Produto é único. Loja é única. Oferta é única. O preço pertence à oferta, não ao produto.

Isso significa: o mesmo produto físico (`Product`) pode ter N `Offer`s, uma por loja que o vende, cada uma com seu próprio preço/estoque/condições. Nunca há preço no `Product` em si.

## Entidades implementadas

### `Store` (`types/store.ts`)

**Tipo TypeScript atual:**
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
  banner_url: string | null;   // ❌ não existe no banco real — ver abaixo
  verified: boolean;            // ❌ não existe no banco real — ver abaixo
  created_at: string;
}
```

**Schema real confirmado** (Sprint 3.4.1, amostra de dados das 5 lojas reais via `select("*")`):
```
id, name, description, whatsapp, website, address, city, rating,
created_at, logo_url, instagram, is_verified, opening_hours,
latitude, longitude, slug, cover_image, delivery, pickup, pix_br,
active, phone, email, country
```

**Divergências**:
- `banner_url` (tipo) vs `cover_image` (banco real) — **nomes diferentes, mesmo propósito**. Todo código que lê `store.banner_url` (`StoreCard`, `app/store/[slug]/page.tsx`, `app/store/[slug]/layout.tsx`) sempre recebe `undefined`, mesmo quando a loja tem capa cadastrada — o banner real nunca é exibido.
- `verified` (tipo) vs `is_verified` (banco real) — mesmo problema: o badge "Loja verificada" (`StoreCard`, `StoreDetails`) nunca aparece, mesmo para as 3 lojas reais marcadas como verificadas (`is_verified: true`).
- Colunas reais **sem nenhum campo correspondente no tipo** (13): `whatsapp`, `website`, `address`, `instagram`, `opening_hours`, `latitude`, `longitude`, `delivery`, `pickup`, `pix_br`, `active`, `phone`, `email`. A Sprint 3.4 concluiu (corretamente, com a informação que tinha então) que contato/horário "não existiam no schema" — na verdade existiam, só não foram encontrados porque a investigação partiu do tipo já desatualizado, não de uma consulta direta ao banco. Ver ADR-008.

Representa uma loja parceira (ex.: Cellshop, Nissei). `rating` é um número direto na tabela (não calculado a partir de reviews — não existe nenhuma tabela `reviews` no Supabase, confirmado nesta sprint). **Achado de dados**: as 5 linhas reais hoje têm `slug: null` e `active: null` em todas (ver ADR-007/ADR-008).

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

**Schema real confirmado** (Sprint 3.4.1 — tabela `products` está com 0 linhas, então as colunas foram confirmadas testando `select(coluna)` uma a uma e lendo o erro "column does not exist" quando ausente, em vez de ler dados de exemplo):
```
id, name, slug, description, brand_id, category_id, image_url,
specifications, created_at, sku, weight, model, updated_at, active,
gtin, release_date
```
Diferente de `Store`, aqui não há **nenhum nome trocado** — todos os campos do tipo `Product` existem de fato com o mesmo nome. Há 7 colunas reais sem tipo correspondente (`sku`, `weight`, `model`, `updated_at`, `active`, `gtin`, `release_date`) — não são bloqueantes (services ignoram colunas que não pedem), mas ficam de fora do `select("*")` tipado como `Product[]`.

### `Offer` / `OfferWithStore` (`types/offer.ts`)

**Tipo TypeScript atual:**
```ts
interface Offer {
  id: string; product_id: string; store_id: string;
  price: number;        // ❌ não existe no banco real — ver abaixo
  currency: string;
  stock: boolean;        // ❌ não existe no banco real — ver abaixo
  installments: number | null;  // ❌ não existe no banco real
  warranty: string | null; cashback: number | null;
  url: string | null;    // ❌ não existe no banco real — ver abaixo
  created_at: string; updated_at: string;
}

interface OfferWithStore extends Offer {
  store: Store | null;
}

interface OfferWithProduct extends Offer {  // Sprint 3.4
  product: Product | null;
}
```

**Schema real confirmado** (mesmo método: tabela `offers` com 0 linhas, testado coluna por coluna):
```
id, product_id, store_id, currency, warranty, cashback, created_at,
updated_at, in_stock, available, product_url, old_price, condition,
price_usd, price_brl, stock_quantity
```

**Divergências — esta é a mais grave encontrada na auditoria**:
- **`price` não existe.** O preço real é guardado em **`price_usd` e `price_brl` separadamente** (dois valores independentes, não um valor + `currency` convertido em runtime). Isso é uma diferença de *modelo*, não só de nome: `utils/currency.ts` (`convertToUSD`/`convertToBRL`, taxa fixa `USD_TO_BRL_RATE = 5.4`) assume que existe um preço + moeda de origem e converte matematicamente — mas o banco real já guarda os dois preços prontos, provavelmente definidos independentemente por quem cadastra a oferta (preços não precisam seguir uma taxa de conversão fixa). Todo código que faz `convertToUSD(offer.price, offer.currency)` (`ProductOffers.tsx`, `StoreOffers.tsx`) está calculando sobre `undefined`, resultando em `NaN` exibido como preço assim que existir ao menos uma oferta real.
- **`stock` não existe.** Existem **dois** campos relacionados: `in_stock` (boolean, provável) e `available` (boolean, provável) — semântica exata de cada um não confirmada (pode ser "tem estoque" vs "está à venda agora", ex. produto descontinuado vs temporariamente esgotado). Há também `stock_quantity`, sugerindo que o controle de estoque pode ser por quantidade, não só boolean. Todo código que lê `offer.stock` (badge "Em estoque"/"Sem estoque") sempre recebe `undefined` → sempre falso → **sempre mostra "Sem estoque"**, mesmo para ofertas disponíveis.
- **`installments` não existe.** Nenhum campo de parcelamento foi encontrado nas colunas testadas (testados `installments_count`, `min_installments`, `max_installments_value`, `installment_value`, etc. — todos ausentes). Pode não estar implementado no schema ainda, ou usar um nome não testado nesta auditoria.
- **`url` não existe.** O campo real é **`product_url`**. O botão "Ver oferta" (`ProductOffers.tsx`, `StoreOffers.tsx`) lê `offer.url`, que é sempre `undefined` → o botão nunca aparece.
- Campos reais sem nenhum tipo correspondente: `old_price` (provavelmente preço anterior, para mostrar desconto — sem sufixo `_usd`/`_brl`, então sua moeda é ambígua), `condition` (provavelmente "novo"/"usado", valores não confirmados).

`OfferWithProduct` é o inverso de `OfferWithStore`: usado em `getOffersByStore` (perspectiva "quais produtos esta loja oferece"), enquanto `OfferWithStore` é usado em `getOffersByProduct` (perspectiva "quais lojas vendem este produto"). Os dois joins (`offers→stores` e `offers→products`) foram confirmados funcionando (PostgREST resolve a relação por FK real) — o problema é exclusivamente nos nomes/modelo de preço e estoque, não na modelagem relacional.

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

### `SearchResponse` (`types/search.ts`) — Sprint 3.3
```ts
interface SearchResponse {
  query: string;
  products: Product[]; stores: Store[]; brands: Brand[]; categories: Category[];
  total: number; durationMs: number;
}
```
Não é uma tabela — é a forma de retorno agregado de `services/search.service.ts` (`searchEverything`), que consulta as 4 tabelas em paralelo. Como `Product` aqui não vem de um join com `offers`, os produtos retornados pela busca não têm preço (ver `TECH_DEBT.md`).

## Entidades planejadas (tipos vazios — sem forma definida ainda)

- `User` (`types/user.ts`) — autenticação/conta, mencionado em `database/DATABASE.md` como tabela futura. **Achado da Sprint 3.4.1**: a tabela `reviews` (que `Review` representaria) **não existe** no Supabase (confirmado via query — `404 Could not find the table`), apesar de listada como "futura" em `database/DATABASE.md`, consistente com a documentação.
- `Review` (`types/review.ts`) — avaliações de produto/loja, tabela futura (ver achado acima).

## Tabelas reais sem tipo TypeScript nem uso no código (descobertas na Sprint 3.4.1)

- **`profiles`**: existe no Supabase (0 linhas), com colunas `id`, `email`, `created_at` confirmadas. Não é mencionada em nenhum documento do projeto. Padrão típico de scaffold automático do Supabase Auth (tabela `public.profiles` ligada a `auth.users` via trigger) — sugere que **Auth pode já estar habilitado no projeto Supabase**, mesmo que `docs/PROJECT_STATUS.md` diga "sem Supabase Auth configurado" (essa afirmação se refere ao código da aplicação, que de fato não usa Auth — mas a infraestrutura no painel pode já existir parcialmente). Vale confirmar no painel do Supabase antes da Sprint que implementar contas de usuário.
- **`favorites`**: existe no Supabase (0 linhas), com colunas `id`, `product_id`, `created_at` confirmadas (sem `user_id` nem `store_id` testados como existentes). Coexiste com a feature de favoritos já implementada via `localStorage` (`hooks/useFavorites.ts`) — são duas implementações paralelas e desconectadas do "mesmo" conceito. Relevante para o plano de migração de favoritos anônimos → favoritos por usuário citado em `docs/TECH_DEBT.md`.

## Relacionamentos

```
Brand ──┐
        ├──< Product >──┐
Category┘                ├──< Offer >── Store
                          │
                    (price vive aqui)
```

- `Product.brand_id` → `Brand.id` (N:1) — **FK confirmada** na Sprint 3.4.1 (join `products→brands` resolvido pelo PostgREST sem erro)
- `Product.category_id` → `Category.id` (N:1) — **FK confirmada** (join `products→categories` resolvido)
- `Offer.product_id` → `Product.id` (N:1) — um produto tem N ofertas — **FK confirmada** (join `offers→products` resolvido)
- `Offer.store_id` → `Store.id` (N:1) — uma loja tem N ofertas — **FK confirmada** (join `offers→stores` resolvido)
- `Favorite` não tem FK real — é uma cópia achatada de dados de `Product`, fora do banco (distinto da tabela real `favorites`, que existe no Supabase mas não é usada pelo código — ver seção acima)
- `profiles` não tem relação conhecida com nenhuma entidade do domínio atual (sem uso no código)

## Tabelas descritas em `database/DATABASE.md` mas sem tipo TypeScript ainda

`price_history`, `product_images`, `store_images`, `reviews`, `alerts`, `search_logs`, `news`, `coupons`, `restricted_products`, `restricted_categories`, `import_jobs`, `crawler_logs`, `ai_embeddings`, `users`. **Confirmado na Sprint 3.4.1** (query direta, todas retornaram `404 Could not find the table`): nenhuma dessas 14 tabelas existe de fato no Supabase ainda — a documentação estava certa, são apenas visão de futuro. Nenhuma tem migration nem tipo.
