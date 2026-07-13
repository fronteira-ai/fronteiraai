# Cross-Merchant Simulation — Cenários A/B/C/D

**Fase 2 — Sprint 2.7 — Objetivos 3 e 4.** Simulação em memória, sem escrita, marketplace inteiro (não só a amostra estratégica). Script: `scripts/sprint27-identity-simulation.ts --mode=marketplace`.

## Escopo e método

- **852 brands** distintos em `canonical_products` (18.010 linhas). **596 têm ≥2 produtos** (elegíveis a formar par).
- **595 brands "reais"** processados de forma **exaustiva** (todo par direcional avaliado com o `ProductIdentityEngine.evaluate()` real, sem amostragem) — cobre 14.946 dos 18.010 canonical products (83%).
- O bucket **"Outros"** (brand catch-all para produtos sem marca resolvida, 3.064 canonical products — 17% do catálogo) foi **amostrado** (500 de 3.064 fontes, contra o cohort completo) e escalado ×6,13 para a estimativa marketplace-wide, porque avaliação exaustiva desse bucket sozinho custaria 9,4M dos 11,3M pares totais (83% do custo computacional) por um grupo que **por definição não representa marcas reais** — dois produtos de marcas genuinamente diferentes caem no mesmo brand fake "Outros" e passam o gate de marca trivialmente. Isso é registrado como risco à parte, não como parte do cálculo do cenário recomendado (ver seção "Achado colateral" abaixo).
- Total: **11.277.298 pares direcionais avaliados** (4.117.680 cross-merchant, 7.159.618 intra-loja).

## Definição dos 4 cenários (aplicados sobre a mesma lista de candidatos já ranqueada por fonte)

- **A — atual**: 1 candidato por fonte, o de maior confiança, se ≥70.
- **B — 1 intra + 1 cross**: o melhor candidato intra-loja **e** o melhor cross-merchant, cada um se ≥70.
- **C — top-N**: os 3 melhores candidatos ≥70 por fonte.
- **D — todos**: todo candidato ≥70 por fonte, sem limite.

## Resultado agregado (marketplace inteiro)

| Cenário | Candidatos persistidos | Dos quais cross-merchant | Δ vs. Cenário A |
|---|---:|---:|---:|
| A (atual) | 1.968 | **0** | — |
| B (1 intra + 1 cross) | 1.968 | **0** | +0 |
| C (top-3) | 3.374 | **0** | +1.406 (+71%), todos intra-loja |
| D (todos ≥70) | 4.211 | **0** | +2.243 (+114%), todos intra-loja |

**Nenhum cenário produz um único candidato cross-merchant adicional, em escala marketplace inteira.** B é numericamente idêntico a A porque não existe "o melhor candidato cross-merchant ≥70" para adicionar em nenhuma fonte avaliada — a lista de candidatos cross-merchant acima do threshold está vazia em toda a base.

## Objetivo 4 — Análise estatística dos descartados

Dos 4.117.680 pares cross-merchant avaliados:

| Categoria | Contagem | % do total cross-merchant |
|---|---:|---:|
| Reprovados no gate de categoria (score capado em 40) | 4.089.817 | 99,3% |
| Gate passou, mas score final < 70 | 27.863 | 0,7% |
| **Score final ≥ 70** | **0** | **0%** |
| Maior score cross-merchant observado em toda a base | 65 (ainda < 70) | — |

**Quantos dos descartados ultrapassariam o threshold?** Zero, medido diretamente — não é uma extrapolação. **Quantos seriam verdadeiros positivos vs. falsos positivos?** A pergunta é vazia por construção: como nenhum descartado cross-merchant chega perto de 70 mesmo no cenário mais permissivo (D, sem limite de N), não há "quase-candidatos" cross-merchant para julgar. Os 27.863 que passam o gate de categoria mas ficam <70 têm score máximo observado de 65 — mesmo esse teto pertence a um par que é, por inspeção, o **mesmo produto exato** vendido em duas lojas (ver `CANDIDATE_RANKING_ANALYSIS.md`, seção 2) — ou seja, mesmo esse "quase" é plausivelmente um verdadeiro positivo sendo perdido por falta de dados (specifications), não por excesso de rigor do algoritmo.

## Comparação dos cenários nos eixos pedidos

| Eixo | A (atual) | B | C (top-3) | D (todos) |
|---|---|---|---|---|
| **CPC estimado** | 6 (baseline atual) | 6 (sem mudança) | 6 (sem mudança) | 6 (sem mudança) |
| **Merchant Overlap** | 0 pares novos | 0 pares novos | 0 pares novos | 0 pares novos |
| **Falsos positivos esperados (cross)** | 0 (nenhum candidato cross é gerado) | 0 | 0 | 0 |
| **Impacto operacional (fila de revisão humana)** | 1.968 itens Pending | 1.968 itens Pending | 3.374 itens Pending (+71%) | 4.211 itens Pending (+114%), 100% intra-loja, zero ganho de cobertura |
| **Custo computacional** | 1 chamada `evaluate()` por fonte (custo já pago em produção hoje) | ~N chamadas por fonte (uma por candidato) — mesma ordem assintótica, mais overhead de chamada | igual a B | igual a B |

**Por que CPC fica em 6 em todos os cenários, não só nos cross-merchant-zero:** mesmo que um cenário gerasse um `MergeCandidate` cross-merchant, ele nasceria com `status = Pending` e **não existe caminho de execução** que uma aprovação humana dispare para fundir dois canonical products (`PRODUCT_IDENTITY_FLOW_AUDIT.md`, Etapa 6 — `IMergeCandidateRepository` não tem método de merge). CPC só se move hoje por coincidência de nome-string idêntico no bootstrap 1:1 (mecanismo já documentado na Sprint 2.3/2.6), não por `merge_candidates` aprovados. Isso é um fato estrutural independente do algoritmo de scoring, e limita o valor prático de qualquer um dos 4 cenários até que exista um executor de merge — mas não muda a conclusão desta Sprint: mesmo ignorando essa limitação, B/C/D não têm nada para executar, porque não geram candidato cross-merchant algum.

## Custo computacional real medido

A simulação exaustiva (11,28M avaliações via chamadas individuais `evaluate()`, mais custosa que o cenário atual que já é O(cohort) por fonte via uma única chamada em lote) completou em poucos minutos rodando localmente — não é um bloqueio de escala para B/C/D caso viessem a ser adotados no futuro por outro motivo. O gargalo desta análise nunca foi custo computacional.

## Achado colateral: o bucket "Outros" é um risco de falso positivo à parte

3.064 canonical products (17% do catálogo) não têm marca resolvida e caem em um brand sintético "Outros". Isso significa que o **gate de marca (`brandId`), que deveria ser uma proteção dura contra comparar produtos de fabricantes diferentes, é neutralizado por completo dentro desse bucket** — dois produtos de marcas reais diferentes (ex.: um perfume Tous e um perfume Initio, ambos "sem marca resolvida") competem como se fossem da mesma marca. Na amostra de 500 fontes de "Outros", o maior score cross-merchant observado (40, "Perfume Initio..." vs. "Perfume Tous...") já é um alerta: são produtos genuinamente diferentes que só chegaram a comparar porque o gate de marca não pôde operar. Isso não afeta a conclusão do Objetivo 5 (nenhum candidato "Outros" cruza 70 hoje), mas é um risco que **cresce automaticamente** se um cenário mais permissivo (C/D) for adotado no futuro — vale registrar para a Sprint 2.8, não para decisão de brand-resolution (fora de escopo aqui).
