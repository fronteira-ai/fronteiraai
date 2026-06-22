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
- `search.service.ts` → `lib/supabase.ts` (sem tipos próprios — retorno não tipado, ver `API_CONTRACTS.md`)

### `hooks/*.ts`
- `useProduct.ts` → `services/product.service.ts`, `services/offer.service.ts`, `types/product.ts`, `types/offer.ts`
- `useFavorites.ts` → `types/favorite.ts` (não toca services/Supabase — única fonte é `localStorage`)
- `useStore.ts`, `useSearch.ts`, `useOffers.ts` — vazios, sem dependências

### `components/*`
Cada componente importa apenas de `types/`, `utils/`, `styles/`, `constants/`, outros `components/ui/`, e (só nos casos client) `hooks/`. Nenhum componente importa de `services/` ou `lib/` diretamente — regra respeitada integralmente.

### `app/*`
- `app/page.tsx` → `components/home/*`, `components/layout/*`, `constants/categories.ts`, `types/store.ts`, `types/brand.ts`, `types/product.ts`
- `app/search/page.tsx` → `components/layout/Navbar`, `components/home/SearchBar`, `components/search/SearchResults`
- `app/product/[slug]/layout.tsx` → `services/product.service.ts`, `services/offer.service.ts`, `utils/currency.ts`, `constants/routes.ts` (Server Component falando direto com a camada de services — padrão correto para Server Components, ver `CONVENTIONS.md`)
- `app/product/[slug]/page.tsx` → `hooks/useProduct.ts`, `components/product/*`, `components/layout/*`

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

- `services/search.service.ts` (`searchEverything`) — implementado, zero importadores.
- `services/product.service.ts` → `searchProducts` — implementado, zero importadores.
- `services/store.service.ts` → `getStores`, `getStore` — implementados, zero importadores (Home usa mock, não estas funções).
- `services/offer.service.ts` → `getOffers` — implementado, zero importadores.

Nenhum desses é "lixo" para remover — são a base já pronta para os domínios de Loja e Busca (ver `FEATURES.md`/`NEXT_STEPS.md`). Documentados aqui para que não sejam recriados do zero por engano.
