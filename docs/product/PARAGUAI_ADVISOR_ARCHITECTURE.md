# PARAGUAI_ADVISOR_ARCHITECTURE.md
# RELEASE 2.0 — Fase 2 — Experience Iteration 5 (EI-5) — ParaguAI Advisor

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: composição de composições — o `ParaguAIAdvisorComposer` não faz nenhuma chamada de I/O e não introduz nenhum score, peso ou algoritmo. Ele lê apenas os três resultados que `BestDealComposer`, `PurchaseTimingComposer` e `TrustComposer` já produzem e decide, por comparações simples de condição, qual veredito já existente exibir.

---

## 1. Auditoria da Buyer Intelligence existente (Objetivo 1)

| Experience/serviço | O que produz | Sobreposição | Complementar |
|---|---|---|---|
| **Buyer Savings** (EI-1) | Não existe um `BuyerSavingsResult` próprio — ver achado abaixo | **100% sobreposto** com Best Deal | — |
| **Best Deal** (EI-2) — `BestDealResult` | Oferta recomendada, `savingsOpportunity` (economia), `priceStatistics`, `exchangeContext`, `nearTie`, `reasons` | Contém a economia (Buyer Savings) | Complementa Timing (preço) e Trust (loja) |
| **Purchase Timing** (EI-3) — `PurchaseTimingResult` | Veredito de timing (`buy_now`/`can_wait`/`better_wait`), tendência de preço, câmbio, volatilidade | — | Complementa Best Deal (quando comprar vs. onde comprar) |
| **Trust** (EI-4) — `TrustCardResult` | Verificação, nível de confiança, badges, histórico, estoque, frescor | — | Complementa Best Deal/Timing (em quem confiar) |
| Price Intelligence, Marketplace Intelligence, Exchange, Freshness, Offer Ranking, Canonical Catalog | Todos os números-base | **Já embutidos** dentro dos três resultados acima | Nenhum acesso direto necessário |

### Achado principal do audit

O mandato desta missão presume um `BuyerSavingsResult` como quarto insumo, paralelo a `BestDealResult`/`PurchaseTimingResult`/`TrustCardResult`. **A auditoria confirma que esse tipo nunca existiu como composer independente.** A Wave 1 ("Quick Wins") surfaceava `priceStatistics`/`savingsOpportunity` diretamente dentro de `ComparisonIntelligenceBundle`, e a Wave 2 (Best Deal) já absorveu esses mesmos campos dentro de `BestDealResult.savingsOpportunity`/`priceStatistics` — confirmado lendo `components/product/BestDealCard.tsx`, que já exibe "💰 Economize até..." a partir de `bestDeal.savingsOpportunity`.

Diante disso, o `ParaguAIAdvisorComposer` foi projetado para consumir **três** resultados, não quatro — `BestDealResult` (que já contém a Economia Estimada), `PurchaseTimingResult` e `TrustCardResult`. Registrar isso explicitamente aqui, em vez de criar um `BuyerSavingsResult` artificial só para satisfazer a letra do mandato, é a aplicação direta do princípio "nenhum cálculo novo, somente composição" — inventar um quarto tipo para reembalar dados que já existem dentro do Best Deal seria código novo sem propósito.

## 2. Fluxo de composição (Objetivo 2)

```
BestDealResult | null          (Wave 2 — já contém a economia estimada)
PurchaseTimingResult | null    (Wave 3)
TrustCardResult | null         (Wave 4)
        │
        ▼
ParaguAIAdvisorComposer.compose(bestDeal, purchaseTiming, trust)   [NOVO — síncrono, zero I/O]
        │
        ├─ bestDeal === null? → recommendation = "insufficient_data"
        ├─ detectConflicts(bestDeal, purchaseTiming, trust)
        │     ├─ preço excelente (savingsOpportunity.maxSavingsUSD > 0) + loja não verificada → conflito
        │     └─ preço excelente + purchaseTiming.verdict === "better_wait" → conflito
        ├─ conflicts.length > 0? → recommendation = "good_deal_caution"
        ├─ purchaseTiming?.verdict === "better_wait"? → recommendation = "wait"
        ├─ senão → recommendation = "buy_now"
        └─ buildSummaryLines(...) → no máximo 5 linhas
        ▼
ParaguAIAdvisorResult → ParaguAIAdvisor (card completo) + RecommendationSummary (≤5 linhas)
```

`src/domains/buyer-intelligence/services/ParaguAIAdvisorComposer.ts` — é o único composer desta Wave sem nenhuma dependência de construtor (nenhum repositório, nenhum client Supabase), porque não faz nenhuma leitura própria.

## 3. Sistema de prioridade e conflitos (Objetivo 4)

O Advisor **nunca esconde sinais e nunca inventa uma decisão de desempate silencioso**. Quando "Preço excelente" colide com "Confiança baixa" ou com "Melhor aguardar", o veredito muda para `good_deal_caution` — nunca `buy_now` — e o conflito completo (as duas afirmações + uma frase de explicação citando os valores reais) é sempre incluído em `conflicts[]`. Não existe um caminho de código em que um conflito detectado deixe de aparecer no resultado.

## 4. Recommendation Summary (Objetivo 5)

`buildSummaryLines` produz, na ordem: 🏆 Recomendação (sempre presente) → 💰 Economia (se houver) → 🛡️ Confiança (se houver perfil) → 🕒 Timing (se houver veredito) → ⚠️ Atenção (se houver conflito) — e corta em `.slice(0, 5)`, garantindo o limite de 5 linhas do Objetivo 5 mesmo que todas as condições sejam verdadeiras ao mesmo tempo.

## 5. Todos os casos de "Não há evidências suficientes para uma recomendação" (Objetivo 6)

O único gatilho é `bestDeal === null` — que ocorre exatamente quando o produto ainda não está vinculado a um produto canônico (Product Identity, Shadow Mode) ou não tem nenhuma oferta. Como `purchaseTiming` e `trust` são derivados do mesmo `comparison`/`bestDeal` nas páginas de produto e comparação, os três são nulos juntos — não existe um estado onde apenas um deles falta e o Advisor tenta adivinhar com os outros dois.

## 6. Onde vive, e onde não aparece

Integrado em Product Detail e Comparison Experience, como a primeira seção de inteligência exibida (antes dos cards individuais de Best Deal/Should I Buy Now/Trust, que permanecem como o nível de detalhe/explicabilidade por trás da recomendação unificada). **Home Premium não foi tocada.**

## 7. Limites conhecidos

- **"Preço excelente" é definido apenas como `savingsOpportunity.maxSavingsUSD > 0`** — um limiar binário, não uma nova escala; qualquer economia, por menor que seja, conta como "excelente" para fins de detecção de conflito. Isso é deliberado: o Advisor não introduz uma nova faixa de "quão excelente", apenas reaproveita o booleano que o Best Deal já expõe.
- **Conflito de confiança não dispara para lojas sem merchant vinculado** (`trust.merchantId === null`) — esse caso já tem sua própria mensagem honesta ("Informação indisponível") dentro do próprio Trust Card; tratá-lo como um segundo tipo de conflito duplicaria a comunicação ao comprador.
- **Apenas dois pares de conflito são verificados** (preço × confiança, preço × timing) — o mandato cita exatamente esses dois exemplos; nenhum terceiro par foi inventado para "completude".
