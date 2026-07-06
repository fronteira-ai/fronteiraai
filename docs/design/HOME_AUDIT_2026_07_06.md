# HOME_AUDIT_2026_07_06.md — Audit of the frozen Home vs. ParaguAI architecture

**Data**: 2026-07-06
**Status**: DRAFT — aguardando aprovação do CTO antes de qualquer implementação
**Escopo**: `app/page.tsx`, `app/categorias/page.tsx`, `lib/home-premium-service.ts`, todo `components/home/**` (a Home v0 já congelada por `docs/design/DESIGN_CONSTITUTION.md`)
**Regra**: este documento não propõe nenhuma mudança visual. Toda ação recomendada abaixo preserva pixel-a-pixel o DOM renderizado.

---

## 1. Cada componente consome o domínio/service correto?

| Bloco | Serviço esperado (`PREMIUM_HOME_EXPERIENCE.md`) | Serviço real | Veredito |
|---|---|---|---|
| Hero (estatísticas) | `MarketplaceMetricsService` | `getHomeStats()` → `lib/home-premium-service.ts:31-40` | OK |
| Produtos Mais Buscados (`Offers.tsx`) | `services/product.service.ts` | `getProductsCatalog()`, chamado **diretamente pelo componente**, não via `home-premium-service.ts` | Ver §3 — o próprio doc já documentava essa exceção, mas contradiz a alegação "única camada de leitura" |
| Economia do Dia / Ofertas Relâmpago | `PriceIntelligenceService.getSavingsOpportunity` (market-insights) | `getBestSavingsToday()`/`getFlashOffers()` → `rankSavingsAcrossCatalog()`, usa `createMarketInsightsServices` | OK |
| Market Pulse | `MarketPulseService` (realtime-commerce) | `getMarketPulseHighlights()`, usa `createRealtimeCommerceServices`, `getTopMovers`/`computeForRange` | OK |
| Marketplace em Tempo Real | mesma fonte do Market Pulse | `getLiveMarketplaceFeed()`, mesma `MarketPulseService` | OK |
| Câmbio ao Vivo | `ExchangeRateService`/`ExchangeHistoryService` | `getExchangeSnapshot()`, usa domínio `exchange` | OK |
| Lojas em Destaque | `MerchantPriorityService` + `ConnectorDirectoryService` | `getFeaturedStores()`, usa `MerchantPriorityService` (marketplace-operations) | OK, mas ver §2 (fetch duplicado) |
| Categorias (Home + `/categorias`) | `MarketplaceCoverageService.compute()` | `getTopCategories()`/`getAllCategoriesWithCounts()` | OK |
| Câmeras ao Vivo | — (placeholder deliberado) | Hardcoded `PLANNED_LOCATIONS`, sem integração | OK — conforme mandato original |
| Brands (`app/page.tsx`) | não documentado explicitamente | `getBrands()` chamado **diretamente na page**, bypassa `home-premium-service.ts` | Ver §3 |
| HeroCTAs (estado de auth) | — | Chama `supabase.auth.getSession()` + query direta em `merchants` no client | Ver §4 — violação |

**Domínios estratégicos nomeados no mandato — status de consumo real:**

| Domínio | Consumido pela Home? | Onde |
|---|---|---|
| Market Intelligence (`market-insights`) | **Sim** | `home-premium-service.ts:5,13,185` (`createMarketInsightsServices`, `SavingsOpportunity`) |
| Exchange | **Sim** | `getExchangeSnapshot()` |
| Canonical Catalog | **Sim** | `home-premium-service.ts:6,12,185` (`createCanonicalCatalogServices`, `catalogRepo.findAll`) |
| Marketplace Operations | **Sim** | `getFeaturedStores()` via `MerchantPriorityService` |
| Merchant Platform (`src/domains/merchant-intelligence`, Release 1.6 Command Center) | **Não** — zero import em `home-premium-service.ts` ou qualquer `components/home/**` | — |
| Brain (`src/domains/trust/brain/*`) | **Não** — única ocorrência da palavra "Brain" em `components/home/` é o ícone `lucide-react` `Brain` em `Benefits.tsx:1,8`, não o domínio real | — |

Os dois primeiros gaps (Merchant Platform, Brain) não são bugs desta Wave — o mandato original da Premium Home (`PREMIUM_HOME_EXPERIENCE.md`) nunca pediu essa integração. Mas ficam registrados aqui porque o mandato desta auditoria pediu verificação explícita.

