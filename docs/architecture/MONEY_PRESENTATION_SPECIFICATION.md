# MONEY_PRESENTATION_SPECIFICATION.md
# PROGRAM ΔR — Mission ΔR-1.2 — Universal Price Presentation

**Categoria**: `docs/architecture/`
**Data**: 2026-07-14
**Natureza**: especificação + implementação. Nenhuma regra de negócio, Advisor, Opportunity Engine, Best Deal, Purchase Timing ou Trust foi alterado — apenas como dinheiro é apresentado.

---

## 1. O contrato `MoneyPresentation`

```ts
interface MoneyPresentation {
  amountUSD: number;
  amountBRL: number | null;        // null = nunca fabricado, sempre honesto
  currencyPair: CurrencyPair | null;
  exchangeRate: number | null;
  provider: string | null;
  capturedAt: string | null;
  presentedAt: string;
  isStale: boolean;                 // nunca escondido
  formattedUSD: string;
  formattedBRL: string | null;
  formattedRate: string | null;     // "1 USD = R$ 5,42"
  formattedTimestamp: string;       // "Atualizado há 3 min" / "Cotação desatualizada"
}

interface MoneySavingsPresentation {
  amountUSD: number;
  amountBRL: number | null;
  percent: number;
  formattedUSD: string;
  formattedBRL: string | null;
  formattedPercent: string;
}
```

Produzido exclusivamente por `PricePresentationService` (`src/domains/exchange/services/PricePresentationService.ts`), que internamente chama `AutomaticCurrencyService.convert()` (já existente, Release 1.8) — nenhum cálculo de câmbio novo.

## 2. A exceção ADR-009 — honestidade sobre uma tensão real

`offers.price_brl` é um valor **independente, informado pelo lojista** (ADR-009) — nunca derivado do câmbio. Se `PricePresentationService` sobrescrevesse esse valor por uma conversão calculada, estaria substituindo um preço real observado por uma estimativa, exatamente o tipo de erro que este projeto nunca comete silenciosamente.

Por isso, `PresentMoneyInput.knownAmountBRL` existe: quando o chamador já possui um valor BRL real e independente, o serviço apenas formata (nunca converte, nunca sobrescreve), e `formattedTimestamp` diz explicitamente **"Preço informado pela loja"** — nunca finge que veio de uma cotação.

## 3. Auditoria da plataforma (Objetivo 3) — o que foi encontrado e o que foi feito

| Superfície | Estado antes | Ação nesta missão |
|---|---|---|
| Home — Achado do Dia | `US$ {x.toFixed(2)}` cru | Migrado — `MoneyPresentation`/`MoneySavingsPresentation` completos, com câmbio e timestamp |
| Home — Economia do dia (dashboard) | `US$ {x.toFixed(2)}` cru | Migrado, mesmo padrão |
| Home — Câmbio ao Vivo | `timeAgo()` local duplicada; `usingFallback` nunca lido | Migrado para `formatTimestamp` compartilhado; staleness agora exibida |
| Home — Live Marketplace | `US$ {valor}` sem nenhuma formatação | Corrigido para `formatUSD` |
| Produto — Best Deal | `formatUSD` de `@/utils/currency`; câmbio formatado cru | Migrado — preço e economia com BRL, badge de câmbio via `MoneyPresentation` |
| Produto — Advisor | `formatUSD` de `@/utils/currency` | Migrado — preço e economia com BRL |
| Produto/Comparação — Ofertas, Comparação de ofertas | `formatUSD`/`formatBRL` de `@/utils/currency` (já corretos na formatação, fonte errada) | Import corrigido para `@/src/domains/exchange` — `offer.price_brl` continua intocado (ADR-009) |
| Busca — grades de produto (`ProductCard`) | `formatUSD` de `@/utils/currency` | Import corrigido; **nenhuma conversão BRL adicionada** (ver §5) |
| **Advisor Composer** (`ParaguAIAdvisorComposer.ts`) | `formatUSD` de `@/utils/currency`, embutido no texto de `reasons`/`summary` | Import corrigido (mesma função, mesma fonte agora); **texto ainda não inclui BRL** (ver §5) |
| **Purchase Timing** (`PurchaseTimingComposer.ts`) | `USD ${x.toFixed(2)}` cru, embutido na evidência do veredito | **Não alterado — Purchase Timing está na lista de restrição explícita desta missão.** Achado documentado, não corrigido. |
| Merchant (`app/merchant/products/page.tsx`) | `${x.toFixed(2)}` cru | **Não migrado** — fora de escopo desta missão (ver §5) |
| Admin (`app/admin/catalog/offers/page.tsx`, `AnalyticsSummary.tsx`) | `$`/`R$` com `.toFixed(2)` cru | **Não migrado** — fora de escopo (ver §5) |

