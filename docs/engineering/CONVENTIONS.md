# CONVENTIONS.md
# Manual de Convenções de Engenharia do ParaguAI

**Versão**: 2.0  
**Criado**: 2026-06-28  
**Status**: Referência permanente — atualizar via ADR quando uma convenção mudar  
**Alinhado com**: Release 1.4 · `docs/architecture/ARCHITECTURE.md` · `docs/foundation/ENGINEERING_PRINCIPLES.md`

---

## 1. Filosofia

**Convenções reduzem carga cognitiva. Consistência é mais valiosa que elegância.**

Quando qualquer parte do projeto é previsível, um desenvolvedor novo pode navegar código que nunca viu e entender o que está acontecendo sem precisar perguntar. Quando cada arquivo segue "a preferência do autor", cada parte exige reconstrução de contexto.

Convenções não existem para restringir criatividade — existem para que a criatividade seja investida nos problemas de produto, não nos problemas de organização. Um codebase consistente reduz o custo de modificação e aumenta a velocidade sustentável.

**Três regras fundamentais:**

1. **Consistência acima de preferência pessoal.** Se o projeto já faz X de uma forma, continue fazendo da mesma forma — mesmo que você prefira Y. Divergência sem ADR é débito.

2. **Documente exceções, não as esconda.** Se uma convenção não pode ser seguida em um caso específico, anote o motivo no arquivo. Uma exceção explicada é melhor que uma inconsistência silenciosa.

3. **Toda nova convenção nasce de um ADR.** Nenhuma nova regra de engenharia é adotada por hábito ou preferência individual. A decisão é documentada, o raciocínio registrado, e a convenção propagada para cá.

---

## 2. Organização do Projeto

### 2.1 Quando criar nova pasta

Crie uma nova pasta quando um conjunto de arquivos tem responsabilidade claramente distinta e essa responsabilidade crescerá ao longo do tempo. Não crie pasta para um único arquivo.

Exemplos de pastas legítimas: `components/merchant/dashboard/` (widgets específicos do dashboard do merchant), `components/admin/catalog/` (formulários de catálogo). Exemplo ilegítimo: criar `components/admin/catalog/helpers/` para um único utilitário de formulário.

### 2.2 Quando reutilizar pasta existente

Se o novo arquivo serve o mesmo domínio de uma pasta existente, vai lá. Um novo componente de produto vai em `components/product/`, não em `components/home/product/`.

### 2.3 Quando mover arquivo

Mova quando a localização atual for enganosa — o arquivo resolve um problema diferente da pasta onde está. Mover gera breaking change de import — atualizar todos os consumidores no mesmo commit.

### 2.4 Estrutura de referência

```
types/         ← contratos de tipo por domínio (um arquivo por entidade principal)
services/      ← queries Supabase por domínio (um arquivo por domínio)
hooks/         ← estado client-side (um hook por domínio)
components/    ← UI por domínio + kit compartilhado em ui/
app/           ← rotas (orquestradores, não implementadores)
lib/           ← infraestrutura: Supabase clients, auth guards, env
utils/         ← funções puras sem efeitos colaterais
constants/     ← valores estáticos e builders de URL
contexts/      ← React Contexts (um arquivo por contexto)
styles/        ← tokens de animação e tema
acquisition/   ← pipeline de dados (módulo standalone, nunca importado pela app)
```

---

## 3. Convenções de Arquivos e Nomenclatura

### 3.1 Componentes React

- Nome de arquivo: `PascalCase.tsx`
- Um componente `default export` por arquivo
- Nome da função = nome do arquivo: `ProductCard.tsx` → `export default function ProductCard`
- Exceção: Admin e Merchant usam `export function` (named export) quando o componente é co-exportado com variantes ou tipos — ex: `ScoreCard`, `RecommendationsPanel`

```
components/product/ProductCard.tsx     ✓
components/product/product-card.tsx    ✗
components/product/productCard.tsx     ✗
```

### 3.2 Hooks

- Nome de arquivo: `camelCase.ts`
- Prefixo obrigatório: `use`
- Um hook por arquivo, named export

