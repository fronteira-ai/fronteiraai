# MARKET_INTELLIGENCE_ENGINE.md
# Market Intelligence Engine — Núcleo (Wave 1)

**Versão**: 1.0
**Criado**: 2026-07-04 (Release 1.8 — Program C — Market Intelligence Engine, Wave 1)
**Status**: Registro da auditoria + o que foi de fato construído
**Categoria**: `docs/engineering/`

---

## 0. Por que a auditoria vem antes de qualquer código

O mandato foi explícito: "sempre auditar antes de implementar... nunca duplicar domínios... nunca criar serviços redundantes." Uma leitura completa dos domínios existentes (`canonical-catalog`, `realtime-commerce`, `exchange`, `marketplace-operations`, `catalog-intelligence`, e os serviços de Certification/Observability recém-criados no Connector Platform) encontrou **sobreposição real e significativa** com quase todos os 10 objetivos do brief. Esta seção é o registro dessa auditoria — cada objetivo abaixo recebe um veredito explícito, não uma lista de features construídas sem contexto.

---

## 1. Domínio criado

`src/domains/market-insights/` — auditado contra `docs/architecture/DOMAIN_MODEL.md` primeiro: não existe domínio equivalente (a seção conceitual mais próxima é "2.3 Price Engine", que descreve exatamente este propósito — "transformar preço pontual em ativo estratégico" — mas nunca foi implementada como domínio real; `canonical-catalog` cobriu parte dela na Release 1.7). `market-insights/` é um domínio de **fundação** como `canonical-catalog`/`exchange`/`realtime-commerce`: depende deles livremente (nenhum dos três depende de volta), nunca depende de `connectors/`, `marketplace-operations/` ou `catalog-intelligence/`. Zero lógica de importação — nenhum parser, nenhum fetch, nenhuma escrita em `offers`/`products`.

**Zero tabela nova.** Todo serviço é compute-on-read sobre dado já existente (`offers`, `price_history` via `canonical-catalog`, `market_changes` via `realtime-commerce`) — consistente com o mandato Objetivo 10 (Performance) e com a disciplina já estabelecida por `MerchantPriorityService`/`VolatilityService`.

---

## 2. Serviços implementados — e o que NÃO foi implementado, por quê

| Objetivo do brief | Veredito | Onde |
|---|---|---|
| 1. Market Insights Domain | Não existia — **criado** | `src/domains/market-insights/` |
| 2. Price Intelligence | Parcialmente existia (`CanonicalPriceHistoryService` já tinha min/max/avg/trend histórico-blended) — **estendido**: mediana e dispersão entre lojas (coeficiente de variação) eram genuinamente novos | `PriceIntelligenceService.computePriceStatistics` |
| 3. Market Pulse | **90% já existia** (`MarketPulseService`, Program A Wave 2, já responde "quais lojas mais atualizaram"/"quais categorias mais movimentadas" no nível certo) — **só o rollup canônico foi novo** (mesmo produto vendido por 2 lojas não pode ser contado 2x como "maior queda") | `MarketPulseInsightsService` (chama `MarketPulseService.getTopMovers` diretamente, nunca duplica) |
| 4. Price History API | Composição nova sobre serviços existentes — nenhuma tabela nova, internal-only | `PriceHistoryQueryService` |
| 5. Savings Engine | Não existia neste formato (per-canonical-product, "Loja X vs Loja Y") — `ExchangeAnalyticsService.computeBuyerSavings` (Exchange, Wave 1) calcula economia **catalog-wide** contra o preço histórico mais alto, um conceito diferente — **criado**, sem duplicar o de Exchange | `PriceIntelligenceService.computeSavingsOpportunity` |
| 6. Volatility Engine | **Já existia como algoritmo** (`VolatilityEngine`, Program A Wave 2) — nenhuma estatística nova foi inventada; o que faltava era o rollup por produto canônico/categoria/merchant | `VolatilityRollupService` |
| 7. Merchant Intelligence | **Já coberto quase por completo** — ver §3 | **Nada construído**, deliberadamente |
| 8. Home Readiness | Serviços já servem esse propósito (screen-agnostic, retornam dado tipado) — nenhum componente React, nenhuma página | N/A — ver §5 |
| 9. Brain Integration | Avaliado, não implementado como evento novo — ver §6 | N/A |
| 10. Performance | Auditado — ver §7 | N/A |

---

## 3. Objetivo 7 (Merchant Intelligence) — por que nada foi construído

O brief pede: frequência de atualização, quantidade de ofertas, cobertura de catálogo, estabilidade de preços, qualidade dos dados, velocidade de atualização. **Todos os seis já existem**, espalhados entre 4 serviços já entregues em Waves anteriores desta mesma Release:

| Métrica pedida | Já existe em |
|---|---|
| Frequência de atualização | `StoreUpdateIntelligenceService.avgUpdateIntervalMinutes` (realtime-commerce, Wave 2) |
| Quantidade de ofertas | `ConnectorObservabilityService.offersImported` (Connector Platform, Wave 5) |
| Cobertura de catálogo | `MarketplaceCoverageService` (marketplace-operations, Program 0 Wave 1) |
| Estabilidade de preços | `StoreUpdateIntelligenceService.catalogStability` / `VolatilityRollupService.getMerchantAggressiveness` (esta Wave, ângulo complementar: direção do preço, não só variação) |
| Qualidade dos dados | `ProductHealthService.getHealthBreakdown` (catalog-intelligence, Release 1.6) |
| Velocidade de atualização | `StoreUpdateIntelligenceService.priceReactionSpeedHours` |

