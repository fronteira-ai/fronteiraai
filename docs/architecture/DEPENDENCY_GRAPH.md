# DEPENDENCY_GRAPH.md

Grafo de dependências entre camadas, gerado por leitura dos imports reais (não inferido). Nenhuma importação circular foi encontrada. Atualizado em 2026-06-27 (Release 1.4).

## Grafo de camadas (visão geral)

```
app/* (public)  ───────────────────────────────────────────────┐
  │                                                             │
  ▼                                                             │
components/* ◄────────────────────────┐                        │
  │                                    │                        │
  ▼                                    │                        │
hooks/* ──────────► services/* ─────────┘                      │
  │                     │                                       │
  │          ┌──────────┴──────────────────┐                   │
  │          ▼                              ▼                   │
  │    lib/supabase.ts              stores-public.service.ts    │
  │    (anon, catálogo)             lib/supabase/service.ts     │
  │          │                      (service role, server-only) │
  │          ▼                                                  │
  │    lib/env.ts ◄── constants/routes.ts                      │
  │          │                                                  │
  └─────────────► types/* ◄─────── services/*, hooks/*, components/*

app/admin/* + app/merchant/* (autenticado)
  │
  ├── lib/admin-auth.ts / lib/merchant-auth.ts
  │        │
  │        ├── lib/supabase/server.ts  (valida sessão, anon key)
  │        └── lib/supabase/service.ts (writes, service role)
  └── api/* route handlers → services/merchant.service.ts, etc.

acquisition/ (standalone Node.js — NUNCA importado pela app Next.js)
  connectors/* → AcquisitionPipeline → CatalogWriter
                                              │
                                     acquisition/lib/supabase (service role)
```

`lib/env.ts` é uma folha (não importa nada do projeto) — único ponto de contato com `process.env` (ADR-001). Exceção: `acquisition/` usa `process.env` diretamente (módulo standalone, ADR-012).

## Dependências por arquivo (camadas que importam de baixo para cima)

### `lib/env.ts`
Sem dependências internas. Lido por: `lib/supabase.ts`, `constants/routes.ts`.

### `lib/supabase.ts` (legado, anon key)
Depende de: `lib/env.ts`, `@supabase/supabase-js`. Lido por: services do catálogo público (`product`, `offer`, `store`, `search`, `brand`, `category`, `compare`).

### `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/service.ts` (ADR-028)
Dependem de: `lib/env.ts`, `@supabase/supabase-js`, `@supabase/ssr`. Lidos por: `lib/admin-auth.ts`, `lib/merchant-auth.ts`, `services/stores-public.service.ts`, Route Handlers de `api/admin/*` e `api/merchant/*`.

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
- `app/page.tsx` → `services/product.service.ts`, `services/store.service.ts`, `services/brand.service.ts`, `services/category.service.ts`, `components/home/*`, `components/layout/*`
- `app/search/page.tsx` → `services/search.service.ts`, `components/search/*`, `components/home/SearchBar`
- `app/products/page.tsx` → `services/product.service.ts`, `services/category.service.ts`, `services/brand.service.ts`, `services/store.service.ts`, `components/product/*`
- `app/product/[slug]/_cache.ts` → `services/product.service.ts`, `services/offer.service.ts` (via `React.cache`)
- `app/product/[slug]/layout.tsx` → `./_cache.ts`, `constants/routes.ts`
- `app/product/[slug]/page.tsx` → `./_cache.ts`, `components/product/*`
- `app/store/[slug]/_cache.ts` → `services/store.service.ts`, `services/offer.service.ts`
- `app/store/[slug]/layout.tsx` → `./_cache.ts`, `constants/routes.ts`
- `app/store/[slug]/page.tsx` → `./_cache.ts`, `components/store/*`
- `app/compare/[slug]/page.tsx` → `services/compare.service.ts` (via `React.cache`), `components/compare/*`
- `app/lojas/page.tsx` → `services/stores-public.service.ts` (service role)
- `app/lojas/[slug]/page.tsx` → `services/stores-public.service.ts` (service role)
- `app/admin/*` → `lib/admin-auth.ts`, `services/*.service.ts`, `components/admin/*`
- `app/merchant/*` → `lib/merchant-auth.ts`, `services/merchant.service.ts`, `components/merchant/*`
- `app/api/admin/*` → `lib/admin-auth.ts`, `lib/supabase/service.ts`
- `app/api/merchant/*` → `lib/merchant-auth.ts`, `services/merchant.service.ts`

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

- `services/product.service.ts` → `searchProducts` — zero importadores. Distinto de `searchEverything` (4 tabelas) e de `getProductsCatalog`. Candidato a remoção ou uso em autocomplete futuro.
- `services/store.service.ts` → `getStore(id)` — zero importadores. Redundante com `getStoreBySlug` desde Sprint 3.4.
- `services/offer.service.ts` → `getOffers()` — zero importadores. Retorna todas as ofertas sem filtro — uso planejado em admin/telas de gestão.

Nenhum desses é "lixo" para remover — base pronta para features planejadas. Documentados aqui para não serem recriados.

## Pontos de entrada para `process.env`

```
lib/env.ts  ← único arquivo que lê process.env na app Next.js (ADR-001)
   ▲
   ├── lib/supabase.ts
   ├── lib/supabase/server.ts
   ├── lib/supabase/client.ts
   ├── lib/supabase/service.ts
   └── constants/routes.ts

acquisition/  ← módulo standalone lê process.env diretamente (ADR-012)
```