```
hooks/useSearch.ts          → export function useSearch()   ✓
hooks/SearchHook.ts         → export function useSearch()   ✗
hooks/search.ts             → export function useSearch()   ✗
```

### 3.3 Services

- Nome de arquivo: `<dominio>.service.ts`
- Funções named export (nunca default)
- Nome das funções: verbo + entidade em camelCase

```
services/product.service.ts   → getProductBySlug(), getProducts(), getRelatedProducts()   ✓
services/ProductService.ts    → class ProductService {}                                   ✗
```

### 3.4 Types

- Nome de arquivo: `camelCase.ts` no singular (`product.ts`, `offer.ts`)
- Interfaces em `PascalCase`
- Campos da interface: `snake_case` para campos que espelham o banco; `camelCase` para campos computados

```typescript
// types/product.ts
export interface Product {
  id: string;
  name: string;
  brand_id: string;        // snake_case — espelha coluna do banco
  image_url: string | null;
  created_at: string;
}

export interface ProductCatalogItem extends Product {
  lowestPriceUSD: number | null;  // camelCase — campo computado
  inStock: boolean;                // camelCase — campo computado
}
```

### 3.5 Utils

- Nome de arquivo: `camelCase.ts`, nomeado pelo domínio da função
- Funções puras, named export
- Sem efeitos colaterais, sem Supabase, sem imports de components

```
utils/currency.ts    → formatUSD(), formatBRL(), discountPercentage()
utils/slug.ts        → slugify()
utils/search.ts      → escapeLikePattern()
utils/analytics.ts   → analytics.clickExternalOffer()
utils/storage.ts     → funções de localStorage
```

### 3.6 Constants

- Nome de arquivo: `camelCase.ts`
- Constantes em `SCREAMING_SNAKE_CASE`
- Builders de URL: funções nomeadas que retornam string

```typescript
// constants/routes.ts
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL;
export function productPath(slug: string): string { return `/product/${slug}`; }
export function comparePath(slug: string): string { return `/compare/${slug}`; }
```

### 3.7 Rotas (App Router)

- `page.tsx` — Server Component por padrão, orquestrador da rota
- `layout.tsx` — Server Component, define chrome da rota
- `loading.tsx` — Suspense fallback da rota
- `error.tsx` — Error boundary da rota (Client Component — requer `"use client"`)
- `not-found.tsx` — 404 da rota
- `_cache.ts` — módulo de fetches compartilhados entre layout e page (ADR-021)

### 3.8 Imports

Sempre absolutos via alias `@/*`. Nunca imports relativos cruzando camadas.

```typescript
import { ProductCard } from "@/components/product/ProductCard";   ✓
import { supabase } from "@/lib/supabase";                       ✓
import ProductCard from "../../components/product/ProductCard";   ✗
```

Exceção válida: imports relativos dentro da mesma pasta de rota (`./loading`, `./_cache`).

### 3.9 Contexts

- Arquivo: `contexts/<escopo>/NomeContext.tsx`
- Exporta: `NomeProvider`, `useNome`, tipos relacionados
- Tudo no mesmo arquivo — Provider + hook + types

```
contexts/admin/ToastContext.tsx → export { ToastProvider, useToast, ToastType }
```

---

## 4. Convenções de Componentes

### 4.1 Server Component por padrão

Todo componente é Server Component a menos que tenha razão concreta para ser Client. A lista de razões válidas:

- `useState` / `useReducer` (estado local)
- `useEffect` (efeito colateral de browser)
- APIs de browser: `localStorage`, `IntersectionObserver`, `navigator.share`, `window.scrollY`
- Hooks de navegação: `useRouter()`, `usePathname()`, `useSearchParams()`
- Handlers de evento que precisam de estado derivado

Se nenhuma dessas razões existe, o componente é Server Component — sem `"use client"`.

### 4.2 Props

Props são definidas como interface TypeScript no mesmo arquivo, prefixadas com `Props`:

```typescript
interface Props {
  product: Product;
  showPrice?: boolean;
}

export default function ProductCard({ product, showPrice = true }: Props) { ... }
```

