# HOME 2.0 — FOUNDATION (Sprint 39A)

**Status**: implementado (foundation read-only; UI visualmente intacta)
**Categoria**: `docs/product/`
**Sprint**: 39A — Home 2.0 Foundation (ver `docs/operations/PROJECT_STATUS.md`)

> Registra as **decisões** da base técnica da Home 2.0. Não é manual operacional nem
> cópia do briefing: documenta o que foi decidido, o que já existe no código e o
> que ficou bloqueado por WIP pré-existente.

---

## 1. Direção aprovada (não reabrir)

- **Direction A — Evolution**: evoluir a identidade atual, não substituí-la.
- **Search as the Hero**: a busca é a ação de maior valor e terá protagonismo (39B+).
- **Dados como prova**: nenhum claim sem dado real por trás (Trust Must Be Evidence-Based).

A Home atual está visualmente **congelada** (ADR-050, `docs/design/DESIGN_CONSTITUTION.md`).
A 39A não altera nenhum pixel: prepara camadas (helpers, serviços, políticas) para
as próximas Sprints consumirem.

## 2. Mapa do frontend (relevante para a 39A)

| Camada | Onde | Notas |
|---|---|---|
| Páginas | `app/` | Home = `app/page.tsx` (`revalidate=60`, ISR) |
| Home components | `components/home/*`, `components/home/dashboard/*` | CONGELADOS (ADR-050) |
| Layout | `components/layout/{Navbar,Footer}.tsx` | Navbar/Footer: `"use client"` |
| UI kit | `components/ui/*` | `Button`, `Chip`, `Section`, `SectionSkeleton`, `Badge`, `Logo`, `Container`, `Input`, `EmptyState`, `GradientCard`, `SectionTitle` (todos USED) |
| Dados da Home | `lib/home-premium-service.ts` | ÚNICA fonte de dados da Home/Categorias |
| Services | `services/*.service.ts` | `product`, `offer`, `store`, `search`, `category`, `brand`, `compare`, `merchant`, `stores-public` |
| Hooks | `hooks/use*.ts` | `useSearch`, `useProduct`, `useCompare`, etc. |
| Types | `types/*.ts` | Espelham as tabelas reais (ADR-008) |
| Tokens | `app/globals.css` (`@theme` OKLCH) + `styles/*.ts` + `constants/colors.ts` | 3 fontes sobrepostas (ver §3) |
| Rotas | `constants/routes.ts` (canônico-parcial) + `constants/navigation.ts` (morto) | ver §4 |
| Utils | `utils/*.ts` | `image`, `currency`, `search`, `slug`, `offerPresentation`, `analytics`, `storage` |
| Anomalia | `fronteiraai-web/fronteiraai-web/` | checkout Next.js antigo aninhado com `.git` próprio; **não faz parte do build** — não tocar |

## 3. Token authority target (READY_TO_APPLY — bloqueado por WIP)

TOKEN_MATRIX_FINAL:

| Token | Fonte atual | Duplicado? | Autoridade canônica (alvo) | Ação |
|---|---|---|---|---|
| Paleta de marca (OKLCH) | `app/globals.css` `@theme` (brand-blue/cyan/purple, positive/negative/amber) | — | `app/globals.css` `@theme` | MANTER como autoridade |
| Cores hex (primary/surface/text/...) | `styles/theme.ts`, `constants/colors.ts` | SIM (2 fontes hex + @theme OKLCH) | Depreciar em favor do `@theme` | CONSOLIDAR quando WIP liberar |
| Radius/shadow/spacing/typography | `styles/{radius,shadows,spacing,typography}.ts` | parcial (radius em `styles/radius.ts` vs `styles/theme.ts.radius`) | `styles/*.ts` (manter, deduplicar radius) | CONSOLIDAR quando WIP liberar |
| Glass card | `app/globals.css` `@utility glass-card` | — | `app/globals.css` | MANTER |

