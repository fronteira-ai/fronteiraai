# Product Identity Decision Report

**Fase 2 — Sprint 2.7.** Relatório-síntese: junta `PRODUCT_IDENTITY_FLOW_AUDIT.md`, `CANDIDATE_RANKING_ANALYSIS.md`, `CROSS_MERCHANT_SIMULATION.md` e `PRODUCT_IDENTITY_EVOLUTION_OPTIONS.md` em uma única resposta à pergunta de encerramento: **o comportamento atual do Product Identity deve permanecer ou evoluir?**

## A hipótese com que a Sprint começou

Sprint 2.6 observou 1.211 novos `merge_candidates`, todos intra-loja, zero cross-merchant, e formulou uma hipótese estrutural: `ProductIdentityEngine.evaluate()` mantém só o candidato de maior score por fonte (`ProductIdentityEngine.ts:243-259`), então um duplicata intra-loja mais forte poderia estar enterrando, sem log, um candidato cross-merchant genuíno mas mais fraco, para a mesma fonte.

## O que a auditoria e a simulação mostraram

A hipótese estava **testável diretamente** — bastava reconstruir o ranking completo (não só o vencedor) usando o próprio `ProductIdentityEngine.evaluate()`, real e sem alterações, chamado uma vez por par em vez de uma vez por fonte. Foi feito em duas escalas:

- **Amostra estratégica** (7 famílias, 1.151 canonical products fonte, 543.815 pares avaliados).
- **Marketplace inteiro** (18.010 canonical products, 852 brands, 11.277.298 pares avaliados — 595 brands exaustivo + bucket "Outros" amostrado e escalado).

**Resultado, nas duas escalas: zero pares cross-merchant atingiram o threshold "possible" (70), em qualquer simulação, sob qualquer política de persistência (A/B/C/D).** O maior score cross-merchant observado em toda a base foi 65, ainda abaixo do threshold. A hipótese está **refutada por medição direta, não por raciocínio** — não é que os candidatos cross-merchant certos estejam sendo descartados pelo ranking; é que eles nunca chegam perto de qualificar, com os dados que `canonical_products` tem hoje.

## Causa raiz real, também medida (não assumida)

Rastreando por que os 4.117.680 pares cross-merchant avaliados falharam:

1. **99,3% (4.089.817 pares)** foram capados em 40 pelo gate de categoria (`categoryId` diverge entre lojas) — a Sprint 2.5 normalizou taxonomia em `products`, mas **nunca em `canonical_products`**, e é `canonical_products.category_id` que o `CanonicalMergeSuggestionService` usa.
2. **0,7% (27.863 pares)** passaram o gate mas ficaram abaixo de 70 por falta de pontuação em `specifications` (peso até 30) e/ou `name-similarity` (peso até 50). O caso de maior score da base inteira (65 — mesmo iPhone 17 Pro Max, duas lojas, brand+categoria+nome+modelo batendo) fica sem pontuar em `specifications` porque **essa é uma amostra representativa de um problema mais amplo, medido separadamente nesta Sprint**: `CanonicalProductService.bootstrapFromProduct` nunca atualiza uma linha de `canonical_products` já existente (`findOrCreateBySlug` só cria; se já existe, retorna como está). Amostra real de 30 canonical products "iPhone 17 Pro Max": 87% com `specifications` vazio, 57% com o `products` de origem estritamente mais rico — ou seja, o enriquecimento de specifications feito nas Sprints 2.5/2.6 melhorou `products`, mas nunca chegou a `canonical_products` para as linhas que já existiam antes do backfill.

Nenhuma dessas duas causas está na etapa de ranking ou na política de persistência — estão a montante, na qualidade e no frescor dos dados que chegam ao `ProductIdentityEngine`.

## Simulação dos 4 cenários pedidos

| Cenário | Persistidos (marketplace) | Cross-merchant | CPC estimado | Custo operacional extra |
|---|---:|---:|---:|---|
| A — atual (só o melhor) | 1.968 | 0 | 6 (sem mudança) | baseline |
| B — 1 intra + 1 cross | 1.968 | 0 | 6 (sem mudança) | nenhum |
| C — top-3 ≥ threshold | 3.374 | 0 | 6 (sem mudança) | +71% na fila de revisão, 0 ganho |
| D — todos ≥ threshold | 4.211 | 0 | 6 (sem mudança) | +114% na fila de revisão, 0 ganho |

Detalhe completo em `CROSS_MERCHANT_SIMULATION.md`.

## Recomendação (Objetivo 5): **A — o comportamento atual deve permanecer**

Como conclusão testada, não como ausência de investigação. Detalhamento e riscos em `PRODUCT_IDENTITY_EVOLUTION_OPTIONS.md`. A evolução real necessária não está nas 4 opções do brief — está em duas correções de dados anteriores ao ranking (normalização de `canonical_products.category_id`, refresh de `canonical_products.specifications` quando `products` é reenriquecido), preparadas como base técnica para a Sprint 2.8 mas **não implementadas nesta Sprint**, conforme restrição.

## Achado adicional fora do escopo original (registrado, não perseguido nesta Sprint)

`CanonicalMergeSuggestionService`, mesmo hipoteticamente corrigido, não move CPC sozinho: `IMergeCandidateRepository` não tem nenhum método de execução de merge (`updateStatus` só muda o `status` do candidato, nunca reatribui offers nem funde canonical products). Um `MergeCandidate` aprovado hoje fica `Approved` e nada mais acontece. Isso não invalida a recomendação acima (B/C/D continuariam sem gerar candidato cross-merchant algum mesmo com um executor de merge), mas é um pré-requisito que qualquer trabalho real de CPC via merge (diferente do mecanismo de coincidência de nome-string já documentado desde a Sprint 2.3) vai precisar endereçar depois da correção de dados.
