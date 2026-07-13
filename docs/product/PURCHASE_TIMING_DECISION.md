# PURCHASE_TIMING_DECISION.md
# RELEASE 2.0 — Experience Iteration 3 (EI-3) — Should I Buy Now

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: arquitetura de composição — nenhuma inteligência, algoritmo, score ou peso novo. `PurchaseTimingComposer` compara e traduz sinais que já existem; nunca recalcula preço, volatilidade, câmbio ou confiança.

---

## 1. Todos os sinais utilizados (Objetivo 1 — auditoria)

| Sinal | Serviço de origem | O que fornece | Já existia desde |
|---|---|---|---|
| Tendência de preço (`trend`: up/down/stable/unknown) | `CanonicalPriceHistoryService.computePriceAggregation` | Se o preço deste produto está subindo, caindo ou estável — já calculado com uma tolerância de ruído de 2% embutida | Release 1.8 Program C |
| Variação percentual (`variationPercent`) | `CanonicalPriceHistoryService` | A magnitude do movimento de preço | Release 1.8 Program C |
| Preço atual consolidado (`lastPriceUSD`) | `CanonicalPriceHistoryService` | O preço mais recente conhecido (mescla histórico + ofertas ao vivo) | Release 1.8 Program C / Sprint 2.8 |
| Mediana entre lojas (`medianPriceUSD`) | `PriceIntelligenceService.getStatistics` | Se o preço atual está abaixo ou acima da média do mercado — mesma fonte já usada em "Preço Justo" (Wave 1/EI-2) | Release 1.8 Program C |
| Classificação de volatilidade | `VolatilityRollupService.getCanonicalVolatility` | Quão instável o preço deste produto tem sido recentemente, e com quantos produtos essa classificação foi calculada (`productsScored`) | Release 1.8 Program C |
| Tendência de câmbio USD/BRL | `ExchangeHistoryService.getRange` | Se a cotação caiu, subiu ou ficou estável na janela recente | Release 1.8 Program A |
| Frescor do dado (`FreshnessScore`) | `FreshnessService.computeForOffer` (já presente no bundle da Wave 1) | Quão recente é o preço da loja recomendada | Release 1.8 Program A |
| Economia entre lojas | `PriceIntelligenceService.getSavingsOpportunity` | Consultado apenas como contexto já existente no bundle — não usado nesta Wave para votar no veredito, apenas repassado no `PurchaseTimingResult` implicitamente via `priceStatistics` |Release 1.8 Program C |

**Nenhum sinal acima foi calculado por esta Wave.** Todos já existiam; `PurchaseTimingComposer` adiciona exatamente duas chamadas de I/O que nenhuma composição anterior fazia (`VolatilityRollupService.getCanonicalVolatility`, `ExchangeHistoryService.getRange`) — ambas a serviços já existentes desde o Release 1.8.

## 2. A Purchase Timing Composer (Objetivo 2)

```
ComparisonIntelligenceBundle  [já existe, Wave 1 — carrega priceAggregation e priceStatistics prontos]
        │
        ▼
PurchaseTimingComposer.compose(bundle)                          [NOVO — Wave 3]
        │
        ├─ se priceAggregation.trend === "unknown" → "Não há dados suficientes" (para aqui, nenhuma chamada nova é feita)
        ├─ senão: VolatilityRollupService.getCanonicalVolatility(canonicalProductId)
        ├─ e: ExchangeHistoryService.getRange(USD/BRL, últimos 30 dias)
        ├─ compara trend/variationPercent/medianPriceUSD/câmbio já obtidos → monta a lista de `reasons`
        └─ soma votos (nunca um score) → veredito
        │
        ▼
PurchaseTimingResult
```

`src/domains/buyer-intelligence/services/PurchaseTimingComposer.ts` — mesmo domínio de composição pura da Wave 1/2, nenhum domínio novo criado.

## 3. Como o veredito é decidido — transparência total sobre o método

Este é o ponto que mais exige honestidade no mandato: **não existe uma nova pontuação**. O veredito (`buy_now`/`can_wait`/`better_wait`) é uma contagem simples de votos binários, cada um vindo de uma comparação sobre um valor que já existia:

