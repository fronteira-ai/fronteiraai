# Product Identity Evolution Options

**Fase 2 — Sprint 2.7 — Objetivo 5.** Recomendação arquitetural, com as 4 opções do brief avaliadas explicitamente contra a evidência de `CANDIDATE_RANKING_ANALYSIS.md` e `CROSS_MERCHANT_SIMULATION.md`.

## As 4 opções, avaliadas

### A — O comportamento atual (persistir só o melhor candidato) deve permanecer

**Evidência a favor**: os Cenários B, C e D foram simulados marketplace inteiro (11,28M pares) e **nenhum produz um único `MergeCandidate` cross-merchant a mais que o Cenário A**. Mudar a política de persistência não recupera CPC nenhum, porque não existe candidato cross-merchant acima do threshold para essa política escolher entre. B/C/D só adicionam 71%-114% mais candidatos intra-loja — mais fila de revisão humana, zero ganho de cobertura comparável.

**Evidência contra**: nenhuma encontrada nesta Sprint. A hipótese motivadora ("um vencedor intra-loja está enterrando um candidato cross-merchant válido") foi testada diretamente e refutada com dados reais, não com raciocínio.

### B — Persistir 1 candidato intra-loja + 1 cross-merchant

**Rejeitada pela evidência**: numericamente idêntica ao Cenário A em todo o marketplace (1.968 candidatos, 0 cross em ambos), porque a lista de candidatos cross-merchant ≥70 está vazia em toda fonte avaliada. Implementá-la teria custo de engenharia real (mudar `CanonicalMergeSuggestionService.suggestMergesFor` para reter 2 vencedores em vez de 1, mudar o schema de decisão) por um benefício medido de zero.

### C — Persistir os N melhores candidatos acima do threshold

**Rejeitada pela evidência**: +1.406 candidatos (+71%) sobre o Cenário A, 100% intra-loja. Aumenta a fila de revisão humana sem mover CPC. Seria uma escolha defensável se o objetivo fosse "higiene de catálogo dentro da mesma loja" (achar duplicatas do mesmo merchant) — mas esse não é o objetivo desta Sprint nem da métrica CPC.

### D — Persistir todos os candidatos acima do threshold

**Rejeitada pela evidência**: +2.243 candidatos (+114%) sobre o Cenário A, 100% intra-loja, mesmo resultado de CPC. É estritamente pior que C no eixo operacional pelo mesmo ganho de cobertura comparável (zero).

## Recomendação: **A — o comportamento atual deve permanecer**

Não como "não fizemos nada porque está tudo bem", mas como uma conclusão testada: a pergunta "o Product Identity precisa evoluir?" tem resposta **sim**, mas a evolução certa não é nenhuma das opções B/C/D do brief — é a camada anterior ao ranking. Ver `PRODUCT_IDENTITY_DECISION_REPORT.md` para a base técnica preparada (sem implementação nesta Sprint, conforme restrição) para a Sprint 2.8:

1. **`canonical_products.category_id` não é normalizado entre lojas** — responsável por 99,3% dos descartes cross-merchant (score capado em 40 antes mesmo de considerar nome ou specifications). A Sprint 2.5 normalizou categoria em `products`; `canonical_products` nunca recebeu o mesmo tratamento.
2. **`canonical_products.specifications` fica congelado no primeiro bootstrap** — `CanonicalProductService.bootstrapFromProduct` (via `findOrCreateBySlug`) nunca atualiza uma linha existente, mesmo quando o `products.specifications` correspondente foi enriquecido depois (Sprint 2.5/2.6). Medido: 87% dos canonical products "iPhone 17 Pro Max" amostrados têm `specifications` vazio, 57% com o `products` de origem estritamente mais rico. O maior score cross-merchant já observado na base inteira (65, par com brand+categoria+nome+modelo batendo) fica exatamente sem o fator `specifications` — é o caso mais próximo de um ganho real de CPC hoje, e está sendo perdido por dado congelado, não por rigor do algoritmo.

Essas duas causas, não a política de persistência, são o que efetivamente barra hoje a passagem do threshold de 70 para qualquer par cross-merchant no marketplace inteiro.

## Riscos de reabrir esta questão sem tratar a causa raiz

Se uma Sprint futura implementar B, C ou D **antes** de corrigir a normalização de categoria e o refresh de specifications em `canonical_products`, o resultado observável será idêntico ao medido aqui: nenhum ganho de CPC, mais volume de revisão. Pior: se a correção de `category_id`/`specifications` for feita **e** um cenário permissivo (C/D) for adotado ao mesmo tempo, o bucket "Outros" (marca não resolvida, gate de marca neutralizado, ver `CROSS_MERCHANT_SIMULATION.md`) passa a ser a fonte dominante de risco de falso positivo — vale endereçar resolução de marca antes de afrouxar a política de persistência.