- Props obrigatórias não têm valor default
- Props opcionais têm `?` e valor default na desestruturação
- Nunca use `React.FC<Props>` — declare a função diretamente

### 4.3 Composição

Componentes de feature orquestram; componentes de UI apresentam. Um componente de feature pode chamar `getProducts()` diretamente se for Server Component. Um componente de UI recebe dados via props.

Regra de detecção: se um componente precisar ser reescrito para exibir dados diferentes, é de feature. Se precisar apenas de props diferentes, é de UI.

### 4.4 Responsabilidade única

Um componente faz uma coisa. Se o nome incluir "And" (`ProductCardAndModal`), é sinal de que duas responsabilidades foram acopladas. Separe.

### 4.5 Memoização

Componentes de lista (renderizados múltiplas vezes com props estáveis) usam `memo()`:

```typescript
export default memo(ProductCard);
export default memo(CompareOfferCard);
```

Componentes de layout, seção ou únicos por página não usam `memo` — o overhead de comparação não vale para componentes que renderizam uma vez.

### 4.6 Kit UI (`components/ui/`)

Componentes em `ui/` são primitivos visuais sem lógica de domínio. Regras:
- Nunca importam `services/` ou `hooks/`
- Nunca contêm lógica condicional de negócio (`if (isVerified)...`)
- Nunca têm efeito colateral além de animação local

---

## 5. Convenções de Hooks

### 5.1 Quando criar um hook

Crie um hook quando:
- O estado precisa ser compartilhado entre múltiplos componentes
- A lógica de estado é complexa o suficiente para poluir o componente
- O hook encapsula uma convenção de comportamento (ex: URL como fonte de verdade)

### 5.2 Quando NÃO criar um hook

Não crie hook para:
- Isolar uma única linha de código
- Abstrair chamada a service quando um Server Component pode chamar o service diretamente
- Compartilhar lógica que é apenas presentacional

O anti-pattern mais comum: criar `useProductPage()` que apenas chama `getProductBySlug()` — quando a page é Server Component, ela pode chamar o service diretamente sem hook.

### 5.3 Convenção de retorno

Hooks retornam um objeto nomeado, não uma tupla (exceto quando o padrão `[state, setter]` é óbvio como em `useState`):

```typescript
// Correto
return { query, setQuery, submit };

// Evitar (exceto useState-like)
return [query, setQuery, submit];
```

### 5.4 Hooks e URL como fonte de verdade

Hooks que gerenciam estado de filtros ou busca (`useSearch`, `useProductFilters`) nunca mantêm o estado apenas em `useState`. A URL é a fonte de verdade. O hook lê de `useSearchParams()` e escreve via `router.push()`. Resultado: estado compartilhável por link, funciona com SSR, sobrevive a reload.

---

## 6. Convenções de Services

### 6.1 Padrão de retorno

Toda função de service que consulta o Supabase segue o padrão:

```typescript
export async function getProductBySlug(slug: string): Promise<ProductWithRelations | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, brand:brands(*), category:categories(*)")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(error);
    return null;   // singular → null
  }

  return data as ProductWithRelations;
}
```

- Listas retornam `[]` em erro
- Singulares retornam `null` em erro
- Nunca lançam exceção
- Sempre logam o erro via `console.error`
- Nunca retornam `undefined`

### 6.2 Tipo de retorno explícito

Toda função de service tem tipo de retorno explícito na assinatura. O TypeScript inferido não é suficiente — o tipo explícito documenta o contrato.

```typescript
export async function getProducts(): Promise<Product[]>          ✓
export async function getProducts()                              ✗ (inferência oculta)
```

### 6.3 Um service por domínio

`services/product.service.ts` trata apenas de produtos. Se uma função de produto precisar de dados de loja, ela chama `store.service.ts` — não duplica a query.

### 6.4 Services não têm lógica de negócio

Services fazem queries. A lógica de negócio (calcular score, ranquear ofertas, computar métricas) vive em funções separadas dentro do arquivo de service ou em utils — nunca embutida na query.