**Decisão**: `@theme` do `globals.css` é a autoridade de cores; `styles/*.ts` para o
resto (spacing/radius/shadows/typography), com `styles/theme.ts.radius` e
`constants/colors.ts` marcados para remoção. Nenhuma paleta é trocada.
**WIP_CONFLICT**: `styles/theme.ts`, `constants/colors.ts` têm WIP pré-existente → edição deferida.

## 4. Canonical route plan (READY_TO_APPLY — bloqueado por WIP)

Estado real (auditoria): `constants/routes.ts` já é canônico-parcial (`productPath`,
`searchPath`, `lojaPath`, `productsPath`, `comparePath`, `merchantPassportPath`).
`constants/navigation.ts` é **código morto** com 3 rotas inexistentes.

| Rota | Fonte atual | Alvo | WIP? |
|---|---|---|---|
| `/` | routes.ts + Navbar | routes.ts | não |
| `/product/[slug]` | `productPath` | ok | não |
| `/search?q=` | `searchPath` | ok | não |
| `/lojas` / `/lojas/[slug]` | `lojaPath` (canônica; 308 de `/store/[slug]`) | ok | não |
| `/products` | `productsPath` | ok | não |
| `/compare/[slug]` | `comparePath` | ok | não |
| `/lojistas/[merchantId]` | `merchantPassportPath` | ok (órfã de links — 39B+) | não |
| `/categorias`, `/para-lojistas`, `/termos`, `/privacidade` | hardcoded | adicionar ao routes.ts | parcial |
| `NAVIGATION` (`/stores`, `/compare`, `/favorites`) | `constants/navigation.ts` | CORRIGIR para `/lojas`, `/products`, `/search` ou REMOVER | **SIM** — arquivo em WIP |
| `components/search/SearchResults.tsx:106` `href={/categories/${slug}}` | 404 real | `/categorias` | **não** (arquivo não-WIP) — correção deferida à 39B para não alterar UI |

## 5. Data Quality Model (implementado — `utils/homeDataQuality.ts`)

Produto **Home-ready** = `slug` válido + imagem utilizável + preço válido (>0, finito)
+ oferta disponível (`available=true`, ADR-008; `in_stock=false` continua elegível).

Helpers puros: `hasValidSlug`, `candidateImageUrl`, `hasUsableImage`, `candidatePriceUSD`,
`hasValidPrice`, `hasAvailableOffer`, `isHomeReadyProduct` + adapters tipados
`isCatalogItemHomeReady` (ProductCatalogItem) e `isHighlightHomeReady` (ProductHighlight).
Reutiliza `utils/image.ts` (não duplica política de imagem).

## 6. Image Policy (consolidada)

- **Imagem real**: URL http(s) fora dos hosts de placeholder → exibir.
- **Placeholder de seed** (`placehold.co`): tratado como AUSENTE (`isRealProductImage`).
- **Imagem ausente/quebrada**: `null` — a UI decide o empty state ("Sem imagem");
  nunca quebrar render por falta de imagem.
- **Fallback por storage**: `utils/storage.ts#resolveImageUrl` (produto/loja/marca).

## 7. Freshness Model (implementado — `utils/freshness.ts`)

`dataAgeMs(timestamp, now)` → idade em ms (`null` = sem dado/inválido; futuro = 0).
`classifyFreshness(timestamp, rules?)` → **FRESH** | **AGING** | **STALE** | **UNKNOWN**.
Regras padrão declarativas: FRESH ≤ 6h, AGING ≤ 72h, depois STALE; customizáveis por
chamador. Nenhum comportamento visual no helper.

**Decisão**: não reutilizar `src/domains/realtime-commerce/freshness/FreshnessService.ts`
(domínio de backend para mudanças de mercado, em WIP; acoplar a Home a ele seria
indevido). O helper é puro, determinístico e testável.

## 8. Freshness Policy

- **CATALOG**: pode ser exibido mesmo sem frescor recente, com transparência quando necessário.
- **PRICE HISTORY**: exige data real de atualização; nunca "ao vivo" sem timestamp.
- **MARKET DATA**: se STALE/UNKNOWN, nunca chamar de realtime/live.
- **EXCHANGE**: sem dado → ocultar (nunca fabricar taxa).
- **TRUST**: nunca inventar frescor de verificação.

