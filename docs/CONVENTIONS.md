# CONVENTIONS.md

Convenções observadas e confirmadas no código real (não aspiracionais). Onde o código já diverge de uma convenção, isso está marcado como "Excepção atual" em vez de ser escondido.

## Nomenclatura

- Componentes: `PascalCase.tsx`, um componente default-exportado por arquivo (`ProductCard.tsx` → `export default function ProductCard`).
- Hooks: `camelCase.ts`, prefixo `use` (`useProduct.ts`, `useFavorites.ts`).
- Services: `<dominio>.service.ts`, funções nomeadas exportadas (não default) — `getProductBySlug`, `getOffersByProduct`.
- Tipos: `PascalCase` para a interface, arquivo em `camelCase` no singular (`types/store.ts` exporta `Store`; `types/offer.ts` exporta `Offer` e `OfferWithStore`).
- Imports: sempre absolutos via alias `@/*` (`@/components/...`, `@/services/...`), nunca relativos cruzando camadas. Única excepção observada: `app/product/[slug]/page.tsx` importa `./loading` (relativo, mas dentro da mesma pasta de rota — aceitável).

## Camadas e fluxo de dados

`types/*.ts` → `services/*.service.ts` → `hooks/use*.ts` → `components/*` → `app/*`. Componentes nunca devem chamar Supabase diretamente — sempre via service (direto, em Server Components, ou via hook, em Client Components).

**Excepção atual**: `app/product/[slug]/layout.tsx` (Server Component) chama `services/product.service.ts`/`offer.service.ts` diretamente, sem passar por hook — correto para Server Components, mas cria fetch duplicado com a page (ver `ARCHITECTURE.md`).

## Tratamento de erro em services

Toda função de service que consulta o Supabase segue o mesmo padrão:

```ts
const { data, error } = await supabase.from("table").select(...);
if (error) {
  console.error(error);
  return [];   // ou null, para singulares
}
return data as Tipo[];
```

Nunca lança exceção para erros de query — sempre retorna um valor "vazio" seguro (`[]`/`null`) e loga. Hooks/componentes tratam ausência de dados, não exceções.

**Excepção atual**: `searchProducts` (em `product.service.ts`) e `getStore` (em `store.service.ts`) não seguem o padrão à risca — não logam erro explicitamente antes de retornar.

## Variáveis de ambiente

Toda variável de ambiente é acessada exclusivamente via `lib/env.ts` (ver `docs/DECISIONS.md`, ADR-001). Nenhum outro arquivo deve importar `process.env`.

## Client vs. Server Components

Um componente só recebe `"use client"` quando precisa de: estado (`useState`), efeitos (`useEffect`), APIs do browser (`localStorage`, `IntersectionObserver`, `navigator.share`/`clipboard`), ou hooks de navegação client-side (`useParams`, `useRouter`). Tudo o resto é Server Component por padrão — incluindo a maioria dos componentes de apresentação puros, mesmo que recebam props complexas.

**Excepção atual**: `app/product/[slug]/page.tsx` é inteiramente `"use client"` apesar de a maior parte do seu conteúdo ser apresentação pura — decisão pragmática para usar `useProduct`, não a aplicação estrita da regra.

## Estilo visual (Tailwind)

Utility-first, sem CSS Modules nem styled-components. Tema "dark space": fundo `bg-[#050816]`, acentos `blue-500`/`cyan-400`, cards em `slate-800`/`slate-900` com `rounded-3xl`. Cores e espaçamentos são valores Tailwind arbitrários inline (`bg-[#050816]`), não tokens de `styles/theme.ts` (que está vazio — ver `TECH_DEBT.md`). Animações centralizadas em `styles/animations.ts` e usadas via template strings (`` `${animations.cardHover}` ``), nunca repetidas como classes cruas nos componentes.

## Memoização

Componentes de apresentação que recebem props estáveis (cards de listas) são envolvidos em `memo()` antes do export: `ProductCard`, `ProductHighlightCard`, `StoreCard`, `ProductHeader`, `ProductSpecifications`, `ProductOffers`, `ProductBreadcrumb`, `RelatedProducts`, `CategoryCard`, `FeatureCard`, `StatCard`, `Reveal`, `ProductGallery`. Componentes de seção/layout que recebem children (`Section`, `Button`, `Card` etc.) e componentes únicos por página (`Navbar`, `Footer`, `Hero`) não usam `memo`.

## Modelagem de domínio

"Produto é único, loja é única, oferta é única; o preço pertence à oferta, não ao produto" (`database/DATABASE.md`). Por isso `Offer` tem `price`/`currency`/`stock`, e `Product` nunca tem campo de preço — todo preço chega via `OfferWithStore[]`. Tipos de composição (`ProductWithRelations`, `OfferWithStore`, `ProductHighlight`) existem para representar o resultado de `select()` com joins, sempre como `extends` ou interface paralela ao tipo base — nunca um tipo genérico `any`/`Record<string, unknown>`.

## Placeholders intencionais

Arquivos vazios (0 bytes ou 1 linha) em `services/`, `hooks/`, `types/`, `utils/`, `constants/`, `styles/`, `components/` são reservas de nome para trabalho planejado (ver `docs/ROADMAP.md`), não código esquecido. Antes de assumir que um arquivo está implementado, sempre abra-o — o nome existir não é garantia de conteúdo (foi a causa-raiz do incidente de deploy documentado em `docs/CHANGELOG.md`, 2026-06-22).
