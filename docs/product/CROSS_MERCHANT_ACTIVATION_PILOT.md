# CROSS_MERCHANT_ACTIVATION_PILOT.md
# Marketplace Operations — Mission OPS-1 — Cross-Merchant Activation

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Status**: Execução real completa. Primeira vez, em todo o histórico do ParaguAI, que um merge cross-merchant foi de fato executado em produção — tudo antes desta Mission era simulação (Κ-4/Κ-5/Ψ-1) ou merges intra-merchant (Φ-1).
**Autorização**: CTO, via seleção explícita da opção "Full pipeline, one authorization" antes de qualquer escrita em produção.

---

## 1. Correção de premissa (antes de qualquer execução)

A missão foi recebida com a premissa "Existem 66 candidatos cross-merchant reais." Isso estava impreciso: os 66 candidatos vinham da simulação de Κ-4/Ψ-1 (`ProductIdentityEngine` real, repositórios em memória, **zero escrita em produção**, por desenho). `merge_candidates` em produção continuava com 3.072 pendentes, 0 cross-merchant, idêntico à baseline de Φ-1. Reportado ao CTO antes de agir, com o mecanismo exato (já existente, zero código novo) para tornar os candidatos reais: reexecutar `scripts/canonical-catalog-bootstrap.ts --execute`, que já chama `CanonicalMergeSuggestionService.suggestMergesFor()` (wired desde Κ-4) com repositórios reais.

## 2. Geração real dos candidatos

`npm run canonical-catalog:bootstrap:execute` — 18.010 produtos processados, 0 falhas, 19 ofertas religadas, 18.010 execuções de sugestão de merge. Resultado: fila de `merge_candidates` pendentes foi de **3.072 para 4.595** (+1.523).

## 3. Auditoria e classificação (Objetivo 1)

| Tier | Total pendentes | Dos quais cross-merchant |
|---|---:|---:|
| Alta (≥95%) | 41 | 0 |
| Média (85-94%) | 1.790 | 10 (8 pares distintos — 2 são a mesma dupla na direção reversa) |
| Manual (70-84%) | 2.764 | 89 |
| **Total cross-merchant** | — | **99** (0 Alta / 10 Média / 89 Manual) |

## 4. Seleção do lote piloto (Objetivo 2)

Critério: maior confiança disponível entre os cross-merchant (nenhum Alta existe ainda), sempre cross-merchant (única dimensão que move Comparable Coverage), menor risco (Média 85-89%, todos os 5 fatores do Engine — brand/category/name/specifications/model-number — batendo). Selecionados os **8 pares distintos** de confiança Média; os 2 candidatos que eram a mesma dupla na direção reversa foram rejeitados explicitamente, não deixados pendentes.

## 5. Execução do lote piloto (Objetivo 3)

| | Quantidade |
|---|---:|
| Rejeitados (duplicata reversa) | 2 |
| Aprovados | 8 |
| Executados com sucesso | **8** |
| Falhas de execução | 0 |
| Rollback | **0** |
| Ofertas movidas | 8 (1 por execução) |

Nenhuma falha, nenhum rollback necessário — resultado limpo, via `MergeExecutorService.approve()`/`executeBatch()` reais e inalterados (Program Ω, Mission Ω-1).

## 6. Antes / Depois (Objetivo 4/5) — apenas números reais

| Métrica | Antes | Depois | Δ |
|---|---:|---:|---:|
| Comparable (2+ lojas) | 6 | **14** | **+8** (exatamente as 8 execuções) |
| Comparable (3+ lojas) | 0 | 0 | 0 (merges par-a-par não criam grupos de 3 sem encadeamento) |
| Canonical products com oferta | 17.990 | 18.001 | +11 (19 ofertas religadas pelo bootstrap, líquido de -8 por desativação de source) |
| Offer Density | 1,0003 | 1,0003 | 0 |
| Marketplace Health | 63/100 | 63/100 | 0 (8 execuções não movem nenhum dos 8 fatores individualmente) |
| AI Readiness | 52,6/100 | 52,6/100 (Comparable Products: 0,03%→0,08%, real mas pequeno numa média de 3 termos) | ~0 |
| Merge Queue pendente | 3.072 | 4.585 (4.595 gerados − 8 executados − 2 rejeitados) | +1.513 |

## 7. Impacto real no Buyer Intelligence (Objetivo 6) — exemplos reais, não hipotéticos

Dos 8 produtos que agora têm 2 lojas, 2 mostram economia real não-trivial:

- **"Notebook HP 15-FD0230WM Intel Core i3-N305 15.6" 8GB RAM/256GB"** — mobile-zone US$ 435 vs. atacado-connect US$ 370 (fora de estoque) — **US$ 65 / 14,9% de economia real**, agora visível pela primeira vez.
- **"Cartão de Memória Micro SD SanDisk Nintendo Switch 512GB"** — roma-shopping US$ 120,75 vs. atacado-connect US$ 115 — **US$ 5,75 / 4,8%**.
- Os outros 6 mostram preços iguais ou quase iguais entre as 2 lojas (diferenças de US$ 0,00 a US$ 0,50) — valor real diferente: confirma ao comprador que o preço já é competitivo, não uma economia, mas ainda um sinal de confiança real que não existia antes.

Isso alimenta diretamente `BestDealComposer` (agora tem 2 ofertas reais para escolher a mais barata, antes tinha 1), `ComparisonIntelligenceComposer` (agora tem uma comparação real para montar, antes não tinha nada a comparar) e, por extensão, `OpportunityEngine`/"Achado do Dia" — nenhum desses serviços foi alterado; eles simplesmente agora têm dado real para operar sobre 8 produtos que antes eram estruturalmente incapazes de gerar uma comparação.

## 8. Marketplace Health (Objetivo 7)

Reconfirmado real: **63/100, inalterado**. Esperado — 8 execuções sobre 18.010 produtos não move nenhum dos 8 fatores individualmente (o fator `canonical_catalog` já estava em 100/100; o número de candidatos pendentes citado nele foi atualizado de 3.072 para 4.585, mas isso não afeta o score do fator).

## 9. Próximo lote prioritário (Objetivo 10)

Usando o mesmo critério desta Mission (maior confiança, cross-merchant, menor risco): os **89 candidatos cross-merchant de faixa Manual (70-84%)** são o próximo lote natural — mesma disciplina, requer revisão humana mais cuidadosa por estarem abaixo do piso "Média". Alternativa de maior volume: os **1.780 candidatos Média intra-merchant restantes** (que melhoram qualidade de catálogo, não Comparable Coverage diretamente) podem ser processados em paralelo, sem risco cruzado com o lote cross-merchant.
