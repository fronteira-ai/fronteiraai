# INTELLIGENCE_CARD_LIBRARY.md
# PROGRAM Π (PI) — MISSION Π-1 — Objetivo 5: Primeiros Intelligence Cards

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: desenho de experiência apenas. Nenhum componente, nenhuma rota, nenhum código.
**Regra de composição**: todo card abaixo é uma **leitura formatada** de um serviço já existente — nunca um cálculo novo. Quando um card exigiria um cálculo que não existe hoje, isso é dito explicitamente (§12), porque construí-lo quebraria a restrição central desta Mission ("nenhuma inteligência nova").

---

## 1. Vale Comprar Hoje

**Pergunta que responde ao comprador**: "Este é um bom momento para comprar isto, ou devo esperar?"
**Fonte**: `CanonicalVolatilityProfile` (`market-insights/VolatilityRollupService`) + `CanonicalPriceHistoryService` (`canonical-catalog`).
**Forma**: frase factual, nunca uma previsão — "preço estável nos últimos 90 dias, X% variação" ou "historicamente cai N% em [padrão observado]; hoje está Y% acima/abaixo da média". Mesmo padrão de `explainabilityReason` já usado no `ProductIdentityEngine`.
**Onde**: página de produto, topo, ao lado do preço.

## 2. Preço Justo

**Pergunta**: "Este preço é razoável comparado ao resto do mercado?"
**Fonte**: `PriceStatistics` (mediana, dispersão, faixa) — `market-insights/PriceIntelligenceService`.
**Forma**: "Este preço está X% abaixo/acima da mediana entre N lojas" — nunca um veredito binário sem o número.
**Onde**: card de produto, badge junto ao preço.

## 3. Melhor Oportunidade

**Pergunta**: "Dentre tudo, o que está com a melhor relação preço/confiança agora?"
**Fonte**: `CanonicalMarketMover` (`market-insights/MarketPulseInsightsService`) combinado com `TrustSignalService` como filtro de qualidade (só entra na lista se a loja tiver algum sinal de confiança ativo).
**Forma**: lista/carrossel de produtos, cada item com "caiu X% hoje" + selo de confiança da loja.
**Onde**: Home.

## 4. Economia

**Pergunta**: "Quanto eu economizo escolhendo a loja certa?"
**Fonte**: `SavingsOpportunity` (`market-insights/PriceIntelligenceService`) — `maxSavingsUSD`/`maxSavingsPercent`.
**Forma**: "Economize até US$X (Y%) escolhendo [loja mais barata] em vez de [loja mais cara]".
**Onde**: card de produto e tela de comparação — é o número mais compartilhável desta biblioteca (`FIRST_PREMIUM_FEATURES.md`, Mission Λ-1, já havia identificado isso).

## 5. Preço Abaixo da Média

**Pergunta**: variação da Preço Justo, como gatilho binário em vez de contínuo — "isto está numa faixa boa de preço?"
**Fonte**: mesma `PriceStatistics`, mas usada como condição (`currentPrice < median * 0.9`, por exemplo) para decidir se o selo aparece, em vez de sempre mostrar o número.
**Forma**: selo compacto no card de listagem/busca (onde não há espaço para o texto completo de "Preço Justo").
**Onde**: resultados de busca, grid de catálogo.

## 6. Loja Recomendada

**Pergunta**: "Entre as lojas que vendem isto, qual devo escolher?"
**Fonte**: `OfferRankingService.rank()` (`canonical-catalog`) — fatores já nomeados: preço, disponibilidade, recência, confiança/verificação, qualidade do anúncio.
**Forma**: destaque visual na oferta Nº1 do ranking + os 2-3 fatores que mais pesaram ("melhor preço entre 4 lojas" + "loja verificada" + "atualizado hoje") — nunca um "recomendamos" sem razão.
**Onde**: tela de comparação, topo.

## 7. Maior Confiança