## 4. Padronização visual (Objetivo 5/6/7)

- USD sempre `formatUSD` (`Intl.NumberFormat("en-US", currency: "USD")`).
- BRL sempre `formatBRL` (`Intl.NumberFormat("pt-BR", currency: "BRL")`) — nunca `null` mostrado como "$0" ou omitido silenciosamente; quando `null`, a UI simplesmente não renderiza a linha (nunca um valor inventado).
- Cotação: `"1 USD = R$ X,XX"`.
- Timestamp: `"Atualizado há X min"` / `"Atualizado há Xh"` / `"Cotação desatualizada"` (quando `isStale`) / `"Preço informado pela loja"` (quando `knownAmountBRL`).
- Precisão: sempre 2 casas decimais, sempre via `Intl.NumberFormat`, nunca `.toFixed()` cru.
- Responsividade/dark mode/mobile: nenhuma classe de layout foi alterada — apenas o conteúdo textual dentro dos componentes existentes.

## 5. Escopo explícito — o que NÃO foi migrado, e por quê

- **Merchant e Admin** — dashboards internos, não voltados ao comprador; a auditoria encontrou exatamente 3 arquivos com formatação crua (`app/admin/catalog/offers/page.tsx`, `app/merchant/products/page.tsx`, `components/admin/exchange/widgets/AnalyticsSummary.tsx`), documentados aqui para uma missão futura dedicada, dado o volume e a natureza não-compradora dessas telas.
- **`PurchaseTimingComposer.ts`** — contém `USD ${x.toFixed(2)}` cru na evidência do veredito, mas esta missão restringe explicitamente qualquer alteração a Purchase Timing. Achado documentado, não corrigido.
- **`ParaguAIAdvisorComposer.ts`'s texto embutido** e **grades de produto** (`ProductCard`, `CompareSummary`) — a fonte de formatação foi corrigida (agora única, canônica), mas uma conversão BRL ao vivo não foi adicionada a essas strings/grades nesta missão, para não introduzir uma chamada assíncrona de câmbio por item em uma grade densa sem necessidade comprovada. Recomendado para uma iteração futura, não uma omissão silenciosa.

## 6. Fonte única alcançada

`utils/currency.ts` não exporta mais `formatUSD`/`formatBRL` — apenas `discountPercentage` (um cálculo percentual, não uma formatação monetária, permanece ali). Toda formatação monetária no código-fonte agora importa de `@/src/domains/exchange`, confirmado por auditoria final (Objetivo 9).

---

## 7. Mission ΔR-1.2A Closure — Money Presentation Completion

**Data**: 2026-07-14
**Escopo autorizado**: Merchant, Admin, Purchase Timing (apresentação textual) — nenhuma outra área.

### O que foi eliminado

