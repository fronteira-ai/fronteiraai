# ATTRIBUTE_COVERAGE_REPORT.md
# Program Π (Pi) — Mission Π-1 — Product Knowledge Graph

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-16
**Metodologia**: medição real, zero estimativa. Dois scripts read-only, descartados após uso: (1) varredura de chave de especificação por padrão regex sobre os 17.983 `canonical_products` ativos; (2) execução real de `buildProductSignature`/`extractManufacturerCode` (Program Κ, Mission Κ-3, inalterados) sobre o mesmo conjunto. Nenhum algoritmo novo, nenhuma migration.

---

## 1. Identifier Audit (Objetivo 1) — nenhum estimado, todos medidos

| Identificador | Presença real (chave de especificação) | % |
|---|---:|---:|
| EAN | 0 | 0,000% |
| GTIN | 0 | 0,000% |
| UPC | 0 | 0,000% |
| MPN | 0 | 0,000% |
| Manufacturer Part Number | 0 | 0,000% |
| Código do fabricante | 0 | 0,000% |
| SKU | 0 | 0,000% |
| Serial | 0 | 0,000% |
| ISBN | 0 | 0,000% |
| ASIN | 0 | 0,000% |
| Código interno da loja | 0 | 0,000% (confirmado também por auditoria de código — nenhum campo `externalId`/`sourceId` existe em `pipeline.types.ts`, nenhum conector captura isso hoje) |
| Código de barras (chave real, nome diferente de "EAN") | 375 | 2,085% |
| Modelo (chave de especificação bruta, texto livre não validado) | 10.326 | **57,421%** |
| **Qualquer chave de identificador presente** | 10.339 | 57,493% |

**Achado central**: nenhum identificador estruturado padrão da indústria (EAN/GTIN/UPC/MPN/SKU/Serial/ISBN/ASIN) existe em nenhum produto do catálogo. O único sinal de identidade real e massivamente presente é a chave "Modelo" — mas é texto livre, nunca validado, nunca normalizado contra um vocabulário oficial (ao contrário de `model` no `ProductSignature`, que é normalizado e mede apenas 3,18%).

## 2. Attribute Coverage (Objetivo 3) — classificação com evidência

| Atributo | Yield real (`ProductSignature`) | Classificação | Justificativa |
|---|---:|---|---|
| `manufacturerCode` | **53,63%** (9.644/17.983) | **Crítico** | Único atributo com yield massivo E que, medido em simulação (`KNOWLEDGE_GRAPH_ROADMAP.md` §Simulação), produz 28x o Comparable Coverage atual — o maior alavancador de identidade já medido no ParaguAI |
| `color` | 30,47% | Importante | Diferenciador de SKU dentro do mesmo modelo — sem ele, variantes de cor são tratadas como o mesmo produto ou produtos diferentes por acaso |
| `bundleIncludes` | 16,47% | Desejável | Ajuda decisão de compra, não identidade de produto |
| `powerW` | 8,81% | Importante (categoria-dependente) | Crítico para eletrodomésticos/eletrônicos de potência, irrelevante para perfumes/moda |
| `voltage` | 7,94% | Importante (categoria-dependente) | Mesmo padrão de `powerW` |
| `processor` | 7,09% | Crítico (categoria-dependente) | Para Informática/Celulares, é o atributo mais discriminante depois do modelo; para outras categorias, N/A |
| `capacityGb` | 6,44% | Crítico (categoria-dependente) | Mesmo padrão — decisivo para eletrônicos de armazenamento, irrelevante fora deles |
| `ramGb` | 3,93% | Importante (categoria-dependente) | Mesmo padrão |
| `model` (normalizado) | 3,18% | Crítico onde existe | Yield baixo porque o normalizador (`normalizeAppleModelToken`) hoje só reconhece Apple — não é um limite do conceito, é um limite de cobertura do normalizador |
| `screenSizeIn` | 4,48% | Importante (categoria-dependente) | — |
| `gpu` | 2,15% | Desejável | Nicho (apenas placas de vídeo/notebooks gamer) |
| `ean` (via chave "Código de barras") | 1,51% | Crítico onde existe, **irrelevante na prática hoje** | Yield real baixo demais para sustentar qualquer estratégia — não é o caminho de 90 dias |

## 3. Extraction Opportunities (Objetivo 4) — medido em `canonical_products.name`, nunca estimado

| Token | Presença real no título | % |
|---|---:|---:|
| Padrão de modelo alfanumérico genérico (ex.: "A3257", "SM-A165F") | 6.107 | **33,96%** |
| Capacidade (`\d+ ?(GB\|TB)`) | 2.311 | 12,85% |
| Tamanho de tela (`\d+(\.\d+)?"`) | 2.503 | 13,92% |
| Cor (PT/ES comuns) | 4.916 | 27,34% |
| RAM (`\d+GB RAM`) | 1.146 | 6,37% |
| Dual SIM | 746 | 4,15% |
| Ano (`20\d\d`) | 209 | 1,16% |
| Geração/Versão | 166 | 0,92% |
| eSIM | 103 | 0,57% |

**Leitura**: o padrão de modelo alfanumérico genérico (33,96% de presença) é consistentemente maior que o yield real de `manufacturerCode` (53,63%, medido via `extractManufacturerCode`, um extrator mais sofisticado que já filtra falsos positivos) — confirma que `manufacturerCode` já captura a maior parte do sinal real disponível nos títulos; o gap entre 33,96% (presença bruta de token) e 53,63% (extração já bem-sucedida) é coerente, não contraditório — o extrator já capta mais que um único padrão regex simples porque combina múltiplos padrões e heurísticas.

## 4. O que isso significa para o Knowledge Graph

Nenhum identificador de padrão de indústria existe hoje — o Knowledge Graph **não pode** ser fundado sobre EAN/GTIN/SKU, porque esse dado simplesmente não existe na fonte (lojas não o publicam, ou os conectores não o capturam — auditoria de código confirma que nem sequer é capturado quando existiria). A fundação real disponível hoje é `manufacturerCode` (extração de texto, já construída, já com yield real de 53,6%) — ver `PRODUCT_KNOWLEDGE_GRAPH.md` e `KNOWLEDGE_GRAPH_ROADMAP.md` para como isso se torna a espinha dorsal da arquitetura proposta.
