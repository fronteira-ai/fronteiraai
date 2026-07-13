# CATEGORY_CLUSTER_MATRIX.md
# PROGRAM Κ (KAPPA) — MISSION Κ-1 — Objetivo 3: Clusterização

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Fonte de dado**: saída de `scripts/kappa1-category-similarity.ts` (`CATEGORY_SIMILARITY_ANALYSIS.md`) após revisão manual de domínio PT/ES (§4 daquele documento). Nenhuma categoria foi criada, renomeada ou fundida no banco — esta é uma matriz de classificação, não uma migração.

---

## 1. As 4 categorias pedidas pelo mandato

| Bucket | Definição operacional | Contagem |
|---|---|---:|
| **Únicas** | Nenhum edge de nenhum tier (Alta/Média/Ambígua) toca a categoria — conceito genuinamente sem par no marketplace hoje. | 463 / 921 (50,3%) |
| **Equivalentes (validadas)** | Cluster de tier Alta (lexScore ≥0,60), confirmado por revisão manual — deveriam compartilhar 1 identidade canônica. | 66 clusters, 152 categorias |
| **Ambíguas** | Par com sinal lexical parcial (0,35–0,60) sem confirmação suficiente — majoritariamente pares "categoria-pai × acessório/variante", nunca devem virar merge flat. | 377 pares (tocando ~288 categorias que não entram em nenhum cluster Alta) |
| **Exclusivas (fallback, não-taxonômicas)** | Buckets genéricos do merchant de origem, não conceitos de produto — resolvê-las exige reclassificar por nome de produto, não por categoria. | 8 categorias, 3.052 produtos (16,9% do catálogo) |

Números não somam 921 porque uma categoria pode não entrar em nenhum cluster Alta e ainda ter um edge Ambíguo/Média (ex.: `Perfume Feminino` é "única" pela definição de cluster, mas tem um par Ambíguo real com `Perfume`) — ver `CATEGORY_SIMILARITY_ANALYSIS.md` §6.

## 2. Clusters validados (Equivalentes) — lista completa

66 clusters, 152 categorias reais cobertas (8 clusters/13 categorias da saída bruta do script foram descartados na revisão manual — ver §3). Ordenados por produtos combinados:

| # | Categorias do cluster | Produtos combinados |
|---:|---|---:|
| 1 | Celulares, Smartphones, Celular, Celulares e Smartphones | 1.088 |
| 2 | Fone de Ouvido Sem Fio, Fone de Ouvido Com Fio, Fones de Ouvido | 731 |
| 3 | perfumes, Perfume | 430 |
| 4 | Smartwatch, Smartwatches | 343 |
| 5 | Speaker, Speakers, Parlantes | 236 |
| 6 | carregadores, Cargadores | 180 |
| 7 | Tablet, Tablets | 165 |
| 8 | TVs, Televisor, Televisores | 123 |
| 9 | Teclado, Teclados | 122 |
| 10 | Monitor, Monitores | 113 |
| 11 | Accesorios para celulares, Accesorio para Celulares | 105 |
| 12 | Cosmético, COSMÉTICOS | 87 |
| 13 | Mouses, Mouse | 86 |
| 14 | Impressoras, Impresoras | 83 |
| 15 | Colônia & Body Splash, body splash | 82 |
| 16 | Aspiradores, Aspirador, Aspiradora | 71 |
| 17 | Auriculares, Headsets, Headset | 71 |
| 18 | Memoria RAM, Memória RAM para Notebook, Memória RAM para PC | 71 |
| 19 | jogos, Juegos, Games | 67 |
| 20 | Pendrive, Pendrives | 67 |
| 21 | Cuidado personal, Cuidados personales | 67 |
| 22 | Câmeras Fotográficas, Cámaras fotográficas | 66 |
| 23 | Câmeras, CAMARAS | 62 |
| 24 | Controles, Controle | 63 |
| 25 | Cafeteira, Cafetera | 61 |
| 26 | Caixa de Som, caixas de som | 57 |
| 27 | Bolsas y mochilas, Mochilas y Bolsas | 50 |
| 28 | Microfone, microfones, Micrófono, Microfonos | 46 |
| 29 | Roteador, Router | 45 |
| 30 | cartao de memoria e sd, Cartões de Memória, Tarjeta de Memoria | 43 |
| 31 | pilhas e carregadores, Pilhas/Baterias & Carregadores | 38 |
| 32 | Kit Mouse y Teclado, Teclados & Mouses | 37 |
| 33 | Gabinetes, Gabinete | 35 |
| 34 | Nintendo Switch, Jogo para Nintendo Switch | 34 |
| 35 | Cabos & Adaptadores (TV/Áudio/Automotivo/hubs, 6 variantes) | 33 |
| 36 | Condicionador, Condicionadores | 33 |
| 37 | Projetores, Proyectores, Proyector | 32 |
| 38 | Reloj Femenino, Relojes femeninos | 32 |
| 39 | Processador, processadores, Procesadores | 31 |
| 40 | Accesorios para Notebook, Accesorios p/ Notebook | 29 |
| 41 | placas de video, Placa de Vídeo | 28 |
| 42–66 | (25 clusters adicionais, 2-3 categorias cada, 2-20 produtos) — ver script para lista completa | ~150 |

