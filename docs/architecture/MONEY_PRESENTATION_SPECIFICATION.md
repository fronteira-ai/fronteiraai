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