**Pergunta**: "Essa loja é confiável?"
**Fonte**: `TrustSignalService`/`BadgeService`/`MerchantPassportService` (`trust`).
**Forma**: lista de fatos verificáveis (empresa verificada, identidade validada, localização confirmada, parceiro oficial, operação recorrente) — nunca um score único, por decisão de arquitetura permanente ("Zero Reputation Score").
**Onde**: card de oferta (versão resumida — 1-2 selos) e página de loja (versão completa — todos os sinais ativos).

## 8. Preço em Queda

**Pergunta**: "Isto está barateando agora?"
**Fonte**: `ChangeType.PriceDecreased` (`realtime-commerce/MarketChange`) + `BuyerAlertEngine.classify()` (mesma lógica de classificação, sem o envio).
**Forma**: selo temporário "caiu X% há Y dias" no card de produto/oferta.
**Onde**: card de produto, resultados de busca.

## 9. Preço em Alta

**Pergunta**: "Isto está ficando mais caro — não vou esperar mais"?
**Fonte**: `ChangeType.PriceIncreased` (mesma fonte de dado que o card 8, outra direção).
**Forma**: selo "subiu X% há Y dias" — usado com cuidado de produto para não parecer manipulação de urgência (mesma disciplina de nunca fabricar escassez, `PRODUCT_PRINCIPLES.md` — transparência).
**Onde**: card de produto.

## 10. Produto Equivalente

**Pergunta pretendida**: "Este produto exato está caro/esgotado — existe outro equivalente melhor?"
**Status real**: **não reutilizável hoje sem inteligência nova.** Nenhum serviço existente responde "produto A e produto B são equivalentes, mas não idênticos" — `Product Identity`/`Canonical Catalog` resolvem "é o mesmo produto" (identidade), nunca "é um substituto aceitável" (equivalência funcional). A Mission Κ (`docs/product/PRODUCT_IDENTITY_DECISION_REPORT.md`) já mediu isso para o problema mais restrito de matching cross-merchant do mesmo produto — equivalência funcional é uma pergunta ainda mais difícil, sem nenhum dado hoje.
**Implicação**: se este card for priorizado, ele **quebra a restrição desta Mission** ("nenhuma inteligência nova") — precisaria de um mandato próprio (matching por atributo/categoria), não de composição.

## 11. Alternativa Inteligente

**Pergunta pretendida**: "Não tem este produto? Aqui está uma alternativa parecida, mais barata/disponível."
**Status real**: mesma limitação do Card 10 — depende de equivalência funcional, que não existe. Adicionalmente depende da Fase 2 da Universal Taxonomy (relação categoria-pai × variante, `docs/product/CATEGORY_CLUSTER_MATRIX.md`, Mission Κ-1) para não sugerir, por exemplo, uma capinha de celular como "alternativa" a um celular.
**Implicação**: mesma nota do Card 10 — nomeado aqui por completude do mandato, não recomendado para a primeira onda.

## 12. Resumo de reutilização pura vs. quebra de escopo

| Card | 100% reaproveitamento de serviço existente? |
|---|---|
| Vale Comprar Hoje | Sim |
| Preço Justo | Sim |
| Melhor Oportunidade | Sim |
| Economia | Sim |
| Preço Abaixo da Média | Sim |
| Loja Recomendada | Sim |
| Maior Confiança | Sim |
| Preço em Queda | Sim |
| Preço em Alta | Sim |
| Produto Equivalente | **Não** — exige capacidade nova (fora de escopo) |
| Alternativa Inteligente | **Não** — exige capacidade nova (fora de escopo) |

9 de 11 cards nomeados no mandato são 100% compositáveis com o que já existe hoje. Os 2 que não são foram nomeados aqui com a mesma honestidade da `AI_EXPERIENCE_BLUEPRINT.md` (Mission Λ-1) — recusar-se a fingir que "reaproveitamento" resolve um problema que na verdade exige dado novo.

Ver `BUYER_EXPERIENCE_PRIORITIES.md` para o ICE Score de cada card.