*Nota sobre a linha 34 (Nintendo Switch): mantida na lista de clusters brutos por completude, mas **excluída da simulação de impacto** (Objetivo 4) — é um par consolerelação pai/filho (console × jogo para o console), não sinônimo. Ver §3.

## 3. Exclusões da revisão manual (8 casos, documentados em `CATEGORY_SIMILARITY_ANALYSIS.md` §4)

Removidos da lista de "clusters validados" usada na simulação de impacto:

1. **Camperas** removida do cluster Câmeras/CAMARAS (jaquetas ≠ câmeras — colisão de edição, não conceito).
2. **Aparadores** removida do cluster Aspiradores (aparador de cabelo ≠ aspirador de pó).
3. **Fritadeira + Frigideira** — cluster inteiro descartado (fryer ≠ frigideira de fogão).
4. **Caldeira + Cadeira** — cluster inteiro descartado (boiler ≠ móvel).
5. **Condimenteros + Condimentos** — cluster inteiro descartado (utensílio ≠ produto).
6. **Estabilizadores + Esterilizadores** — cluster inteiro descartado (elétrico ≠ esterilização).
7. **Nintendo Switch + Jogo para Nintendo Switch** — relação pai/filho (console × jogo), não sinônimo — excluído da simulação de merge flat, mantido como candidato de hierarquia.
8. **Câmeras de Ação + Acessórios para Câmera de Ação** — mesma relação pai/filho, mesmo tratamento.
9. **Apple accesorios + Accesorios para Apple Watch** — relação geral/específico (acessório Apple genérico × acessório específico de um produto Apple) — excluído por precaução, mesmo tratamento.

## 4. Confiança por cluster

