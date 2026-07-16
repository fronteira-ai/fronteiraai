# KNOWLEDGE_GRAPH_ROADMAP.md
# Program Π (Pi) — Mission Π-1 — Product Knowledge Graph

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Metodologia**: toda projeção abaixo é uma simulação reproduzível sobre dado real de produção (17.983 `canonical_products` ativos, 18.015 `offers`), nunca opinião. Script read-only, descartado após uso — agrupa por `(brand_id, manufacturerCode)` e `(brand_id, model)` usando `buildProductSignature`/`extractManufacturerCode` reais e inalterados (Program Κ-3), mede o histograma de lojas por grupo resultante.

---

## 1. Marketplace Growth Projection (Objetivo 8) — simulação, não opinião

| Cenário | Grupos com 2+ lojas | 3+ | 4+ | 5+ |
|---|---:|---:|---:|---:|
| **BASELINE real (hoje, via `canonical_product_id`)** | 14 | 0 | 0 | 0 |
| **Simulação A — agrupado por (marca + `manufacturerCode` real extraído, 53,63% de cobertura)** | **397** | **36** | **3** | 0 |
| **Simulação B — agrupado por (marca + `model` normalizado real, 3,18% de cobertura, hoje só Apple)** | 31 | 13 | 1 | 0 |

**Leitura**: a Simulação A é **28,4x** o Comparable Coverage real de hoje, usando exclusivamente um campo já extraído por código já existente (`extractManufacturerCode`, Program Κ-3) — nenhum dado novo, nenhuma migration, nenhum merchant novo. Não é o teto teórico (EAN/GTIN reais elevariam ainda mais, mas esse dado não existe — medido 0% em `ATTRIBUTE_COVERAGE_REPORT.md`) — é o teto real alcançável com o que já está construído.

A Simulação B mostra o padrão inverso e igualmente importante: baixíssima cobertura (3,18%) mas altíssima densidade relativa (42% dos grupos formados chegam a 3+ lojas, contra 9% na Simulação A) — confirma que `model` normalizado, quando existe, é um sinal mais preciso que `manufacturerCode`; o problema de `model` é cobertura (só Apple), não qualidade.

## 2. O que essas simulações não são

Não são uma promessa de que a produção atingirá exatamente 397 produtos comparáveis — o Engine real ainda exige marca+categoria batendo, então o resultado de produção fica **entre** o baseline (14) e o teto simulado (397), nunca acima dele (`PRODUCT_IDENTITY_V2.md` §4). Rotulado explicitamente como simulação, nunca misturado com o número real de produção.

## 3. Executive Recommendation (Objetivo 10) — ordenado por ROI medido, nunca por complexidade

| Ordem | Ação | Esforço | Evidência de ROI |
|---|---|---|---|
| **1** | **Elevar `manufacturerCode` a insumo de identidade de primeira classe** (`PRODUCT_IDENTITY_V2.md`) | Wiring, mesmo padrão de Κ-4 — sem algoritmo novo | Teto medido de 397 grupos 2+ (28x hoje) sobre 53,6% de cobertura já existente — maior ROI de qualquer ação nomeada em qualquer Mission anterior deste programa |
| **2** | **Expandir `normalizeAppleModelToken` para outras marcas de alto volume** (não implementado nesta Mission — nomeado como oportunidade) | Médio — normalizador análogo por marca, mesma disciplina determinística (Κ-2) | Simulação B mostra que `model` é mais preciso que `manufacturerCode` (42% vs 9% chegam a 3+ lojas) — cobrir mais marcas multiplica esse efeito de qualidade, não só de volume |
| **3** | **Processar a fila real de 99 candidatos cross-merchant já gerada (Mission OPS-1)** | Zero — só revisão humana, ferramenta já existe | Já em execução — 8/99 já processados com sucesso (`CROSS_MERCHANT_ACTIVATION_PILOT.md`), resto é fila, não projeto |
| 4 | Modelar Família/Linha como novo nível de taxonomia (`PRODUCT_KNOWLEDGE_GRAPH.md` §2) | Alto — decisão de design nova, provavelmente exige schema | Habilitaria 8 dos 13 relacionamentos hoje impossíveis (§4), mas nenhum deles tem sinal real medido ainda — investimento especulativo comparado a 1-3 |
| 5 | Perseguir EAN/GTIN real via parceria com merchants | Muito alto — depende inteiramente de terceiros | Yield medido de EAN mesmo onde existe é 1,51% — não sustenta uma estratégia de 90 dias sozinho |

**Por que a ordem não segue complexidade**: a ação #1 tem o menor esforço de implementação (é wiring, o mesmo padrão já provado 3 vezes nesta sequência de Missions — Κ-4, OPS-1) e o maior ROI medido — a inversão típica ("fazer o difícil primeiro porque é mais impactante") não se sustenta aqui porque o dado já mostra que o mais barato já é o mais impactante.