## 9. Trust Policy (baseada na auditoria de claims)

- Permitido: loja verificada (`is_verified`/`verified_level` reais), rating real,
  contagem real de ofertas, histórico de preços, Merchant Score real, "Atualizado em DD/MM"
  com timestamp real.
- **Proibido**: "tempo real"/"ao vivo" sem dado fresco; "100% seguro"; "compra protegida"
  sem mecanismo real; "melhor preço garantido"; urgência artificial; ratings/reviews/selos
  inventados.
- Claims UNSUPPORTED encontrados (auditoria completa em sessão): `BottomCta.tsx` ("100% Seguro"),
  `Benefits.tsx` ("Compra protegida", "Lojas verificadas — Avaliadas antes..."), `ForLojistasSection.tsx`
  ("tempo real"), `app/para-lojistas` ("SLA garantido", "instantânea"),
  `app/lojistas/[merchantId]` ("Avaliações verificadas de compradores reais" — toda review nasce
  `is_verified_purchase=false`). **Correção registrada para 39B/39E** — não executada na 39A
  (arquivos em WIP ou UI congelada).
- View-model implementado: `utils/storeTrust.ts` (`buildStoreTrustView`) — rótulos apenas com
  evidência; nunca deriva "seguro/protegido/garantido" de rating/score.

## 10. Home Service Matrix

| Método | Fonte de dados | Seção da Home | Freshness | Qualidade | Erros | Veredito |
|---|---|---|---|---|---|---|
| `getHomeStats` | MarketplaceOperations.snapshot | HeroStats | snapshot | counts reais | throw p/ caller | KEEP |
| `getMarketPulseHighlights` | RealtimeCommerce (janela 7d + hoje) | MarketPulseCard | janelas reais | ok | console.error | KEEP (badge "Em tempo real" CONDITIONAL) |
| `getBestSavingsToday` / `getFlashOffers` | OpportunityEngine | AchadoDoDia / Economia do dia | top-1 / top-6 | ok | ok | KEEP |
| `getExchangeSnapshot` | Exchange domain (7d) | CambioCard | capturedAt real | fallback honesto | ok | KEEP (rótulo "ao vivo" CONDITIONAL) |
| `getLiveMarketplaceFeed` | MarketPulse (24h) | LiveMarketplaceCard | 24h | ok | ok | KEEP (badge "Ao vivo" CONDITIONAL) |
| `getFeaturedStores` | MarketplaceOperations.priority + ConnectorDirectory | StoreCarousel | lastSyncAt real | ok | ok | KEEP |
| `getTopCategories` / `getAllCategoriesWithCounts` | MarketplaceCoverage + offers | CategoriesCard | contagens reais | sem N+1 (1 grouped read) | ok | KEEP — base da Category Foundation |
| `getPopularSearchSuggestions` (NOVO) | `buyer_events` SearchPerformed (service-role, read-only) | futura (39B) | eventos reais | dedupe/sanitize/limite | `[]` em erro | NOVO — Search Foundation |

Padrões: sem waterfall crítico (Promise.all nos pontos de fan-out), sem service-role
desnecessário (só `stores-public` e o novo `search-suggestions`), transformações na UI
mínimas (dados chegam display-ready).

## 11. Foundations prontas

- **Home-ready data**: `utils/homeDataQuality.ts` (§5).
- **Search**: `services/search-suggestions.service.ts` + `utils/searchSuggestions.ts`
  (read-only; sem PII — só `search_query` é selecionado; sem buyer identity; fallback `[]`;
  cache fica a cargo da página consumidora na 39B). O `SearchBar` atual usa sugestões
  **hardcoded** — a troca pela fonte real é da 39B (UI congelada nesta Sprint).
- **Category**: já existia — `lib/home-premium-service.ts` (`CategoryWithCount`:
  name/slug/productCount/offerCount + ordenação por count, sem N+1). Documentado, sem código novo.