```typescript
// compare.service.ts
async function getOffersByProductId(): Promise<OfferWithStore[]>  ← query
function computeRankScore(): number                               ← lógica
function buildSummary(): CompareSummary                           ← lógica
export async function getProductComparisonBySlug()                ← orquestração
```

### 6.5 Escolha do cliente Supabase

| Service | Cliente | Regra |
|---|---|---|
| Services públicos (produto, loja, busca, compare) | `lib/supabase.ts` (anon) | Leitura pública do catálogo |
| `stores-public.service.ts` | `lib/supabase/service.ts` (service role) | Precisa de merchant_score/verified_level em contexto público (ADR-036) |
| Services em Route Handlers admin/merchant | `auth.serviceClient` (service role) | Recebido de `requireAdmin()`/`requireMerchant()` |

`lib/supabase/service.ts` **nunca** é importado por Client Components.

### 6.6 Injeção de serviceClient

Route Handlers não criam o serviceClient manualmente. Recebem de `requireAdmin()` ou `requireMerchant()`, que já validaram a sessão e retornam um cliente pronto:

```typescript
const auth = await requireAdmin();
if (isAuthError(auth)) return auth;
const db = auth.serviceClient;  // ← serviceClient injetado, não criado
```

---

## 7. Convenções de APIs

Ver `docs/architecture/API_CONTRACTS.md` para o contrato completo de cada endpoint.

Regras de implementação (não repetidas lá):

**Route Handlers são orquestradores.** Validam entrada, chamam services ou funções de domínio, retornam resposta. Máximo ~50 linhas. Lógica que exceder esse limite deve ser extraída para service.

**Early return em erro de auth:**

```typescript
const auth = await requireAdmin();
if (isAuthError(auth)) return auth;  // early return — não aninha o resto
```

**Allowlist explícita em PATCH:**

```typescript
const allowed = ["company_name", "contact_phone", "contact_email"];
const update: Record<string, unknown> = {};
for (const key of allowed) {
  if (key in body) update[key] = body[key];
}
```

Nunca `{ ...body }` direto no update — mass assignment prevention.

**Envelope padrão:** `{ data: T }` para sucesso, `{ error: string }` para falha. Nenhum endpoint retorna shape flat sem envelope.

---

## 8. Convenções de Banco de Dados

### 8.1 Nomenclatura de colunas

`snake_case` em todas as colunas. Nunca `camelCase` no banco.

```sql
-- Correto
price_usd, brand_id, created_at, in_stock, product_url

-- Incorreto
priceUsd, brandId, createdAt, inStock, productUrl
```

### 8.2 UUIDs

Gerados pelo Supabase via `gen_random_uuid()`. Nunca gerados no frontend. Tipo `uuid` no PostgreSQL, `string` no TypeScript.

### 8.3 Slugs

Gerados via `utils/slug.ts → slugify()`. Lowercase, kebab-case, sem caracteres especiais. UNIQUE constraint obrigatório por tipo de entidade (ADR-023).

```
"iPhone 17 Pro 256GB" → "iphone-17-pro-256gb"
"Cellshop CDE"        → "cellshop-cde"
```

### 8.4 Timestamps

Colunas de data: `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ`.  
TypeScript: sempre `string` (ISO 8601 UTC). Nunca `Date` object — formatação acontece no frontend.

### 8.5 Soft Delete

Não há soft delete implementado no Release 1.4 — DELETE é físico. Exceção: `stores.active`, `offers.available` são flags de visibilidade, não soft delete formal. Entidades inativas não são deletadas — apenas removidas do catálogo público.

### 8.6 Migrations (Database Migration System V2)

Padrão completo em `docs/engineering/DATABASE_ENGINEERING.md` — resumo aqui:

