# DEPENDENCY_GRAPH.md

Grafo de dependências entre camadas, gerado por leitura dos imports reais (não inferido). Nenhuma importação circular foi encontrada — verificado manualmente percorrendo os imports de `types/`, `services/`, `hooks/`.

## Grafo de camadas (visão geral)

```
app/*  ──────────────────────────────────────────┐
  │                                               │
  ▼                                               │
components/* ◄──────────────────────┐             │
  │                                  │             │
  ▼                                  │             │
hooks/* ──────────► services/* ──────┘             │
  │                     │                          │
  │                     ▼                          │
  │                lib/supabase.ts                 │
  │                     │                          │
  │                     ▼                          │
  │                lib/env.ts ◄── constants/routes.ts
  │                     │
  └─────────────► types/* ◄──────── services/*, hooks/*, components/*
```

`lib/env.ts` é uma folha (não importa nada do projeto) — é o único ponto de contato com `process.env` (ver `docs/DECISIONS.md`, ADR-001).

## Dependências por arquivo (camadas que importam de baixo para cima)

### `lib/env.ts`
Sem dependências internas. Lido por: `lib/supabase.ts`, `constants/routes.ts`.

### `lib/supabase.ts`
Depende de: `lib/env.ts`, `@supabase/supabase-js`. Lido por: todo `services/*.service.ts` implementado.

### `types/*.ts`
Dependências internas só entre tipos: `offer.ts` → `store.ts`; `product.ts` → `brand.ts`, `category.ts`. Sem ciclo (nenhum tipo importa de volta `offer.ts` ou `product.ts` a partir de `store.ts`/`brand.ts`/`category.ts`).

### `services/*.service.ts`
- `product.service.ts` → `lib/supabase.ts`, `types/product.ts`
- `offer.service.ts` → `lib/supabase.ts`, `types/offer.ts`
- `store.service.ts` → `lib/supabase.ts`, `types/store.ts`
- `search.service.ts` → `lib/supabase.ts`, `types/search.ts`, `types/product.ts`, `types/store.ts`, `types/brand.ts`, `types/category.ts` (Sprint 3.3: ganhou tipo de retorno próprio)

### `hooks/*.ts`
- `useProduct.ts` → `services/product.service.ts`, `services/offer.service.ts`, `types/product.ts`, `types/offer.ts`
- `useFavorites.ts` → `types/favorite.ts` (não toca services/Supabase — única fonte é `localStorage`)
- `useSearch.ts` → `constants/routes.ts` (`searchPath`), `next/navigation` (`useRouter`) — não chama `search.service.ts` diretamente; a busca real acontece no Server Component da página
- `useStore.ts` (Sprint 3.4) → `services/store.service.ts` (`getStoreBySlug`, `getRelatedStores`), `services/offer.service.ts` (`getOffersByStore`), `types/store.ts`, `types/offer.ts` — espelha `useProduct.ts`
- `useOffers.ts` — vazio, sem dependências

### `components/*`
Cada componente importa apenas de `types/`, `utils/`, `styles/`, `constants/`, outros `components/ui/`, e (só nos casos client) `hooks/`. Nenhum componente importa de `services/` ou `lib/` diretamente — regra respeitada integralmente.

### `app/*`
- `app/page.tsx` → `components/home/*`, `components/layout/*`, `constants/categories.ts`, `types/store.ts`, `types/brand.ts`, `types/product.ts`
- `app/search/page.tsx` (Sprint 3.3) → `services/search.service.ts` (Server Component falando direto com a camada de services, mesmo padrão de `app/product/[slug]/layout.tsx`), `components/layout/Navbar`/`Footer`, `components/home/SearchBar`, `components/search/SearchResults`/`SearchResultsSkeleton`, `constants/routes.ts` (`searchUrl`)
- `app/search/error.tsx` (Sprint 3.3, Client) → `components/layout/Navbar`/`Footer`
- `app/layout.tsx` (Sprint 3.3) → `constants/routes.ts` (`SITE_URL`, `searchUrl`)
- `app/product/[slug]/layout.tsx` → `services/product.service.ts`, `services/offer.service.ts`, `utils/currency.ts`, `constants/routes.ts` (Server Component falando direto com a camada de services — padrão correto para Server Components, ver `CONVENTIONS.md`)
- `app/product/[slug]/page.tsx` → `hooks/useProduct.ts`, `components/product/*`, `components/layout/*`
- `app/store/[slug]/layout.tsx` (Sprint 3.4) → `services/store.service.ts` (`getStoreBySlug`), `constants/routes.ts` (`storeUrl`) — mesmo padrão de `app/product/[slug]/layout.tsx`
- `app/store/[slug]/page.tsx` (Sprint 3.4) → `hooks/useStore.ts`, `components/store/*`, `components/ui/EmptyState`, `components/layout/*`

## Pontos de entrada para `process.env` (deve ficar restrito a 1 arquivo)

```
lib/env.ts  ← único arquivo que lê process.env (ADR-001)
   ▲
   │
   ├── lib/supabase.ts
   └── constants/routes.ts
```

Verificação: `grep -rn "process\.env" --include="*.ts" --include="*.tsx" . --exclude-dir=node_modules --exclude-dir=.next` deve retornar ocorrências apenas dentro de `lib/env.ts`.

## Código morto identificado (sem consumidor em todo o grafo)

- ~~`services/search.service.ts` (`searchEverything`)~~ — **resolvido na Sprint 3.3**: consumido por `app/search/page.tsx`.
- ~~`services/store.service.ts` → `getStores`~~ — ainda zero importadores diretos (Home usa mock), mas é a mesma função que alimentaria uma futura `/stores` (Sprint D).
- `services/product.service.ts` → `searchProducts` — implementado, zero importadores (distinto de `searchEverything`; busca só em `products`, não usado pela página de busca atual).
- `services/store.service.ts` → `getStore(id)` — implementado, zero importadores; redundante desde a Sprint 3.4 com `getStoreBySlug` (que tem consumidor real).
- `services/offer.service.ts` → `getOffers` — implementado, zero importadores.

Nenhum desses é "lixo" para remover — são a base já pronta para domínios futuros (`/stores`, ver `FEATURES.md`/`NEXT_STEPS.md`). Documentados aqui para que não sejam recriados do zero por engano.
