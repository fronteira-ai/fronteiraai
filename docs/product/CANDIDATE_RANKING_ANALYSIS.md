# Candidate Ranking Analysis

**Fase 2 — Sprint 2.7 — Objetivo 2.** Ranking completo (não só o vencedor) para as 7 famílias estratégicas, usando o `ProductIdentityEngine.evaluate()` real e não modificado — chamado uma vez por par `(fonte, 1 candidato)` em vez de uma vez por `(fonte, todos os candidatos)`, para reconstruir o que `suggestMergesFor` descarta silenciosamente. Nenhum código foi alterado; nenhum `MergeCandidate` foi criado. Script: `scripts/sprint27-identity-simulation.ts --mode=strategic` (não versionado no `package.json`, reexecutável).

## Metodologia

Para cada canonical product de uma família estratégica, buscamos todo o cohort do mesmo `brand_id` (exatamente a mesma query que `findByBrandId` usa em produção) e avaliamos **cada** candidato individualmente contra a fonte. Um par é classificado **cross-merchant** se a união das lojas que vendem a fonte e o candidato (via `offers.canonical_product_id` → `offers.store_id` → `stores.slug`) tem 2+ lojas distintas; caso contrário é **intra-loja**.

## Resultado por família

| Família | Fontes | Pares avaliados | Intra-loja | Cross-merchant | Cross reprovado no gate categoria (cap 40) | Cross passou gate mas <70 | **Cross ≥ 70** | Maior score cross observado |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| iPhone | 401 | 152.399 | 62.423 | 89.976 | 89.641 (99,6%) | 335 | **0** | 57 |
| Samsung Galaxy | 244 | 139.897 | 42.955 | 96.942 | 95.863 (98,9%) | 1.079 | **0** | 45 |
| MacBook | 91 | 81.597 | 27.237 | 54.360 | 53.998 (99,3%) | 362 | **0** | 44 |
| AirPods | 31 | 37.539 | 8.819 | 28.720 | 28.690 (99,9%) | 30 | **0** | 44 |
| Apple Watch | 52 | 25.190 | 10.036 | 15.154 | 14.226 (93,9%) | 928 | **0** | 44 |
| PlayStation | 155 | 38.191 | 13.654 | 24.537 | 24.243 (98,8%) | 294 | **0** | 45 |
| Nintendo Switch | 177 | 69.002 | 37.493 | 31.509 | 31.372 (99,6%) | 137 | **0** | 43 |
| **Total** | **1.151** | **543.815** | **202.617** | **341.198** | **338.033 (99,1%)** | **3.165 (0,9%)** | **0 (0%)** | **57** |

**Nenhum par cross-merchant, em nenhuma das 7 famílias, atingiu o threshold "possible" (70) uma única vez, em 341.198 avaliações.** O maior score cross-merchant observado em toda a amostra estratégica é 57 (iPhone 17 Pro Max, mesma variante, duas lojas diferentes) — 13 pontos abaixo do threshold.

## Quantos candidatos "vencem" hoje (Cenário A) por família, e são todos intra-loja

| Família | Vencedores ≥70 (Cenário A) | Dos quais cross-merchant |
|---|---:|---:|
| iPhone | 87 | 0 |
| Samsung Galaxy | 83 | 0 |
| MacBook | 2 | 0 |
| AirPods | 0 | 0 |
| Apple Watch | 6 | 0 |
| PlayStation | 10 | 0 |
| Nintendo Switch | 12 | 0 |
| **Total** | **200** | **0** |

## Por que os candidatos foram descartados (com exemplos reais)

### 1. Gate de categoria (99,1% dos descartes cross-merchant)

`categoryId` é um UUID por loja; cada conector persiste sua própria taxonomia sem normalização cruzada em `canonical_products.category_id` (a normalização de categoria da Sprint 2.5 atua em `products`, não em `canonical_products` — ver `PRODUCT_IDENTITY_DECISION_REPORT.md`). Quando `categoryId` diverge, `confidenceFromFactors` capa o score em 40 (`MISMATCH_CAP`), **21 pontos abaixo do gate mesmo antes de qualquer diferença de nome ou especificação**. Exemplo real (iPhone, top-1 cross-merchant da amostra):

> `"Apple iPhone 17 Pro Max LL/A3257 ESIM 256GB..." (atacado-connect)` vs `"Apple Iphone 17 Pro CPO 256GB..." (mobile-zone)` — `conf=33`, `mismatched=[category,name-similarity,specifications]`.

### 2. Gate passa, mas nome + specifications não fecham a conta (0,9% dos casos cross-merchant, e ainda assim zero cruza o threshold)

Quando `categoryId` efetivamente coincide entre lojas (raro, mas acontece — 3.165 pares na amostra), o score fica sujeito ao name-similarity (peso 50) e specifications (peso 30). O melhor exemplo da amostra inteira:

> **iPhone 17 Pro Max, mesmo A3257/256GB/Silver, duas lojas diferentes — score 57.** `matched=[brand,category,name-similarity,model-number]`. **`specifications` não contribuiu** — o par tem `matched` em 4 dos 5 fatores e ainda assim fica 13 pontos abaixo do threshold porque a contribuição de `specifications` (até 30 pontos) foi zero.

Isso implica algo mais específico que "os nomes são diferentes": mesmo quando marca, categoria, nome e modelo **todos** batem, falta exclusivamente o fator `specifications` para cruzar 70 — porque (achado independente desta Sprint, ver `PRODUCT_IDENTITY_DECISION_REPORT.md`) a maioria dos `canonical_products.specifications` está congelada vazia desde o primeiro bootstrap, mesmo quando `products.specifications` já foi enriquecido.

### 3. Intra-loja: os únicos que hoje viram MergeCandidate

Os 200 vencedores atuais (Cenário A) são pares dentro da mesma loja — normalmente a mesma variante listada duas vezes com nome quase idêntico e a mesma linha de `products`, então `specifications` já bate (foi copiada da mesma fonte). Exemplo Nintendo Switch: `"Console... Splatoon 3 Especial Edition..."` vs `"Console... JP de 7.0..." "` — ambos `mega-eletronicos`, `conf=55`, único fator ausente é `specifications` parcial.

## Conclusão do Objetivo 2

A pergunta original da Sprint ("quantos seriam descartados por serem cross-merchant, escondidos atrás de um vencedor intra-loja?") tem uma resposta mensurável e definitiva: **zero, em qualquer família estratégica.** Não existe, hoje, um candidato cross-merchant "quase certo" sendo enterrado por um candidato intra-loja mais forte — o candidato cross-merchant nunca chega perto do threshold para começo de conversa. A causa raiz não está na etapa de ranking (Passo 3 do `PRODUCT_IDENTITY_FLOW_AUDIT.md`); está a montante, na qualidade dos dados que chegam à etapa de scoring (`categoryId` e `specifications` de `canonical_products`).