| Arquivo | Antes | Depois |
|---|---|---|
| `app/merchant/products/page.tsx` | `` `${row.price_usd.toFixed(2)}` `` | `formatUSD(row.price_usd)` (import direto do arquivo-folha, Client Component) |
| `app/admin/catalog/offers/page.tsx` | `` `$ ${r.price_usd.toFixed(2)}` `` / `` `R$ ${r.price_brl.toFixed(2)}` `` | `formatUSD(r.price_usd)` / `formatBRL(r.price_brl)` (import direto do arquivo-folha, Client Component) |
| `components/admin/exchange/widgets/AnalyticsSummary.tsx` | `` `$${analytics.buyerSavings.totalSavingsUsd.toFixed(2)}` `` | `formatUSD(analytics.buyerSavings.totalSavingsUsd)` (Server Component, import do barrel) |
| `src/domains/buyer-intelligence/services/PurchaseTimingComposer.ts` | `` `USD ${lastPriceUSD.toFixed(2)} vs. mediana de USD ${median.toFixed(2)}...` `` | `` `${formatUSD(lastPriceUSD)} vs. mediana de ${formatUSD(median)}...` `` — **apenas o texto da evidência mudou; nenhuma condição, voto ou limiar de decisão foi tocado** (confirmado por diff e pela suíte de testes existente, que só valida `label`, nunca o texto de `evidence`, e passou sem alteração) |

Nota técnica: nos dois arquivos de Merchant/Admin (Client Components), `formatUSD`/`formatBRL` foram importados diretamente do arquivo-folha (`@/src/domains/exchange/presentation/formatters`), não do barrel do domínio — o barrel também reexporta classes de repositório/serviço server-only, que não têm motivo para entrar no bundle do cliente.

### O que permaneceu, e por quê

- **`src/domains/buyer-intelligence/services/BestDealComposer.ts:63`** — encontrado pela auditoria global (Objetivo 4): `` `Até USD ${savings.maxSavingsUSD.toFixed(2)} (...)` ``, o mesmo padrão cru corrigido em Purchase Timing. **Não corrigido.** Best Deal não está entre as três pendências autorizadas nesta missão, e a lista de restrições do CTO proíbe alterar Best Deal sem qualificação (diferente de Purchase Timing, explicitamente qualificado como "(lógica)" — ou seja, a apresentação de Purchase Timing foi liberada, a de Best Deal não). Requer uma nova missão explicitamente autorizada.
- **Grades de produto (`ProductCard`, `CompareSummary`) e o texto embutido do `ParaguAIAdvisorComposer.ts`** — fonte de formatação já corrigida na Mission ΔR-1.2; nenhuma conversão BRL ao vivo foi adicionada, por escolha de escopo já registrada em §5, não revisitada nesta missão (fora do que foi pedido: Merchant, Admin, Purchase Timing).

### Auditoria global (Objetivo 4) — resultado exato

- `formatUSD`/`formatBRL`: toda ocorrência no código-fonte importa de `@/src/domains/exchange` ou de `@/src/domains/exchange/presentation/formatters` — confirmado por grep, zero exceções.
- `Intl.NumberFormat`: zero ocorrências fora de `src/domains/exchange`.
- `toFixed(` fora do domínio Exchange: dezenas de ocorrências, **nenhuma nova identificada como dinheiro** além da já listada acima (`BestDealComposer.ts`) — as demais são percentuais (taxa de erro, variação), avaliações (`X.X/5`, `X.X★`) ou horas, confirmadas uma a uma.

### Definition of Done (Objetivo 7)

| Pergunta | Resposta |
|---|---|
| Toda a plataforma utiliza `PricePresentationService`? | **Não integralmente** — Merchant/Admin usam os formatadores puros (`formatUSD`/`formatBRL`), não o serviço completo (nenhuma conversão BRL é necessária ali hoje) |
| Toda a plataforma utiliza os formatadores canônicos do domínio Exchange? | **Sim**, sem exceção, confirmado por auditoria global |
| Existe alguma exceção? | **Sim, exatamente uma**: `BestDealComposer.ts:63`, fora do escopo autorizado desta missão |
| Existe dívida técnica restante? | **Sim, uma linha, precisamente localizada e documentada** — não uma incerteza |

Money Presentation Domain — **STATUS: quase completo**, com uma exceção nomeada, não uma lacuna desconhecida.
