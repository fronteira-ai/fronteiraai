# BUYER_INTELLIGENCE_LAYER.md
# PROGRAM Π (PI) — MISSION Π-1 — Objetivo 6: Arquitetura de Reutilização

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: proposta arquitetural apenas — nenhum código escrito, nenhuma pasta criada, nenhum domínio alterado.
**Restrição central, repetida deliberadamente**: esta camada **nunca calcula nada novo**. Toda linha de inteligência que ela expõe já é produzida, hoje, por um serviço existente (`BUYER_INTELLIGENCE_MAP.md`). O único trabalho novo é composição (chamar vários serviços já prontos) e formatação (transformar o retorno de cada um em algo que uma tela de comprador consegue renderizar).

---

## 1. O precedente arquitetural já existe neste projeto — esta camada não inventa um padrão

Três domínios já resolveram exatamente este problema (agregar N serviços de domínios diferentes em uma única resposta de tela) para o lado admin/lojista:

- `ExchangeDashboardService` (`exchange/dashboard/`) — agrega `ExchangeRateService`, `ExchangeProviderHealthService`, `ExchangeHistoryService`, `ExchangeAnalyticsService` para `/admin/exchange`.
- `RealtimeCommerceDashboardService` (`realtime-commerce/dashboard/`) — mesma ideia para o painel de tempo real.
- `MarketplaceOperationsDashboardService` (`marketplace-operations/dashboard/`) — mesma ideia para operações de marketplace.

Todos os três seguem o mesmo idioma, já documentado no código: **`Promise.allSettled` + isolamento por índice** — se uma sub-consulta falhar, o restante da tela continua funcionando, e o erro fica registrado por chave (`errors: Partial<Record<Key, string>>`), nunca derruba a resposta inteira. A **Buyer Intelligence Layer é o mesmo padrão, aplicado ao lado comprador pela primeira vez** — não uma arquitetura nova, uma aplicação do padrão já provado a um público que ainda não o tinha.

## 2. Estrutura proposta (conceitual)

```
src/domains/buyer-intelligence/          (NOVO — mas composição pura, sem domínio próprio de dado)
  services/
    ProductIntelligenceComposer.ts       — para a tela de produto
    ComparisonIntelligenceComposer.ts    — para a tela de comparação
    HomeIntelligenceComposer.ts          — para a Home
    SearchIntelligenceComposer.ts        — para busca/catálogo (cards compactos)
  types/
    buyer-intelligence.types.ts          — formas de retorno por tela (DTOs de composição, não novos conceitos de domínio)
```

**Por que um domínio novo, mesmo sendo só composição**: mesma razão pela qual `exchange/dashboard/`, `realtime-commerce/dashboard/` e `marketplace-operations/dashboard/` vivem dentro do próprio domínio que agregam — mas aqui não há um "domínio comprador" de dado (a Mission Λ-1 já documentou que a identidade de comprador nem existe ainda). Um domínio de composição pura, sem `repositories/`, sem `infrastructure/`, sem `domain/` (nenhuma entidade própria) — só `services/` que chamam outros domínios — é a forma mais simples que ainda respeita a convenção DDD já estabelecida (nunca um Route Handler compondo 6 serviços de domínios diferentes inline).

**Regra de dependência (mesma já aplicada em `product-identity/` → `canonical-catalog/`, Mission anterior)**: `buyer-intelligence/` pode importar de qualquer domínio (`canonical-catalog`, `market-insights`, `realtime-commerce`, `exchange`, `trust`, `catalog-intelligence`) — nenhum desses domínios jamais importa de volta `buyer-intelligence/`. É uma camada estritamente de composição, no topo, nunca no meio.

## 3. Os 4 composers propostos, e o que cada um agrega

### `ProductIntelligenceComposer` (página de produto)

Agrega: `CompareFoundationService` (ofertas ranqueadas + preço) + `PriceIntelligenceService` (Preço Justo) + `VolatilityRollupService` + `CanonicalPriceHistoryService` (Vale Comprar Hoje / Histórico) + `TrustSignalService`/`BadgeService` por loja das ofertas retornadas (Maior Confiança) + `FreshnessEngine` (frescor por oferta).
**Saída**: um DTO único `ProductIntelligenceBundle` — pronto para os cards 1, 2, 4, 6, 7, 8, 9 de `INTELLIGENCE_CARD_LIBRARY.md`.