- **`0001`-`0021`**: `database/migrations/NNNN_descricao_snake_case.sql`, congelado (já aplicado em produção). Não criar novas migrations aqui.
- **`0022`+**: `supabase/migrations/<timestamp>_descricao_snake_case.sql`, criado via `npx supabase migration new <nome>` a partir de `database/templates/MIGRATION_TEMPLATE.sql`, aplicado via `npm run db:push` (Supabase CLI) — nunca mais copiado manualmente para o SQL Editor.
- Sempre idempotentes: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` antes de todo `CREATE POLICY`, `DROP TRIGGER IF EXISTS` antes de todo `CREATE TRIGGER`.
- Nunca contém `SELECT` avulso, health check ou consulta de auditoria — isso vive em `database/verification/` (por migration) ou `database/health_checks/` (sistema, por tópico). Validado automaticamente por `npm run db:lint`.
- Toda migration declara sua classe de rollback (Possible/Partial/Impossible) no cabeçalho — ver `database/templates/ROLLBACK_TEMPLATE.sql`.
- Schema de banco não muda sem aprovação explícita do CTO.

### 8.7 Seeds

Seeds em `database/seed/` têm `dryRun: true` por padrão. Executar sem dry-run é ação explícita que requer confirmação.

### 8.8 Valores monetários

`NUMERIC(10,2)` no banco. `number` no TypeScript. Nunca string. Nunca inteiro em centavos (não é o padrão do projeto — preços são decimais reais).

---

## 9. Convenções de TypeScript

### 9.1 Interface vs. Type

Use `interface` para todos os tipos de domínio que espelham entidades ou contratos de API. Use `type` para unions, aliases e tipos derivados de utilitários:

```typescript
interface Product { ... }                        // entidade — interface
interface ProductWithRelations extends Product   // extensão — interface

type ProductCatalogSort = "price_asc" | "price_desc" | "newest";  // union — type
type CatalogProductRow = ProductWithRelations & { offers: CatalogOfferRow[] };  // intersecção — type
```

### 9.2 Enums

Não use `enum` TypeScript — gera JS em runtime, não é tree-shakeable. Use `as const` ou string union:

```typescript
// Correto
type MerchantStatus = "draft" | "active" | "suspended" | "blocked";

// Evitar
enum MerchantStatus { Draft = "draft", Active = "active" }
```

### 9.3 null vs. undefined

- `null`: valor explicitamente ausente (campo do banco que pode ser NULL, resultado de query sem dados)
- `undefined`: valor não fornecido (prop opcional, argumento não passado)

Services retornam `null`, nunca `undefined`. Props opcionais usam `?` (que implica `undefined`).

```typescript
export async function getProductBySlug(): Promise<Product | null>  // null — service
interface Props { showPrice?: boolean }                             // undefined — prop opcional
```

### 9.4 Type Assertions

Usadas após queries Supabase onde o retorno é `any`:

```typescript
return data as Product[];           ✓  (após verificação de erro)
return data as unknown as Tipo[];   ✓  (quando a forma real é complexa)
return data!;                       ✗  (non-null assertion sem verificação)
```

Nunca use `as any` — se você precisar de `any`, algo está errado no design do tipo.

### 9.5 Generics

Use apenas quando genuinamente necessário — não como padrão de abstração preventiva. Cada generic deve ter um propósito específico.

### 9.6 Async / Promises

Toda função async tem `async` explícito e `await` necessário. Nunca retorna `Promise` sem `async`. Nunca usa `.then()` quando `await` funciona.

```typescript
// Correto
export async function getProducts(): Promise<Product[]> {
  const { data } = await supabase.from("products").select("*");
  return data ?? [];
}

// Evitar
export function getProducts(): Promise<Product[]> {
  return supabase.from("products").select("*").then(({ data }) => data ?? []);
}
```

### 9.7 Imports e Exports

Named exports para services, hooks, utils, types. Default exports apenas para componentes React.

```typescript
// services/product.service.ts
export async function getProducts() { ... }    ✓ (named)
export default function getProducts() { ... }  ✗

// components/product/ProductCard.tsx
export default function ProductCard() { ... }  ✓ (default)
export function ProductCard() { ... }          ✓ (named — aceitável em admin/merchant)
```

### 9.8 Variáveis de Ambiente

Acessadas exclusivamente via `lib/env.ts`. Nenhum outro arquivo usa `process.env` diretamente (ADR-001).

```typescript
// Correto
import { env } from "@/lib/env";
const url = env.NEXT_PUBLIC_SUPABASE_URL;