---

## 2. Lógica de negócio duplicada

- **`timeAgo()` reimplementado 4 vezes**, sem util compartilhado (`utils/format.ts` existe mas está vazio):
  - `components/store/StoreCard.tsx:24-28` (pré-existente)
  - `components/home/dashboard/CambioCard.tsx:7-11` (nova nesta Wave)
  - `components/home/dashboard/LiveMarketplaceCard.tsx:6-10` (nova nesta Wave)
  - `components/admin/realtime-commerce/widgets/LiveActivityFeed.tsx:3-9` (pré-existente, thresholds diferentes)

- **Formatação de moeda manual em vez de `utils/currency.ts` (`formatUSD`/`formatBRL`)**:
  - `components/home/EconomiaDoDia.tsx:31-32` — `` `US$ ${best.oldPriceUSD.toFixed(2)}` ``
  - `components/home/dashboard/FlashOffersCard.tsx:37,39,40`
  - `components/home/dashboard/CambioCard.tsx:30` — `` `R$ ${usdBrl.rate.toFixed(2)}` ``
  - `components/home/dashboard/LiveMarketplaceCard.tsx:36` — `newPriceUSD` já vem como `string | null` pré-formatado do service (`home-premium-service.ts:287`), inconsistente

- **Fallback de ícone de categoria (`"🛍️"`) duplicado**: `CategoriesCard.tsx:26` e `app/categorias/page.tsx:131`, cada um com sua própria expressão `category.icon ?? "🛍️"`.

- **Fetch duplicado da mesma loja**: `getFeaturedStores()` (`home-premium-service.ts:333-353`) já chama `getStoreBySlug()` por loja para montar `FeaturedStoreHighlight`. `StoreCarousel.tsx:16-21` chama `getStoreBySlug()` **de novo**, por loja, só para pegar `rating` — a mesma linha de `stores` buscada duas vezes por request.

- **Contagem de ofertas em N+1 quando o domínio já calcula o mesmo número em memória**: `getFeaturedStores()` roda uma query `count: exact` por loja (`home-premium-service.ts:336-339`, dentro de `Promise.all` sobre 6 lojas). `MerchantPriorityService.listAll()` já computa `storeOffers.length` por loja durante o scoring (`src/domains/marketplace-operations/services/MerchantPriorityService.ts:56-61,68,77-79`), mas `MerchantPriorityScore`/`PriorityFactorBreakdown` nunca expõe esse número — a facade reconsulta do zero em vez do tipo ser estendido.

- **Re-export morto**: `home-premium-service.ts:8,422` importa e reexporta `Currency` de `@/src/domains/exchange`, mas nenhum arquivo em `components/home/**` o importa.

- **Props sempre `undefined` sendo passadas**: `Offers.tsx:16-23,41-42` passa `subtitle={product.storeName}` e `originalPriceUSD={product.originalPriceUSD}` para `ProductCard`, mas `getProductsCatalog()` nunca popula esses campos — plumbing morto.

- **Skeleton duplicado**: `DashboardStrip.tsx:9-11` define um `CardSkeleton` local com as mesmas classes (`animate-pulse rounded-3xl border ... bg-slate-900/40`) já existentes em `components/ui/SectionSkeleton.tsx:9-20`.

---

## 3. Componentes de UI duplicados

- **`components/ui/CategoryCard.tsx` existe e nunca é usado.** Tanto `CategoriesCard.tsx:20-29` quanto `app/categorias/page.tsx:126-144` reimplementam markup quase idêntico (ícone + nome + contagem) na mão. `CategoryCard.tsx:12-17` exige `icon: string` sem fallback opcional — precisaria de um ajuste aditivo (prop opcional com fallback) antes de virar reutilizável, o que é uma tarefa de integração, não de redesign (o resultado visual já é o mesmo).

- **`components/store/StoreCard.tsx` existe, ganhou props novas nesta própria Wave (`qualityScore`, `lastSyncAt`, `StoreCard.tsx:16-22`) especificamente para o caso de uso da Home — e não é usado pela Home.** `StoreCarousel.tsx:26-48` reimplementa seu próprio card menor (nome, estrelas, contagem de ofertas, sem imagem). Consequência: `qualityScore`/`lastSyncAt` são calculados em `getFeaturedStores()` mas renderizados em lugar nenhum (confirmado: zero ocorrências de `qualityScore|lastSyncAt` em `components/home/`).

---