### `ComparisonIntelligenceComposer` (tela de comparação, `/compare/[slug]`)

Mesma base do `ProductIntelligenceComposer`, mas focado em `OfferRankingService.rank()` como o elemento central (Loja Recomendada) + `SavingsOpportunity` (Economia) lado a lado.

### `HomeIntelligenceComposer` (Home)

Agrega: `MarketPulseInsightsService` (`CanonicalMarketMover` — Melhor Oportunidade/Vale Comprar Hoje) + `LiveActivityFeedService` (prova de atividade) + `ExchangeAnalyticsService.computeBuyerSavings` (economia agregada, prova social).

### `SearchIntelligenceComposer` (busca e catálogo)

Versão "leve" do `ProductIntelligenceComposer` — só os selos compactos (Preço Abaixo da Média, Preço em Queda) que cabem num card de grid, sem o detalhamento completo da página de produto. Fecha, de caminho, a lacuna já registrada em `BUYER_JOURNEY.md`/`FEATURES.md` de busca não mostrar preço.

## 4. O que esta camada explicitamente NÃO faz

- **Não recalcula nada.** Nenhum composer contém uma fórmula, um peso, um threshold novo — cada composer só chama métodos que já existem e formata o resultado.
- **Não persiste nada novo.** Nenhuma tabela nova, nenhuma migration — os composers são funções de leitura, compostas em memória por requisição (mesmo padrão dos 3 dashboards precedentes, nenhum dos quais introduziu uma tabela de agregação nova — ADR-034, "compute-on-read" quando o volume permite).
- **Não decide o que é "equivalente" ou "alternativa".** Os cards 10 e 11 (`INTELLIGENCE_CARD_LIBRARY.md` §10-11) são deliberadamente deixados fora desta camada — incluí-los exigiria uma fonte de dado que não existe, o que quebraria a garantia central desta arquitetura (zero inteligência nova).
- **Não decide UI.** Esta é uma camada de dado composto, não de componente visual — nenhuma decisão de layout, cor ou copy pertence aqui (fica para uma Wave de implementação futura, fora do escopo desta Mission).

## 5. Onde isso se encaixa no fluxo de dados já documentado (`ARCHITECTURE.md`)

```
Page (Server Component)
   │
   ├─ já hoje: service (lib/supabase.ts) → catálogo básico
   │
   └─ NOVO (proposto): buyer-intelligence/services/*Composer
          │
          ├─ canonical-catalog (CompareFoundationService, OfferRankingService, CanonicalPriceHistoryService)
          ├─ market-insights (PriceIntelligenceService, MarketPulseInsightsService, VolatilityRollupService)
          ├─ realtime-commerce (FreshnessEngine, LiveActivityFeedService)
          ├─ exchange (ExchangeAnalyticsService, ConvertedPrice)
          └─ trust (TrustSignalService, BadgeService)
```

Mesmo padrão `React.cache()`/`_cache.ts` já usado por produto/loja (ADR-021) se aplicaria aqui sem modificação — os composers são só mais uma função cacheável por render, não uma mudança de padrão de fetch.

## 6. Risco a nomear (não descoberto por esta Mission, mas relevante para quem for implementar)

Qualquer composer que precise de `isVerifiedStore` por oferta (`OfferRankingService`) ou de badges (`TrustSignalService`) fará N consultas por loja distinta na lista de ofertas — para um produto com 5-10 ofertas isso é barato; a arquitetura deveria considerar um batch-by-store-ids desde o desenho da Wave de implementação, não descobrir isso depois em produção. Registrado aqui como nota de atenção, não como um problema resolvido por esta Mission (que é estratégia, não implementação).

Ver `BUYER_EXPERIENCE_PRIORITIES.md` e `QUICK_WINS_RELEASE2.md` para que composer/card construir primeiro.