// Incorreto
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
```

---

## 10. Convenções de Tratamento de Erros

### 10.1 Services — nunca lançam

Services retornam valor seguro em erro, nunca lançam:

```typescript
if (error) {
  console.error(error);
  return [];    // ou null
}
```

Razão: um erro de dados não deve quebrar o render de toda uma página Server Component. O componente trata a ausência de dados, não uma exceção.

### 10.2 Route Handlers — erros são responses

Route Handlers nunca lançam exceção para o chamador. Capturam e retornam `NextResponse.json({ error }, { status })`:

```typescript
try {
  // ...
} catch (err) {
  const message = err instanceof Error ? err.message : "Erro interno";
  console.error("[handler]", message);
  return NextResponse.json({ error: message }, { status: 500 });
}
```

### 10.3 Client Components — error boundaries

Páginas de erro (`error.tsx`) são Client Components que implementam error boundary para a rota. Usam `error.digest` para correlação e oferecem botão de retry via `reset()`.

### 10.4 Mensagens de log

Formato de log para identificação: `[módulo] ação: detalhe`

```typescript
console.error("[stats] score update:", error.message);
console.error("[auth/callback] code exchange failed:", error.message);
console.error("[register] merchant insert failed:", error.message);
```

Nunca logar dados sensíveis (senha, token, service role key).

### 10.5 Fallbacks de UI

Componentes que recebem arrays (listas, grids) renderizam `EmptyState` quando array é vazio — nunca `null` ou fragmento vazio sem explicação visual.

---

## 11. Convenções de Testes

### 11.1 Estado atual

Não há suite de testes configurada no Release 1.4. Validação é feita via:
- `npm run build` — TypeScript compilation + Next.js build
- `npm run lint` — ESLint flat config
- Scripts de validação de seed: `database/seed/validate.js`, `database/seed/validate_adr019.js`

### 11.2 Padrão para quando testes forem introduzidos

**Unit tests**: para funções puras de utils, lógica de ranking, computação de score. Sem Supabase real. Localização: `__tests__/` paralelo ao arquivo testado ou `.test.ts` na mesma pasta.

**Integration tests**: para services que consulta o Supabase. Usar Supabase local ou banco de staging — nunca mock do cliente Supabase (o risco de divergência mock/real é documentado como anti-pattern).

**E2E tests**: para fluxos críticos (busca, comparação, onboarding de merchant). Framework planejado: Playwright.

**Fixtures**: dados de teste em `database/datasets/` (estrutura já existe no Acquisition Engine).

### 11.3 O que nunca testar

Não testar: formatação visual, classes CSS, texto de UI (frágil e sem valor). Testar: lógica de negócio, contratos de API, fluxos críticos.

---

## 12. Convenções de Documentação

### 12.1 Quando atualizar cada documento

| Documento | Atualizar quando |
|---|---|
| `docs/architecture/ARCHITECTURE.md` | Nova pasta, novo padrão arquitetural, novo cliente, nova rota de alto nível |
| `docs/architecture/DOMAIN_MODEL.md` | Nova entidade, novo invariante, novo ciclo de vida, novo relacionamento de negócio |
| `docs/architecture/COMPONENT_INDEX.md` | Novo componente criado, componente removido, mudança de tipo (Server↔Client), novo status |
| `docs/architecture/API_CONTRACTS.md` | Novo endpoint, mudança de formato de response, novo status de endpoint |
| `docs/engineering/CONVENTIONS.md` | Nova convenção aprovada via ADR, convenção existente alterada |
| `docs/operations/DECISIONS.md` | Qualquer decisão arquitetural significativa — crie um novo ADR |
| `docs/operations/CHANGELOG.md` | A cada Release |
| `docs/operations/PROJECT_STATUS.md` | A cada Sprint (progresso real, métricas, próximos passos) |
| `docs/product/FEATURES.md` | Nova feature implementada ou planejada com definição de escopo |

### 12.2 ADRs (Architectural Decision Records)

Crie um ADR quando:
- Uma decisão arquitetural não será óbvia para quem ler o código no futuro
- Uma alternativa foi considerada e descartada
- Uma convenção está sendo introduzida ou modificada
- Uma regra do `AI_CONSTITUTION.md` ou `ENGINEERING_PRINCIPLES.md` está sendo aplicada de forma específica

Formato mínimo de ADR em `docs/operations/DECISIONS.md`:
```
### ADR-0XX: Título