- **Store trust**: `utils/storeTrust.ts` (§9) + base real em `stores-public.service.ts`
  (merchantScore, verifiedLevel, offerCount, isUnclaimed).
- **Image**: §6.

## 12. Component contracts (conceituais — sem interfaces sem consumidor)

| Componente (39B+) | Contrato mínimo |
|---|---|
| `HomeHero` | headline + subcopy + trust cue discreto (lojas verificadas/produtos/histórico) |
| `HomeSearchBar` | campo + submit (`searchPath`) + sugestões reais (`getPopularSearchSuggestions`) |
| `CategoryGrid` | `CategoryWithCount[]` (name/slug/count) + link `/categorias` |
| `SavingsSection` | `SavingsHighlight[]` (preço/savings já apresentados — MoneyPresentation) |
| `FeaturedProducts` | `ProductCatalogItem[]` filtrados por `isCatalogItemHomeReady` |
| `StoreTrustStrip` | `StoreTrustView[]` (nunca inventar trust) |
| `PriceInsightBadge` | preço vs mediana/histórico reais; null quando sem dado |
| `TrustMicrocopy` | texto curto com evidência (timestamp real) ou nada |

## 13. Accessibility (regras da 39A)

- `focus-visible` em todo elemento interativo (já presente no SearchBar/Button).
- Teclado: navegação nativa (links/inputs/buttons), sem hover-only.
- Tap targets ≥ 44px (mobile primário).
- `prefers-reduced-motion` já global em `app/globals.css`.
- Headings semânticos; `aria-label` em inputs sem label visível (SearchBar já tem).
- Correções que exijam WIP/UI congelada → DEFER.

## 14. Performance baseline (ANTES)

- Build: ✅ passa (working tree com WIP pré-existente).
- `revalidate = 60` (ISR) na Home.
- Fontes: Geist (layout) + Sora/Inter (Home, escopadas ao `<main>`).
- Client components na Home: `Navbar`, `SearchBar`, `HeroCTAs` (3).
- Hero image: `public/hero-bridge.png` = **1,87 MB** (meta 39A é ≤ 1 MB — otimização na 39G).
- Medição exata de LCP/INP/CLS e KB de JS → 39G (Lighthouse; ferramenta de browser).

## 15. Quality gates (39A)

- Tests: 40/40 (4 suites novas, determinísticas, sem rede/banco).
- ESLint: limpo nos arquivos da 39A.
- `tsc --noEmit`: ✅.
- Build: ✅ (pré e pós arquivos novos).
- `git diff --check` e secret scan: executados no diff final (§18).
- **NO DATABASE / NO MIGRATION / NO INFRA / NO ENV CHANGE**.

## 16. WIP_CONFLICTS registrados

| File | Mudança necessária | Por quê | Risco | Próxima ação |
|---|---|---|---|---|
| `constants/navigation.ts` | remover `/stores`,`/compare`,`/favorites` ou apontar para rotas reais | 3 links mortos; arquivo sem importadores | baixo (código morto) | resolução de WIP → depois 39B |
| `constants/colors.ts`, `styles/theme.ts` | deprecar em favor do `@theme` | token authority dupla | baixo se feito com grep de uso | resolução de WIP |
| `components/search/SearchResults.tsx:106` | `/categories/${slug}` → `/categorias` | link 404 real | baixo | 39B (mexe em UI de busca) |
| `app/page.tsx` + `components/home/*` | claims UNSUPPORTED + sugestões reais | trust policy §9 | UI congelada | 39B/39E com autorização |

## 17. Arquivos da 39A (ownership)

Criados nesta Sprint (nenhum arquivo WIP tocado):

- `utils/freshness.ts` + `utils/__tests__/freshness.test.ts`
- `utils/homeDataQuality.ts` + `utils/__tests__/homeDataQuality.test.ts`
- `utils/storeTrust.ts` + `utils/__tests__/storeTrust.test.ts`
- `utils/searchSuggestions.ts` + `utils/__tests__/searchSuggestions.test.ts`
- `services/search-suggestions.service.ts`
- `docs/product/HOME_2_0_FOUNDATION.md` (este documento)
