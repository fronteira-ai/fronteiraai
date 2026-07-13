# DECISION_LAYER.md
# RELEASE 2.0 — Experience Iteration 2 (EI-2) — Best Deal Experience

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: arquitetura de composição — nenhuma inteligência, algoritmo, score ou peso novo. Toda esta camada lê saídas de serviços já existentes e já certificados; nunca recalcula nada.

---

## 1. O que é a Decision Layer

A Decision Layer é a resposta arquitetural a uma pergunta específica: **como sete serviços já existentes, construídos em Releases diferentes, por motivos diferentes, se combinam em uma única recomendação de compra?**

Ela não é um domínio novo (`src/domains/`) — é o papel que `BestDealComposer` (dentro do já existente `src/domains/buyer-intelligence/`, Release 2.0 Wave 1) desempenha: um único ponto de composição que lê, nunca escreve, nunca recalcula, e nunca substitui a regra de negócio de nenhum dos sete serviços abaixo.

## 2. Os sete insumos, e o que cada um contribui

| Serviço | Domínio | O que contribui para a decisão | Já existia desde |
|---|---|---|---|
| **Compare Foundation** (`CompareFoundationService`) | `canonical-catalog` | Resolve o produto canônico e agrega as ofertas de todas as lojas já ligadas a ele (cross-merchant) | Release 1.8 Program C |
| **Offer Ranking** (`OfferRankingService`) | `canonical-catalog` | O ranking em si — preço/disponibilidade/recência/confiança/qualidade do anúncio, 0-100, com fatores nomeados (`OfferRankFactor[]`) | Release 1.8 Program C |
| **Price Intelligence** (`PriceIntelligenceService`) | `market-insights` | Mediana/dispersão entre lojas ("Preço Justo") e a economia máxima estimada ("Buyer Savings" — `SavingsOpportunity`) | Release 1.8 Program C |
| **Freshness** (`FreshnessService`) | `realtime-commerce` | Classificação de quão recente é o dado de uma oferta (Live/Fresh/Recent/Old/Stale) | Release 1.8 Program A |
| **Trust** (`BadgeService`, via `IMerchantStoreLinkRepository`) | `trust` + `merchant-ownership` | Se a loja recomendada tem um badge de confiança ativo | Release 1.5 |
| **Exchange** (`ExchangeRateService`) | `exchange` | A cotação USD/BRL vigente, com fonte e data de captura — contexto, nunca converte o preço exibido | Release 1.8 Program A |
| **Marketplace Intelligence** | (papel indireto) | Já reconciliado em `docs/engineering/MARKET_INTELLIGENCE_ENGINE.md` como não-duplicado — Price Intelligence/Freshness/Trust acima já são a materialização de Marketplace Intelligence para este caso de uso; nenhum serviço adicional de "Marketplace Intelligence" genérico precisou ser chamado |

## 3. A composição — `BestDealComposer.compose()`

```
ComparisonIntelligenceComposer.composeForSlug(canonicalSlug)   [Wave 1 — já existe]
        │
        ├─ CompareFoundationService.getForSlug(...)  → ofertas ranqueadas + agregação de preço
        ├─ PriceIntelligenceService.getStatistics/getSavingsOpportunity
        ├─ FreshnessService.computeForOffer (por oferta)
        └─ IMerchantStoreLinkRepository + BadgeService (verificação, batched)
        │
        ▼
ComparisonIntelligenceBundle  [já existe, Wave 1 — BestDealComposer não recalcula nenhum destes campos]
        │
        ▼
BestDealComposer.compose(bundle)                                [NOVO — Wave 2]
        │
        ├─ seleciona a oferta rank=1 já ranqueada           (nunca reordena)
        ├─ chama ExchangeRateService.getCurrentRate(USD/BRL) (única chamada nova de I/O desta Wave)
        ├─ traduz os `OfferRankFactor[]` já existentes em `BestDealReason[]` (rótulo + evidência — nunca um número novo)
        ├─ compara rankScore(rank 1) vs rankScore(rank 2)    (comparação de limiar, não um novo score)
        │
        ▼
BestDealResult
```

**A única chamada de I/O nova nesta Wave inteira é `ExchangeRateService.getCurrentRate()`.** Todo o resto de `BestDealComposer` é leitura em memória de um objeto que `ComparisonIntelligenceComposer` já havia produzido.

## 4. Por que isso não é "inteligência nova" (Objetivo 6 explicado)

A pergunta mais delicada do mandato é a detecção de "duas ofertas equivalentes" (Objetivo 6). A tentação natural seria inventar uma nova métrica de "similaridade". Não foi isso que foi construído:

- `OfferRankingService.rank()` já produz um `rankScore` 0-100 por oferta — esse número já existe, já é usado hoje para decidir qual oferta é "a melhor" (rank 1).
- `BestDealComposer` apenas **compara** `rankScore(rank 1) - rankScore(rank 2)` contra um limiar fixo (5 pontos, documentado no código). Isso é uma comparação, não uma pontuação — o mesmo tipo de decisão que `SearchIntelligenceComposer` (Release 2.0 Wave 1) já tomou ao decidir o limiar `preço < mediana × 0.9` para o selo "Preço Abaixo da Média", já aprovado pelo CTO naquela Wave.
- O "fator diferenciador" citado na explicação ("a diferença principal está em: X") também não é uma métrica nova — é, literalmente, qual dos `OfferRankFactor[]` já existentes (preço/disponibilidade/recência/confiança/qualidade) tem a maior diferença de peso entre as duas ofertas. Nenhum fator novo é calculado; apenas o maior gap entre fatores já calculados é citado.

## 5. O que a Decision Layer explicitamente não faz

- Não recalcula `rankScore`, `PriceStatistics`, `SavingsOpportunity`, `FreshnessScore` ou o status de verificação — cada um permanece exatamente como o serviço original o produz.
- Não altera nenhum peso de `OfferRankingService` (permanece preço 40/disponibilidade 20/recência 15/confiança 15/qualidade 10).
- Não introduz um segundo caminho de decisão — se `OfferRankingService` decidir que a oferta X é rank 1, `BestDealComposer` recomenda X, sempre, sem exceção nem override.
- Não toca `Product Identity`, `Connector Platform`, `Canonical Catalog`, `Exchange Analytics` ou `Compare Foundation` — apenas os consome via suas interfaces públicas já existentes.

## 6. Onde isso vive no código

`src/domains/buyer-intelligence/services/BestDealComposer.ts` — dentro do mesmo domínio de composição pura criado na Wave 1 (`BUYER_INTELLIGENCE_LAYER.md`), ao lado de `ComparisonIntelligenceComposer`/`ProductIntelligenceComposer`/`SearchIntelligenceComposer`. Nenhum domínio novo foi criado para a Decision Layer — ela é uma extensão natural do mesmo domínio de composição, não uma nova fronteira arquitetural.

Ver `docs/product/WHY_THIS_RECOMMENDATION.md` para a tradução desta arquitetura em linguagem que um comprador (ou uma futura IA Conversacional) entenderia.