**Status**: Accepted
**Data**: YYYY-MM-DD

**Contexto**: Por que essa decisão foi necessária.
**Decisão**: O que foi decidido.
**Consequências**: O que isso implica — positivo e negativo.
```

### 12.3 Comentários no código

Comentários só quando o WHY não é óbvio pelo código. O WHAT nunca precisa de comentário — nomes descritivos resolvem.

```typescript
// Correto — explica o WHY não-óbvio:
// Ordenação por preço é "best effort" dentro da página — sem view materializada,
// não é possível garantir ordem global entre páginas (ADR-011).

// Incorreto — explica o WHAT que o código já diz:
// Ordena os produtos por preço ascendente
products.sort((a, b) => a.lowestPriceUSD - b.lowestPriceUSD);
```

---

## 13. Convenções de Git

### 13.1 Branches

`main` — branch principal, sempre estável, deployável.  
Feature branches: `feat/descricao-curta` (ex: `feat/merchant-score-gamification`).  
Fix branches: `fix/descricao-curta`.  
Docs branches: `docs/descricao-curta`.

### 13.2 Commits

Formato: `tipo(escopo): descrição em imperativo`

```
feat(merchant): add score gamification with level progression
fix(compare): correct price ranking when offer has no store rating
docs(foundation): update DOMAIN_MODEL.md to Release 1.4
refactor(search): extract batchPriceMetrics from buildCompareResult
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

O commit message descreve o QUE mudou e o POR QUÊ, não o COMO.

### 13.3 Tamanho de commits

Um commit = uma mudança lógica. Não agrupar feature nova com refactor não relacionado. Não dividir uma única mudança lógica em múltiplos commits sem razão.

### 13.4 Pull Requests

Ver `docs/foundation/RELEASE_STRATEGY.md` para o processo completo. Regra mínima: toda PR tem descrição que explica o problema resolvido, não apenas as mudanças feitas. Mudanças de schema de banco exigem aprovação explícita do CTO antes do merge.

### 13.5 Versionamento

Ver `docs/foundation/RELEASE_STRATEGY.md`. O número de Release segue `MAJOR.MINOR.PATCH` com significado de domínio — não apenas semver genérico.

---

## 14. Checklist Pré-Commit

Use antes de cada commit ou PR. Não é uma burocracia — é a garantia de que o projeto permanece saudável.

```
BUILD E QUALIDADE
□ npm run build — sem erros de compilação TypeScript
□ npm run lint  — sem warnings de ESLint

CÓDIGO
□ Seguiu as convenções de nomenclatura desta seção
□ Novos services retornam [] ou null em erro (não lançam exceção)
□ Novos Route Handlers têm early return em erro de auth
□ Client Components têm razão documentada para ser client
□ Nenhuma variável de ambiente acessa process.env diretamente (use lib/env.ts)
□ SUPABASE_SERVICE_ROLE_KEY não aparece em Client Components

DOCUMENTAÇÃO
□ Nova entidade/invariante? → Atualizou docs/architecture/DOMAIN_MODEL.md
□ Novo componente/hook? → Atualizou docs/architecture/COMPONENT_INDEX.md
□ Novo endpoint ou mudança de contrato? → Atualizou docs/architecture/API_CONTRACTS.md
□ Nova arquitetura ou padrão? → Atualizou docs/architecture/ARCHITECTURE.md
□ Decisão arquitetural significativa? → Criou ADR em docs/operations/DECISIONS.md
□ Release completada? → Atualizou docs/operations/CHANGELOG.md e docs/operations/PROJECT_STATUS.md

BANCO DE DADOS
□ Mudança de schema? → Aprovação explícita do CTO
□ Nova migration? → Criada em supabase/migrations/ via template, passou em `npm run db:lint`, tem par em database/verification/
□ Slug novo? → UNIQUE constraint existe na tabela

SEGURANÇA
□ Novos campos sensíveis em PATCH? → Tem allowlist explícita
□ Service role não vazou para Client Component?
□ Dados de produção não foram alterados sem dry-run?
```