## 4. Chamadas diretas a Supabase/banco dentro de componentes de UI

- **Violação confirmada — `components/home/HeroCTAs.tsx`** (`"use client"`, linha 1): dentro de um `useEffect` (linhas 16-27), chama `supabase.auth.getSession()` e depois uma query direta `.from("merchants").select("id").eq("user_id", ...)`. Isso é client-side data fetching direto ao banco, contradizendo a própria alegação do doc de arquitetura (`PREMIUM_HOME_EXPERIENCE.md:73`: "nenhum client-side data fetching foi introduzido"). Também duplica, de forma independente, a checagem "este usuário é merchant?" que `lib/merchant-auth.ts`'s `requireMerchant()` (linhas 25-51) já encapsula no servidor — uma terceira reimplementação da mesma lógica, sem nenhum reaproveitamento entre as três.
  - Nota de proveniência: o próprio doc da Wave anterior já registrava `HeroCTAs` como "reaproveitado sem alteração" — ou seja, é dívida pré-existente que a Wave carregou para dentro da superfície agora congelada, não algo introduzido por ela.

- **Todo o restante da Home é Server Component correto** — nenhum outro arquivo em `components/home/**` importa `@supabase/supabase-js` ou chama `.from(...)` fora de `lib/home-premium-service.ts`.

- **Inconsistência de identidade de client dentro da própria facade**: toda função de `home-premium-service.ts` recebe um `client: SupabaseClient` que os Server Components sempre passam como `getSupabaseServiceClient()` (service-role, ignora RLS). Mas `getStoreBySlug()` (chamada de dentro da facade e também direto por `StoreCarousel.tsx:18`), `getCategories()` e `getBrands()` são importadas de `services/store.service.ts`/`category.service.ts`/`brand.service.ts`, que usam o singleton de `lib/supabase.ts` (anon key) — **ignorando o parâmetro `client` que todo o resto da facade usa**. Não é um bug de segurança (anon key é sempre mais restritivo), mas é uma inconsistência de contrato: a facade parece ter "um client", mas na prática mistura dois.

---

## 5. Conformidade com a Design Constitution / Design Freeze

Nenhuma violação visual encontrada. Toda a auditoria acima é sobre camada de dados/arquitetura, não sobre pixel. Todas as correções recomendadas neste relatório são, por natureza, invisíveis ao usuário (mesmo DOM, mesmo CSS, mesma marcação renderizada) — nenhuma delas requer versionar `DESIGN_CONSTITUTION.md` nem aprovação de exceção visual.

Único ponto de atenção: adotar `components/ui/CategoryCard.tsx`/`components/store/StoreCard.tsx` em vez das reimplementações exige confirmar que o markup gerado é **pixel-idêntico** ao atual antes de trocar — se não for, a troca fica fora de escopo até nova aprovação (ver Design Constitution §5, caminho de exceção).

---

## 6. Domínios estratégicos — consumo via camada de serviço própria

Confirmado (ver tabela da §1): Market Intelligence, Exchange, Canonical Catalog e Marketplace Operations são todos consumidos através de suas próprias factories/services (`createMarketInsightsServices`, `createRealtimeCommerceServices`, `createCanonicalCatalogServices`, `MerchantPriorityService`), nunca via query direta ao domínio de outra forma. Merchant Platform (`merchant-intelligence`) e Brain (`src/domains/trust/brain/*`) não são consumidos — gap de escopo, não de arquitetura (quando/se decidido integrá-los, o caminho correto já existe: uma nova função em `home-premium-service.ts` chamando a factory do domínio, mesmo padrão dos demais).

---

## 7. `HomeService` como camada de orquestração

Não existe uma classe/arquivo chamado `HomeService`. O papel de orquestração é cumprido por `lib/home-premium-service.ts` (facade funcional, não uma classe) — que na prática **não é a única porta de entrada**: `Offers.tsx` (via `getProductsCatalog()`) e `app/page.tsx` (via `getBrands()`) leem serviços de domínio diretamente, contornando a facade (§1, §3 da tabela). Isso não é um erro automático — o próprio doc de arquitetura já registrou essas duas exceções deliberadamente — mas deixa a alegação "única camada de leitura" tecnicamente falsa. Recomendação a considerar no plano: ou (a) mover essas duas chamadas para dentro de `home-premium-service.ts` por consistência, ou (b) corrigir a documentação para não afirmar exclusividade que não existe. Nenhuma das duas opções muda o pixel renderizado.

---