| Sinal | Vota "comprar agora" quando | Vota "melhor esperar" quando |
|---|---|---|
| `trend` (já existente, tolerância de 2% já embutida em `CanonicalPriceHistoryService`) | `trend === "down"` | `trend === "up"` |
| Preço vs. mediana (mesma faixa de 10% já aprovada na Wave 1 para "Preço Abaixo da Média", aplicada aqui simetricamente para "acima") | preço < mediana × 0,9 | preço > mediana × 1,1 |
| Tendência de câmbio (tolerância de 2%, espelhando a mesma tolerância que `CanonicalPriceHistoryService` já usa) | câmbio caiu >2% em 30 dias | *(não vota — só soma a favor de comprar agora, nunca contra)* |

Empate (incluindo o caso "tudo estável") = `can_wait` — nunca um desempate arbitrário a favor de "comprar" ou "esperar". Isso é o mesmo espírito da Wave 2 (near-tie): quando o dado não aponta claramente para um lado, o ParaguAI diz isso, não inventa uma direção.

**Frescor** e **volatilidade muito alta** nunca votam — eles só adicionam a linha "Baixa confiança temporal" quando aplicável, como um alerta sobre a própria recomendação, não como uma inversão dela.

## 4. Should I Buy Now Card (Objetivo 3/4)

Três estados possíveis, sempre com lista de razões nomeadas — nunca "esta é a melhor loja" sem explicação:

- 🟢 **Comprar agora** — "Por que recomendamos comprar agora:" seguido da lista.
- 🟡 **Pode esperar** — "O que observamos:" (nem sinal forte de compra nem de espera).
- 🔴 **Melhor aguardar** — "Por que recomendamos esperar:" seguido da lista.
- ⚪ **Não há dados suficientes** — nunca inventa uma tendência quando não existe histórico.

## 5. Limites conhecidos (honestos, não escondidos)

- **A janela de 30 dias é a mesma já usada por `VolatilityRollupService` por padrão** — reaproveitada para o câmbio também, mas isso significa que uma mudança de tendência mais recente (últimos 3-7 dias) pode não aparecer se o produto tiver poucos pontos de histórico dentro da janela.
- **`trend` só reflete o primeiro e o último ponto conhecido**, não a trajetória completa — um preço que caiu e subiu de volta dentro da janela pode aparecer como "estável" mesmo tendo oscilado.
- **A contagem de votos é deliberadamente simples (1 voto por sinal, sem peso)** — um sinal fraco (variação de 2,1%, mal cruzando a tolerância) pesa exatamente igual a um sinal forte (variação de 40%). Isso é uma escolha consciente de simplicidade e transparência, não uma limitação técnica — ponderar os votos seria, na prática, inventar pesos novos, o que o mandato proíbe.
- **Volatilidade e frescor nunca mudam o veredito**, só a confiança relatada — um produto pode aparecer como "🟢 Comprar agora" mesmo com dado desatualizado, desde que isso esteja citado explicitamente como "Baixa confiança temporal" na lista de razões.

## 6. Todos os casos de "Não há dados suficientes" (Objetivo 6)

O único gatilho é `priceAggregation.trend === "unknown"` — que, por construção de `CanonicalPriceHistoryService.computePriceAggregation`, só ocorre quando não existe **nenhum** ponto de preço (nem histórico, nem oferta ao vivo) para o produto canônico. Isso cobre:

- Um produto canônico recém-criado, ainda sem nenhuma oferta vinculada.
- Um produto canônico cujas ofertas vinculadas nunca tiveram uma sincronização de preço registrada.

Quando isso ocorre, `PurchaseTimingComposer` retorna imediatamente, sem chamar `VolatilityRollupService` nem `ExchangeHistoryService` — nenhuma chamada é desperdiçada tentando avaliar um produto sem dado algum.

## 7. Onde vive, e onde não aparece

Integrado em Product Detail (`app/product/[slug]/page.tsx`) e Comparison Experience (`app/compare/[slug]/page.tsx`), sempre `null`-seguro quando não há vínculo canônico (Shadow Mode). **Home Premium não foi tocada** — nenhum arquivo em `components/home/` ou `app/page.tsx` foi alterado por esta Wave.

Ver `docs/product/DECISION_LAYER.md` (Wave 2) para a arquitetura geral de composição e `docs/product/WHY_THIS_RECOMMENDATION.md` para a mesma disciplina de explicabilidade aplicada ao Best Deal.