Todo cluster listado em §2 (exceto a nota sobre #34) tem confiança **Alta** por definição — é justamente o critério de corte usado (lexScore ≥0,60 confirmado por revisão manual). Não há clusters de confiança "Média" nesta matriz: os 18 pares de tier Média (`CATEGORY_SIMILARITY_ANALYSIS.md` §3) foram deliberadamente mantidos fora do Union-Find (nunca foram "clusters", só pares candidatos) e permanecem como itens de revisão leve — nenhum aparece nesta lista porque nenhum foi confirmado por um segundo sinal forte o suficiente para tratamento igual ao tier Alta.

## 5. O que esta matriz não resolve

Os 377 pares "Ambígua" (`CATEGORY_SIMILARITY_ANALYSIS.md` §5) — o padrão dominante "categoria-pai × acessório/variante" — não têm representação nesta matriz de clusters porque **nenhum union flat é semanticamente correto para eles**. Isso não é uma lacuna de cobertura desta Mission; é a evidência central para a recomendação arquitetural (Objetivo 5): um mapeamento flat resolve §2 inteiramente, mas é estruturalmente incapaz de resolver §5 sem introduzir uma relação pai/filho — ver `TAXONOMY_ARCHITECTURE_RECOMMENDATION.md`.

## 6. Objetivo 4 — Simulação de impacto (aplicando os 66 clusters ao gate de Product Identity)

**Fonte**: `scripts/kappa1-impact-simulation.ts`. Reaproveita literalmente o método da Sprint 2.7 (`scripts/sprint27-identity-simulation.ts`, `docs/product/CROSS_MERCHANT_SIMULATION.md`): o `ProductIdentityEngine.evaluate()` real, chamado par a par, dentro do cohort de cada marca, marketplace inteiro (595 brands reais exaustivo + "outros" amostrado 500/3.054 e escalado ×6,11 — **a mesma amostra reutilizada em ambas as rodadas**, para que a única variável entre BASELINE e TREATMENT seja o mapeamento de categoria, não ruído de amostragem). BASELINE usa `canonical_products.category_id` real; TREATMENT substitui, apenas em memória, o `category_id` de cada categoria por seu ID canônico de cluster (§2) — nenhuma escrita no banco em nenhum dos dois casos.

| Métrica | BASELINE | TREATMENT | Δ |
|---|---:|---:|---:|
| Pares cross-merchant avaliados | 1.374.372 | 1.374.372 | 0 (idêntico por construção) |
| Bloqueados no gate de categoria (cap 40) | 1.330.676 | 1.290.503 | **-40.173** |
| Gate passou, score final <70 | 43.696 | 83.867 | +40.171 (quase dobrou) |
| Score final ≥70 (candidato real) | **0** | **2** (1 par não-direcional) | **+2** |
| Maior confiança cross-merchant observada | 65 | 70 | +5 |
| Candidatos persistidos hoje (Cenário A, best-per-source ≥70) | 3.289 | 3.292 | +3 (+0,09%) |

### O único par que passou a qualificar — inspecionado, é um verdadeiro positivo real

> "Memória RAM para PC 8GB Keepdata KD32N22 8G DDR4 de 3200MHz - Verde" **vs** "Memoria RAM para PC Keepdata KD32N22/8G de 8GB DDR4/3200MHz - Verde" — conf=70, matched=[brand, category, name-similarity, model-number]

Mesma marca (Keepdata), mesmo modelo (KD32N22/8G), mesma especificação (8GB DDR4 3200MHz), mesma cor (Verde), duas lojas diferentes — um produto genuinamente idêntico que estava bloqueado só porque uma loja usa a categoria `Memoria RAM` e a outra `Memória RAM para PC` (cluster #18, §2). Isso confirma, com um caso real e verificado (não hipotético), que o mapeamento de categoria **desbloqueia matches genuínos que o Product Identity já saberia pontuar corretamente** — o gate de categoria, não o scoring de nome/spec, era o único obstáculo neste caso.

### Leitura honesta do tamanho do efeito

1. **O impacto é real, mas pequeno em volume**: 2 pares direcionais (1 par de produto) em 1,37M pares avaliados. A normalização de categoria **remove um bloqueio artificial para ~40 mil pares**, mas a maioria desses continua abaixo de 70 depois de desbloqueada — confirma o achado da Sprint 2.7: o gargalo secundário (depois da categoria) é a pobreza de `specifications`/nome, não o algoritmo de scoring.
2. **CPC não se move de forma perceptível** (Cenário A: +3 candidatos em 3.289, +0,09%) — consistente com o fato, já estabelecido pela Sprint 2.7, de que **não existe hoje um executor de merge** (`IMergeCandidateRepository` não tem método que funda `canonical_products`); mesmo um `MergeCandidate` cross-merchant novo nasceria `Pending` e não moveria CPC sozinho.
3. **Nenhum falso positivo foi introduzido pela normalização nesta simulação** — o único par ≥70 foi inspecionado manualmente acima e é correto. Isso não é garantia geral (categorias com nomes de produto "templated" — ex.: várias linhas de perfume compartilhando texto boilerplate "Perfume ... Eau de Parfum ..." — são um risco conhecido e já registrado pela Sprint 2.7 para o bucket "Outros"; a simulação não encontrou esse caso aqui, mas o risco deve ser monitorado se/quando os 377 pares "Ambígua" forem endereçados por uma solução hierárquica).

Esta simulação embasa diretamente a recomendação de arquitetura (`TAXONOMY_ARCHITECTURE_RECOMMENDATION.md`): o valor de normalizar categoria é real e comprovado, mas **pequeno isoladamente** — o retorno maior vem de resolver, em conjunto, os 377 pares pai/filho (que um mapeamento flat não alcança) e a pobreza de `specifications` (já um achado de Sprints anteriores, fora do escopo desta Mission).