## 8. Valores hardcoded que deveriam vir da plataforma

- `components/home/LiveCameras.tsx:35-36` — `PLANNED_LOCATIONS` hardcoded. **Não é dívida** — é o estado documentado e deliberado ("arquitetura preparada, zero integração, conforme mandato"). Mantido como está até haver uma fonte real de câmeras.
- Nenhum outro valor hardcoded foi encontrado substituindo dado real — os antigos números fictícios do Hero (500.000/350/2.000.000) já foram removidos na Wave anterior e substituídos por `MarketplaceMetricsService.snapshot()`.
- O fallback de ícone `"🛍️"` (§2) é um valor fixo aceitável (fallback de apresentação, não dado de negócio) — não precisa vir da plataforma, mas deveria ser centralizado em vez de duplicado.

---

## 9. Plano de integração proposto (aguardando aprovação — nenhuma linha de código alterada ainda)

Todos os itens abaixo preservam o DOM/pixel renderizado — nenhum requer exceção à Design Constitution.

**Prioridade alta (bugs reais/inconsistência de dado):**
1. Corrigir `Offers.tsx:41-42` — remover ou popular de fato `subtitle`/`originalPriceUSD` (hoje sempre `undefined`).
2. Remover o fetch duplicado em `StoreCarousel.tsx:16-21` — mover `rating` para dentro de `FeaturedStoreHighlight` (`getFeaturedStores()`), eliminando a segunda chamada a `getStoreBySlug()`.
3. Resolver a inconsistência de client (§4) — decidir explicitamente se `getStoreBySlug`/`getCategories`/`getBrands` devem aceitar o `client` injetado como o resto da facade, ou documentar por que não precisam.

**Prioridade média (duplicação a consolidar):**
4. Centralizar `timeAgo()` em `utils/format.ts` (hoje vazio) e migrar as 4 implementações.
5. Migrar toda formatação de moeda inline para `formatUSD`/`formatBRL` (`EconomiaDoDia`, `FlashOffersCard`, `CambioCard`, `LiveMarketplaceCard`).
6. Adotar `components/ui/CategoryCard.tsx` em `CategoriesCard.tsx` e `app/categorias/page.tsx` — após confirmar paridade visual pixel-a-pixel; adicionar fallback de ícone opcional ao componente.
7. Avaliar adotar `components/store/StoreCard.tsx` em `StoreCarousel.tsx` para aproveitar `qualityScore`/`lastSyncAt` já computados — só se o resultado visual (tamanho/formato do carrossel) puder ser preservado exatamente; caso contrário, fica fora de escopo (exigiria exceção de Design Freeze).
8. Estender `PriorityFactorBreakdown`/`MerchantPriorityScore` para expor a contagem de ofertas já calculada em memória, eliminando a query N+1 em `getFeaturedStores()`.
9. Remover o re-export morto de `Currency` (`home-premium-service.ts:8,422`) se de fato não tiver uso planejado.
10. Reusar `components/ui/SectionSkeleton.tsx` em vez do `CardSkeleton` local de `DashboardStrip.tsx`.

**Prioridade mais baixa / decisão de arquitetura, não só de código:**
11. Mover `HeroCTAs.tsx` para usar uma verificação de merchant server-side (props vindas do Server Component pai) em vez de `useEffect` + Supabase direto no client — elimina a 3ª reimplementação da checagem de merchant. Requer decidir o padrão (prop drilling vs. um hook server-safe).
12. Decidir se `getProductsCatalog()` (`Offers.tsx`) e `getBrands()` (`app/page.tsx`) devem migrar para dentro de `home-premium-service.ts` por consistência de "única camada de leitura", ou se a documentação deve simplesmente parar de alegar exclusividade.
13. Mover as 3 queries brutas hoje dentro de `home-premium-service.ts` (linhas 216-218, 336-339, 375-386) para métodos de domínio (`marketplace-operations`/`CatalogMetrics.ts`) em vez de SQL ad hoc na facade.
14. Decisão de escopo, não de bug: integrar Merchant Platform (`merchant-intelligence`) e/ou Brain (`trust/brain`) à Home é uma expansão de mandato — não estava no brief original da Premium Home Experience. Requer decisão explícita do CTO sobre se/quando isso é desejado, e qual bloco novo (se algum) exibiria esse dado.

**Nada dos itens 1-13 requer aprovação de exceção visual.** O item 14 é uma decisão de escopo de produto, não uma correção técnica.
