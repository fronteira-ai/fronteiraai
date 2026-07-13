# BUYER_EXPERIENCE_PRIORITIES.md
# PROGRAM Π (PI) — MISSION Π-1 — Objetivo 7: ICE Score

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: priorização apenas.
**Método**: Impact (1-10, valor de decisão para o comprador × diferenciação) — Confidence (1-10, quão certo é que o serviço-fonte já existe e funciona como descrito) — Ease (1-10, inverso do esforço de composição/UI, nunca de construção de inteligência nova, que é zero em todos os itens elegíveis). Score = média simples. Só entram nesta tabela experiências **100% reaproveitáveis** (`INTELLIGENCE_CARD_LIBRARY.md` §12) — Produto Equivalente e Alternativa Inteligente ficam de fora por definição, não por avaliação baixa.

---

## 1. Tabela ICE completa (12 candidatas elegíveis)

| # | Experiência | Fonte | Impact | Confidence | Ease | ICE |
|---|---|---|---:|---:|---:|---:|
| 1 | **Economia** | `SavingsOpportunity` | 9 | 9 | 8 | **8,7** |
| 2 | **Melhor Oportunidade** (Home) | `CanonicalMarketMover`/`MarketPulseService` | 9 | 9 | 8 | **8,7** |
| 3 | **Maior Confiança** no card de decisão | `TrustSignalService`/`BadgeService` | 8 | 9 | 8 | **8,3** |
| 4 | **Loja Recomendada** | `OfferRankingService`/`CompareFoundationService` | 8 | 9 | 7 | **8,0** |
| 5 | **Preço Justo** | `PriceStatistics` | 7 | 9 | 8 | **8,0** |
| 6 | **Preço Abaixo da Média** (selo compacto) | `PriceStatistics` | 7 | 9 | 8 | **8,0** |
| 7 | **Busca com preço + selos** | `SearchIntelligenceComposer` (leitura leve) | 8 | 9 | 7 | **8,0** |
| 8 | **Frescor do dado** (selo "atualizado há Xh") | `FreshnessEngine` | 6 | 9 | 9 | **8,0** |
| 9 | **Vale Comprar Hoje** (composição textual) | `CanonicalVolatilityProfile` + `CanonicalPriceHistoryService` | 9 | 7 | 6 | **7,3** |
| 10 | **Preço em Queda** | `MarketChange`/`ChangeType.PriceDecreased` | 7 | 8 | 7 | **7,3** |
| 11 | Preço em Alta | `MarketChange`/`ChangeType.PriceIncreased` | 5 | 8 | 7 | 6,7 |
| 12 | Economia agregada (prova social, Home/marketing) | `ExchangeAnalyticsService.computeBuyerSavings` | 5 | 8 | 6 | 6,3 |

## 2. Resposta direta ao Objetivo 7

**As 10 experiências que entregam o maior valor reutilizando código que já existe, em ordem**:

1. Economia (8,7)
2. Melhor Oportunidade / Home (8,7)
3. Maior Confiança no momento de decisão (8,3)
4. Loja Recomendada (8,0)
5. Preço Justo (8,0)
6. Preço Abaixo da Média (8,0)
7. Busca com preço + selos (8,0)
8. Frescor do dado (8,0)
9. Vale Comprar Hoje (7,3)
10. Preço em Queda (7,3)

Ficam de fora do top 10, não por serem ruins, mas por ICE menor: Preço em Alta (6,7 — impacto menor, risco de soar como pressão de urgência) e Economia agregada (6,3 — é uma métrica de marca/prova social, não uma decisão individual).

## 3. Leitura do padrão

Os 8 primeiros itens (ICE 8,0-8,7) têm uma característica comum: **nenhum precisa de composição textual nova nem de julgamento de produto sobre como comunicar algo delicado** — são números e fatos diretos (economia em USD, selo de confiança, mediana de preço, frescor). Os itens 9-10 (Vale Comprar Hoje, Preço em Queda) têm Confidence/Ease levemente menores porque exigem uma camada de linguagem (nunca virar previsão) ou de classificação temporal (janela de "queda recente") — mais julgamento de produto, não mais engenharia.

**Implicação de sequenciamento**: os 8 primeiros podem, na prática, ser entregues quase simultaneamente — todos vivem na mesma superfície (card de produto/comparação/busca) e usam dados já formatados. Ver `QUICK_WINS_RELEASE2.md` para o corte de execução.

## 4. Reconciliação com a Mission Λ-1

Esta lista ICE confirma, com uma varredura muito mais exaustiva de serviços (95 arquivos em 14 domínios, contra o escopo mais focado da Λ-1), a mesma ordem de grandeza já vista em `BUYER_INTELLIGENCE_ROADMAP.md`: Economia e Melhor Compra/Oportunidade no topo, Alertas fora do top 10 por depender de decisões Tipo 1 não técnicas, Alternativas/Equivalentes fora por exigirem dado que não existe. A convergência entre as duas missões, feitas com metodologia e escopo de leitura diferentes, é evidência adicional de que a priorização não é uma opinião isolada.
