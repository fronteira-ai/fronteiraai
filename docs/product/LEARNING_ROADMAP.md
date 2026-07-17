# LEARNING_ROADMAP.md
# Program Ξ (Xi) — Mission Ξ-2 — Marketplace Learning Engine

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Metodologia**: toda projeção é extrapolação sobre proporção real medida hoje (não opinião) — nunca uma suposição nova sobre o futuro.

---

## 1. Learning ROI (Objetivo 7) — medido, não estimado

**O número central**: agrupar os 17.983 `canonical_products` ativos por `brand_id` e aplicar o padrão de acesso real de `CanonicalMergeSuggestionService.suggestMergesFor` (Κ-4, código lido, não alterado) produz **11.224.835 computações de `buildProductSignature`** por passada completa, quando **17.983** seriam necessárias com memoização por produto — **fator de redundância real: 624,2x**.

| Pergunta do Objetivo 7 | Resposta medida |
|---|---|
| Quanto processamento deixará de ser repetido | 11.206.852 computações de assinatura por passada completa (o delta entre 11.224.835 e 17.983) |
| Quanto tempo de sincronização será economizado | Não cronometrado por computação individual (a função é pura, CPU-bound, sub-milissegundo) — o tempo real observado em Mission OPS-1 (>60 min para 18.010 produtos) é dominado por I/O de rede sequencial, não pela extração em si; a Memória elimina a REDUNDÂNCIA de cálculo, não a topologia de rede sequencial (achado diferente, nomeado em `docs/engineering/SCALABILITY_REPORT.md`, Ξ-1, não resolvido por esta proposta) |
| Quanto Product Identity ficará mais rápido | Proporcional ao tamanho do maior coorte de marca — para a marca "Outros" (N=3.054), de 3.054 avaliações de candidato por produto para 1 consulta de memória, por produto, no caso ideal |
| Quanto Merge ficará mais rápido | Não medido — `MergeExecutorService`/`MergeAuditService` já operam sobre `merge_candidates` persistidos, não recalculam nada hoje; nenhum ganho adicional aqui, correto não reivindicar um |
| Quanto Search poderá melhorar | Não mensurável sem a evolução de Search já proposta em `SEARCH_EVOLUTION.md` (Π-1) estar implementada — fora do escopo desta Mission |

## 2. Scalability Simulation (Objetivo 8) — extrapolação sobre proporção real, nunca opinião

A marca "Outros" representa 16,983% do catálogo ativo hoje (3.054/17.983) — assumindo essa proporção se mantém (a única suposição desta simulação, explicitada, não escondida), o custo quadrático medido hoje se projeta assim:

| Catálogo | Fator sobre hoje | Tamanho projetado do maior coorte ("Outros") | Computações de assinatura SE nada mudar (N²) | Computações SE a Memória existir (N) |
|---:|---:|---:|---:|---:|
| 18.010 (hoje, real) | 1x | 3.054 (real) | 9.326.916 (real) | 17.983 (real) |
| 50.000 | 2,8x | ~8.492 | ~72.114.064 | 50.000 |
| 100.000 | 5,6x | ~16.983 | ~288.422.289 | 100.000 |
| 500.000 | 27,8x | ~84.917 | ~7.210.894.889 | 500.000 |
| 1.000.000 | 55,5x | ~169.830 | ~28.842.228.900 | 1.000.000 |
| 5.000.000 | 277,8x | ~849.170 | ~721.000.000.000 | 5.000.000 |

**Qual componente passa a ser o gargalo**: a geração de candidato de merge (`suggestMergesFor` sobre coortes de marca) — já é o gargalo mais severo medido nesta sequência de Missions, e piora quadraticamente, não linearmente, então se torna crítico **antes** dos dois pontos de virada já documentados em `docs/engineering/SCALABILITY_REPORT.md` (Ξ-1): agregação de categoria/marca em memória (50-100 mil produtos) e Merchant Priority Engine (5 milhões de ofertas). Com apenas 2,8x o catálogo atual (50 mil produtos), o desperdício quadrático já multiplica por ~7,7x.

**Qual deixa de ser gargalo**: com a Memória implementada, este deixa de ser um gargalo de escala — vira O(N), a mesma classe de crescimento que Health Engine/Metrics/Alertas já provam suportar indefinidamente (`MARKETPLACE_FOUNDATION_SCALE_AUDIT.md`).

**Qual precisa evoluir**: a topologia de execução sequencial-via-rede (`scripts/canonical-catalog-bootstrap.ts`, chamada real por real, uma por vez) — mesmo com a Memória eliminando a redundância de CÁLCULO, o padrão de UMA chamada de rede real por produto continua existindo para produtos genuinamente novos. Fora do escopo de mudança desta Mission (seria código), nomeado como o próximo gargalo real depois da Memória.

## 3. Executive Recommendation (Objetivo 10) — menor conjunto, ordenado por ROI

| Ordem | Implementação | ROI medido |
|---|---|---|
| **1** | **Learning Repository + Learning Service para `ProductSignature` por produto** (cache por `canonical_product_id`, invalidado por `diffFromProduct`) | Elimina a parcela de redundância que é por-produto — pré-requisito de tudo abaixo |
| **2** | **Learning Store agrupado por (`brand_id`, `manufacturerCode`)** | Elimina o fator 624,2x medido — a mudança de maior ROI absoluto já quantificada em qualquer Mission desta sequência |
| **3** | **Merchant Learning (`MERCHANT_LEARNING.md`)** — memória de padrão de chave por merchant | Elimina retrabalho de mapeamento a cada merchant novo — o único item desta lista cujo ROI cresce com o número de merchants, não com o catálogo |
| 4 | Pattern Learning por recorrência (`PATTERN_LEARNING.md`) | ROI real, mas dependente dos itens 1-3 existirem primeiro — não paralelizável com eles |
| 5 | Topologia de execução paralela/em lote para geração de candidato | Maior esforço (seria código/arquitetura de execução, não só armazenamento) — correto ficar por último, mesmo sendo o próximo gargalo real após a Memória |

**Por que isso satisfaz "sem aumentar trabalho humano" (Quality Gate)**: nenhum dos 5 itens adiciona uma fila de decisão nova — todos removem trabalho computacional redundante que hoje acontece silenciosamente, sem nenhum humano no loop, então removê-lo também não retira nenhum humano de lugar nenhum.