---

## 15. Anti-Patterns

Anti-patterns com custo documentado — nunca reproduzir.

| Anti-Pattern | Custo real / Risco | Solução |
|---|---|---|
| **Duplicação de query** | Mudança de schema exige atualização em múltiplos lugares; um fica desatualizado | Uma query por entidade, em um service, reutilizada |
| **Lógica de negócio em componente** | Torna componente não reutilizável; testes de UI dependem de lógica de domínio | Lógica em service ou util; componente recebe resultado via props |
| **Service acoplado a UI** | Service não pode ser reutilizado fora do contexto original | Services não importam nada de `components/` |
| **Imports circulares** | Build quebra silenciosamente ou em runtime | Siga a hierarquia: types → services → hooks → components → app |
| **Queries em Route Handler** | Duplica lógica do service; Query escapa do service layer | Toda query Supabase em service. Route Handler chama service |
| **Página inteiramente Client Component** | Double-fetch, bundle maior, sem SSR | Server Component com `_cache.ts` para dados compartilhados |
| **Hook sem consumidor** | `useProduct`, `useStore`, `useCompare` legados de migração — ruído no projeto | Remover quando confirmado sem uso |
| **process.env direto** | Dificulta mocking, torna dependência de env implícita | Centralizar em `lib/env.ts` (ADR-001) |
| **Comentário que explica o WHAT** | Fica desatualizado quando o código muda; código bem nomeado já diz o quê | Comentar apenas o WHY não-óbvio |
| **Arquivo placeholder vazio sem nota** | Desenvolvedor assume que está implementado (causou incidente em 2026-06-22) | Se vazio é intencional, adicionar comentário `// placeholder — planejado para Release X.Y` |
| **type any** | Derrota o propósito do TypeScript; erros de runtime invisíveis na compilação | Definir o tipo correto ou usar `unknown` com type guard |
| **PR de schema sem aprovação** | Mudança de schema em produção sem dry-run pode ser irreversível | Obrigatório: aprovação do CTO + dry-run documentado antes de aplicar |

---

## 16. Evolução das Convenções

### 16.1 Como uma convenção muda

Nenhuma convenção muda por hábito, preferência individual ou pressão de prazo. O processo é:

1. Identificar o problema que a convenção atual não resolve (ou cria)
2. Propor alternativa com justificativa
3. Criar ADR em `docs/operations/DECISIONS.md`
4. Aprovação do CTO
5. Atualizar este documento
6. Comunicar a mudança para toda a equipe

### 16.2 Convenções aspiracionais

Convenções que ainda não foram aplicadas uniformemente no código existente são marcadas como aspiracionais — não como "o projeto faz X". O projeto só tem a convenção que o código demonstra.

Exemplos de convenções aspiracionais no Release 1.4:
- Validação com Zod em Route Handlers (Planned — Release 1.5)
- Remoção de hooks legados sem consumidor (Planned — Release 1.5)
- Design tokens centralizados em `styles/theme.ts` (Planned — quando o design system evoluir)
- Testes unitários para lógica de ranking e score (Planned — quando test runner for configurado)

### 16.3 Convenções e IA

Sistemas de IA que trabalham neste projeto devem ler `docs/foundation/AI_CONSTITUTION.md` e este documento antes de qualquer tarefa de implementação. As convenções aqui são o padrão de qualidade que a IA deve produzir — não sugestões.

---

*Este documento descreve o que o projeto realmente faz, derivado de leitura de código. Onde uma convenção aspiracional foi registrada, está explicitamente marcada como tal. Quando o código diverge silenciosamente de uma convenção aqui documentada, o código está errado — não a convenção.*
