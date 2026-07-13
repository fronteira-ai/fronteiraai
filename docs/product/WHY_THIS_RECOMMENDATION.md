# WHY_THIS_RECOMMENDATION.md
# RELEASE 2.0 — Experience Iteration 2 (EI-2) — Best Deal Experience

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Propósito**: explicar, em linguagem que um comprador entenderia, exatamente como o ParaguAI chega à recomendação "Best Deal" — e servir de base literal para uma futura IA Conversacional (Objetivo 8): cada frase abaixo já é o texto que `BestDealComposer` produz hoje, não uma aspiração futura.

---

## 1. A pergunta que este documento responde

> "Se eu fosse comprar este produto hoje, por que o ParaguAI recomenda esta loja?"

A resposta nunca é "porque sim" nem "porque tem o menor preço" isoladamente. É sempre uma combinação nomeada de fatores, cada um rastreável a um serviço real.

## 2. O caminho de decisão, passo a passo

### Passo 1 — Existe uma comparação possível?

O ParaguAI primeiro verifica se o produto que o comprador está vendo já foi identificado como o mesmo produto real vendido em outras lojas (Product Identity / Canonical Catalog). Se ainda não foi (o que hoje é comum — ver `docs/product/CATEGORY_CLUSTER_MATRIX.md`/`TAXONOMY_ARCHITECTURE_RECOMMENDATION.md` sobre por que o cross-merchant matching ainda está em maturação), o ParaguAI não inventa uma comparação — mostra o que existe e aguarda mais dado.

### Passo 2 — Ranquear as ofertas reais

Para cada loja que vende esse produto, o `OfferRankingService` (já existente desde o Release 1.8) calcula uma pontuação 0-100 considerando 5 fatores, cada um com peso fixo e documentado:

| Fator | Peso máximo | O que significa |
|---|---:|---|
| Preço | 40 | Quão perto esta oferta está do menor preço entre as comparadas |
| Disponibilidade | 20 | Se o produto está em estoque agora |
| Atualização recente | 15 | Há quanto tempo o preço foi confirmado |
| Confiança da loja | 15 | Se a loja tem um selo de verificação ativo |
| Qualidade do anúncio | 10 | Se a oferta tem condição, garantia e link informados |

A loja com a maior pontuação é a recomendação — nunca escolhida por preço isolado.

### Passo 3 — Explicar, não apenas afirmar

O ParaguAI nunca diz apenas "esta é a melhor loja". Ele diz: **"Esta loja foi recomendada porque:"**, seguido de uma lista — e cada item da lista é uma evidência real, não uma frase genérica:

- *"Menor preço — USD 65.9 vs. lowest USD 65.9 among compared offers"* (do `OfferRankingService`)
- *"Estoque disponível — in stock"* (do `OfferRankingService`)
- *"Loja de confiança — store is verified"* (da checagem de badge em `trust/`)
- *"Atualização recente — Preço confirmado agora mesmo"* (do `FreshnessService`, `realtime-commerce`)
- *"Economia estimada — Até USD 20.00 (20%) mais barato que a loja mais cara"* (do `PriceIntelligenceService`, "Buyer Savings")
- *"Ranking superior — 1º lugar entre 3 ofertas comparadas, pontuação 88/100"* (o resultado final do Passo 2)

Cada uma dessas seis linhas é uma tradução direta de um dado que já existia antes desta Wave — nenhuma foi inventada para soar convincente.

### Passo 4 — E se duas lojas forem quase empatadas?

Quando a diferença entre a 1ª e a 2ª colocada é pequena (5 pontos ou menos, numa escala de 100), o ParaguAI diz isso abertamente, em vez de fingir uma certeza que não tem:

> "Duas ofertas apresentam excelente custo-benefício. A diferença principal está em: confiança da loja (store is verified)."

O "principal diferencial" citado é sempre o fator, entre os cinco do Passo 2, com a maior diferença de peso entre as duas ofertas — nunca uma nova métrica inventada para a ocasião.

### Passo 5 — Contexto de câmbio, nunca conversão

Como o comprador pode estar pensando em Reais, o ParaguAI mostra a cotação USD/BRL do momento, com a fonte e a data em que foi capturada (`ExchangeRateService`). Isso é só contexto — o preço exibido nunca é recalculado ou convertido, permanece exatamente o valor em USD que a loja informou.

## 3. O que o ParaguAI nunca faz nesta recomendação

- Nunca inventa um número. Todo valor no card "Best Deal" tem uma origem identificável (ver tabela de fatores acima e `docs/product/DECISION_LAYER.md` §2).
- Nunca usa um modelo de linguagem para gerar a explicação — o texto é montado a partir de templates fixos sobre dados reais, a mesma disciplina já usada em todo o conteúdo de SEO do ParaguAI (`RELEASE_1_8_BLUEPRINT.md` Capítulo 7: "conteúdo gerado programaticamente deve sempre ser lastreado em dado real").
- Nunca esconde a incerteza. Quando duas ofertas empatam, o ParaguAI diz que empataram — não escolhe arbitrariamente uma para parecer mais decidido.
- Nunca altera o preço, o estoque ou a classificação de confiança — apenas os expõe.

## 4. Por que este documento existe (base para IA Conversacional)

O objetivo de longo prazo do ParaguAI (`docs/foundation/VISION_2035.md`, `STRATEGIC_ASSETS.md` — Future Asset F-3 Semantic Knowledge / F-1 Recommendation Model Knowledge) inclui uma interface conversacional que responda perguntas de compra em linguagem natural. Este documento é o roteiro literal que essa interface seguiria: cada "Passo" acima já corresponde a uma chamada de método real (`BestDealComposer.compose()`, `ComparisonIntelligenceComposer.composeForSlug()`) — uma IA Conversacional futura não precisaria inventar um novo raciocínio, apenas verbalizar, em linguagem mais natural, exatamente os mesmos cinco passos e as mesmas seis evidências já produzidas por este código. Isso mantém a mesma garantia de explicabilidade e ausência de alucinação que todo o resto da plataforma já exige.
