# EXCHANGE_FOUNDATION_FOR_LIVE_PRICING.md

**Criado**: 2026-07-03 (Release 1.8 — Program A — Wave 1 — Exchange Intelligence Platform, Epic 10)
**Escopo**: documentação apenas — nenhuma implementação de Live Pricing acontece nesta Wave. Responde a uma pergunta: quais interfaces do Exchange Engine os próximos consumidores (Live Pricing Engine, Market Pulse, Buyer Experience, Home, SEO, Merchant Dashboard, Canonical Catalog, Marketplace Operations) já podem contar como estáveis, hoje?

## As duas interfaces estáveis

**`AutomaticCurrencyService.convert(input)`** (`src/domains/exchange/services/AutomaticCurrencyService.ts`) — a única forma correta de converter um preço:

```ts
convert(input: {
  amountOriginal: number;
  currencyOriginal: Currency;   // reaproveita offers.currency, não uma coluna nova
  targetCurrency: Currency;
  at?: Date;                    // omitido = cotação atual; presente = cotação histórica
}): Promise<ConvertedPrice>
```

Retorna `{ originalPrice, originalCurrency, rateUsed, convertedPrice, conversionDate, rateVersion, usingFallback }` — nunca um número opaco. `rateVersion` referencia a linha exata de `exchange_rates` usada (par + `capturedAt` + fonte), permitindo qualquer consumidor futuro auditar exatamente qual cotação gerou um preço convertido específico.

**`ExchangeHistoryService.getRateAt(pair, at)`** (`src/domains/exchange/history/ExchangeHistoryService.ts`) — a cotação vigente em um momento histórico específico, não a mais recente. Essencial para qualquer gráfico que combine preço histórico (`price_history`) com cotação — sem isso, um gráfico de "preço em Reais ao longo do tempo" aplicaria a cotação de hoje a um preço de há 3 meses, uma inconsistência silenciosa.

## O que cada consumidor futuro herda, sem trabalho adicional

- **Live Pricing Engine** (`RELEASE_1_8_BLUEPRINT.md` Capítulo 2): já pode chamar `convert()` para qualquer oferta "hot"/"warm"/"cold" sem se preocupar com qual provedor de câmbio está ativo — o registro de provedores (Epic 2) e o cache (Epic 3) já resolvem isso por trás da interface.
- **Market Pulse / Marketplace Intelligence** (`RELEASE_1_8_BLUEPRINT.md` Capítulo 5): pode consumir `ExchangeAnalyticsService.computeSnapshot()` diretamente para variação cambial, valorização de catálogo e economia do comprador — já implementado nesta Wave (Epic 6), não é trabalho novo para o Market Pulse.
- **Buyer Experience / Home**: qualquer componente que hoje mostra `price_usd`/`price_brl` como colunas independentes pode, quando decidido, mostrar também um preço convertido chamando `convert()` sob demanda — sem esperar nenhuma migration adicional, já que nada é persistido em `offers`.
- **SEO**: preços convertidos em dados estruturados (schema.org `Offer`) podem usar `convert()` no momento de renderização da página — mesma garantia de "nunca mais que ~5 minutos desatualizado" que o restante do marketplace.
- **Merchant Dashboard**: pode mostrar ao lojista "seu preço em Guaranis equivale a X Reais hoje" usando exatamente a mesma chamada que o buyer-facing usa — nenhuma duplicação de lógica de conversão.
- **Canonical Catalog**: `OfferRankingService`/`CanonicalPriceHistoryService` (ambos em USD hoje, ver `TECH_DEBT.md`) podem, no futuro, comparar ofertas em moedas diferentes chamando `convert()` antes de comparar — mas isso é uma decisão de produto própria (normalizar tudo para USD antes de rankear é uma escolha, não uma limitação técnica), não coberta por esta Wave.
- **Marketplace Operations** (Program 0 — Wave 1, já entregue): o Marketplace Health Score pode, em uma Wave futura, incorporar "frescor de câmbio" como um fator adicional, lendo `ExchangeProviderHealthService`/`ExchangeHistoryService` diretamente — nenhuma mudança de schema necessária para isso acontecer.

## O que NÃO está pronto ainda (nomeado, não escondido)

- Nenhum componente de UI real consome `convert()` hoje — esta Wave entrega apenas o backend/API (`/api/exchange/*`), consistente com o mandato "sem implementação de Live Pricing nesta Wave".
- `OfferRankingService`/`CanonicalPriceHistoryService` continuam exclusivamente em USD — decisão de escopo de suas próprias Waves (Release 1.7), não revisitada aqui.
- Nenhuma persistência de "preço convertido" existe ou deveria existir — todo consumidor futuro deve chamar `convert()` sob demanda, nunca cachear um preço convertido além do TTL de 60s do próprio `ExchangeRateCache`.