Construir um `MerchantIntelligenceService` novo aqui violaria diretamente "nunca criar serviços redundantes" — a resposta correta é apontar para o que já existe, não reimplementar. `VolatilityRollupService.getMerchantAggressiveness` (esta Wave) é o único ângulo genuinamente novo — "merchants mais agressivos" (fração de mudanças de preço que são quedas), que nenhum serviço existente media.

---

## 4. Integração com Canonical Catalog

Toda estatística de preço passa por `ICanonicalCatalogRepository` — nunca uma segunda query direta a `offers`/`products`. Duas extensões pequenas e aditivas foram necessárias (auditadas antes de escrever, zero breaking change em consumidores existentes, confirmado por `tsc`/testes):

- `CanonicalOfferView` ganhou `productId` — necessário para cruzar com `market_changes`/`VolatilityEngine`, que chaveiam no `products.id` bruto, não no `offerId`.
- `ICanonicalCatalogRepository` ganhou `findByCategoryId` (espelha `findByBrandId` já existente) e `findCanonicalProductIdByProductId` (o lookup reverso de `findOffersByCanonicalProductId`).
- `CanonicalPriceAggregation` ganhou `lastPriceUSD`/`firstSeenAt` — ambos já eram computados internamente por `computePriceAggregation` para derivar `trend`, só nunca haviam sido retornados.

---

## 5. Preparação para Home / Brain / Marketplace / Search / Mobile (Objetivos 8-9)

Todo tipo de retorno (`PriceStatistics`, `SavingsOpportunity`, `CanonicalVolatilityProfile`, `PriceHistoryProfile`, `CanonicalMarketMover`) é um objeto de dado plano, serializável, sem qualquer acoplamento a Next.js/React. Qualquer API futura (pública ou interna), qualquer app mobile, e o Brain podem consumir diretamente — nenhuma tela foi criada, nenhum componente React, nenhuma rota de API pública, conforme exigido.

**Brain (Objetivo 9)**: avaliado, não conectado. Os 6 `BrainAsset` existentes (`HistoricalData`, `MerchantTrust`, `KnowledgeGraph`, `BuyerBehavioralKnowledge`, `SearchIntelligence`, `RecommendationKnowledge`) já cobrem conceitualmente onde esta inteligência se encaixaria — `PriceHistoryProfile`/`CanonicalVolatilityProfile` mapeiam para `HistoricalData`; `SavingsOpportunity` mapeia para `RecommendationKnowledge`. Nenhum `BrainAsset` novo foi criado (mesma disciplina de todas as Waves anteriores: "decisão própria, precisa de ADR", nunca inventada dentro de uma Wave de infraestrutura). Nenhum `TrustEventType` novo foi criado — estes são agregados computados sob demanda, não ocorrências pontuais como uma review ou uma claim; não há um "evento" natural para emitir.

---

## 6. Performance (Objetivo 10)

Nenhum índice novo foi criado — toda consulta nova reaproveita índices já existentes de Waves anteriores (`market_changes` já indexado por `product_id`/`store_id`/`detected_at` desde a Wave 2; `offers.canonical_product_id`/`product_id` já indexados desde a Wave 4 do Release 1.7). Amostras limitadas (bounded samples) são usadas consistentemente onde uma consulta poderia crescer sem limite — `CATEGORY_SAMPLE_SIZE = 20` (rollup de categoria), mesma disciplina já usada por `ConnectorObservabilityService`/`MarketPulseService` em Waves anteriores.

---

## 7. Limitações honestas

- **Toda análise depende de `canonical_product_id` estar de fato vinculado** (`offers.canonical_product_id`). Hoje só Shopping China tem um Connector certificado gerando dado real — a cobertura de Canonical Match no catálogo real é baixa (achado já nomeado desde a Wave 3 do Release 1.7: Product Identity roda em Shadow Mode, não promove automaticamente). `PriceIntelligenceService`/`SavingsOpportunity` só produzem resultado real quando 2+ lojas vendem o mesmo produto canônico — **isso só se torna interessante em volume real após a expansão de Connectors (Mega Eletrônicos, Roma Shopping, Atacado Connect) ser retomada**.
- **`VolatilityRollupService`/`PriceHistoryQueryService` dependem de `market_changes` acumulado ao longo do tempo** — com um único Connector certificado rodando há poucos dias, a amostra de mudanças reais ainda é pequena; os números são estruturalmente corretos, mas estatisticamente pouco significativos até mais Connectors/mais tempo de operação real acumularem dado.
- **`getMerchantAggressiveness`/rollups de categoria não têm teste com dado real de produção** — validados com mocks (testes unitários), não com uma chamada real contra o banco nesta sessão (diferente da Wave 4/6 do Connector Platform, que validaram Delta Import com sync real) — não há Connector suficiente ainda para uma validação end-to-end significativa.

---

## 8. Recomendação

A camada de inteligência está pronta e testada — mas seu valor real é proporcional à cobertura de Canonical Match, que por sua vez depende de mais Connectors ativos. A ordem correta agora é: retomar a expansão de Connectors (Mega Eletrônicos, Roma Shopping, Atacado Connect — infraestrutura já pronta desde Program B Wave 2) para gerar volume real, e então este Market Intelligence Engine passa a produzir insight estatisticamente significativo, não apenas estruturalmente correto.
