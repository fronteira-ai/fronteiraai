# DECISION_EXPERIENCE_GUIDE.md
# RELEASE 2.0 — Fase 2 — Como as Decision Experiences trabalham juntas

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Público-alvo**: qualquer pessoa (humana ou IA) que for construir a próxima Experience de decisão do ParaguAI.

---

## 1. Como todas as Experiences trabalham juntas hoje

```
Serviços de base (nunca alterados por uma Decision Experience)
  CompareFoundationService / OfferRankingService (Canonical Catalog)
  PriceIntelligenceService / VolatilityRollupService (Market Insights)
  FreshnessService (Realtime Commerce)
  ExchangeRateService / ExchangeHistoryService (Exchange)
  BadgeService / MerchantProfileService / TrustHistoryService (Trust)
        │
        ▼
Composers de 1ª camada (cada um lê os serviços de base, nunca outro composer de 1ª camada)
  ComparisonIntelligenceComposer → ComparisonIntelligenceBundle
  BestDealComposer               → BestDealResult
  PurchaseTimingComposer         → PurchaseTimingResult
  TrustComposer                  → TrustCardResult
        │
        ▼
Composers de 2ª camada (leem SOMENTE resultados de composers de 1ª camada, zero I/O novo)
  ParaguAIAdvisorComposer        → ParaguAIAdvisorResult
```

Cada Experience (EI-1 a EI-4) é um composer de 1ª camada: lê serviços de base, nunca outro composer irmão. O ParaguAI Advisor é o primeiro composer de 2ª camada: lê apenas os *resultados* já prontos dos composers de 1ª camada. Essa separação é o que torna o Advisor "composição de composições" — ele não sabe (e não precisa saber) que `BestDealResult.savingsOpportunity` veio originalmente de `PriceIntelligenceService`.

## 2. Como futuras Experiences deverão integrar-se ao Advisor

Uma nova Decision Experience (ex.: EI-6, EI-7...) que produza um resultado no formato `{ verdict/recommendation, reasons[], errors }` (o mesmo formato já usado por `BestDealResult`/`PurchaseTimingResult`/`TrustCardResult`) deve:

1. **Nunca ser consumida diretamente pelas páginas** (`app/product/[slug]/page.tsx`, `app/compare/[slug]/page.tsx`) sem antes passar pelo Advisor, se ela representa mais um ângulo da mesma decisão de compra — do contrário, o comprador volta a ver sinais fragmentados, o problema que o EI-5 resolveu.
2. **Ser adicionada como um novo parâmetro opcional em `ParaguAIAdvisorComposer.compose(...)`** (nunca alterando os três parâmetros existentes), com sua própria checagem em `detectConflicts` caso ela possa discordar de um sinal já existente.
3. **Nunca introduzir uma nova unidade de "confiança"/"score" que combine com as demais** — se a nova Experience já produz um veredito categórico (como `buy_now`/`can_wait`/`better_wait` ou `isVerified`), o Advisor deve comparar categorias, nunca somar números de escalas diferentes.

## 3. Como manter consistência de linguagem

- **Vocabulário de veredito**: sempre um enum de poucos estados nomeados (`"buy_now" | "can_wait" | "better_wait" | "insufficient_data"`, `"buy_now" | "good_deal_caution" | "wait" | "insufficient_data"`), nunca um número cru exposto ao comprador como "score de decisão".
- **Motivos sempre citam um valor real**: todo `reason`/`signal`/`conflict` é `{ factor/signalA, label, evidence }` — a evidência é sempre um valor numérico ou categórico já existente, nunca uma frase genérica gerada sem referência.
- **Honestidade sobre ausência**: a frase padrão para dado ausente é sempre "Informação indisponível" ou "Não há [dados/evidências] suficientes" — nunca omitir silenciosamente um campo sem explicar por quê, e nunca inventar um valor plausível para preencher a lacuna.
- **Ícones fixos por conceito**: 🏆 recomendação, 💰 economia, 🛡️ confiança, 📈 melhor compra/preço, 🕒 timing, ⭐ resumo, ⚠️ conflito/limitação — uma nova Experience deve reaproveitar esses ícones para o mesmo conceito, não inventar um novo emoji para "confiança" em outro lugar do produto.

## 4. Como evitar recomendações contraditórias

- **O Advisor é a única camada autorizada a decidir qual veredito "vence"** quando dois sinais discordam — nenhuma Experience individual (Best Deal, Purchase Timing, Trust) deve tentar prever ou silenciar o que a outra diz.
- **Todo conflito detectado deve ser listado, nunca resolvido em silêncio** — a regra de prioridade do Advisor (Objetivo 4) é: preço bom + qualquer sinal de alerta (confiança baixa OU timing de espera) rebaixa a recomendação de `buy_now` para `good_deal_caution`, mas os dois sinais originais continuam visíveis lado a lado.
- **Nenhuma Experience nova deve reescrever um veredito de outra** — se a nova Experience discorda do Purchase Timing, por exemplo, ela produz seu próprio veredito e deixa o Advisor decidir como apresentar os dois, exatamente como já acontece entre Best Deal e Purchase Timing hoje.
