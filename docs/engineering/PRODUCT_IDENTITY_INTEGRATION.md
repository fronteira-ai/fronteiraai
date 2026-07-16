# PRODUCT_IDENTITY_INTEGRATION.md
# Program Κ — Mission Κ-4 — Product Identity Integration

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-16
**Status**: Wiring implementado, testado (lint 0, typecheck 0, 681/681 testes, build OK), verificado com dados reais de produção. Nenhum `merge_candidates` foi escrito em produção pela verificação (ver §Cross Merchant Evaluation) — só o código de wiring está em produção quando este commit for enviado.
**Ver também**: `docs/engineering/PRODUCT_IDENTITY_PIPELINE.md` (diagrama + auditoria por estágio), `docs/engineering/PROGRAM_K_CLOSURE.md`.

---

## O que foi conectado

Um único arquivo é o ponto de wiring — `src/domains/product-identity/services/CanonicalMergeSuggestionService.ts`, já identificado por seu próprio comentário como "a única ponte entre os dois domínios" desde que foi escrito (Program Ω, Mission Ω-1):

1. **`findNodeByRealCategorySlug`** (`src/domains/taxonomy`, Κ-2) — agora resolve `categoryId` (via um novo lookup em lote, `ICanonicalCatalogRepository.findCategorySlugsByIds`) até o nó da Universal Taxonomy antes de montar o gate de categoria.
2. **`buildProductSignature`** (`src/domains/product-intelligence`, Κ-3) — agora substitui `canonical_products.specifications` bruto pela assinatura normalizada antes de montar o fator de especificações.

**`ProductIdentityEngine.ts` não foi tocado** — mesmo arquivo, mesmos pesos (`NAME_WEIGHT=50`, `SPEC_WEIGHT=30`, `MODEL_WEIGHT=20`), mesmo `MISMATCH_CAP=40`, mesmos thresholds (`auto=95`, `probable=85`, `possible=70`). Verificável por `git diff` — zero linha alterada nesse arquivo.

## Product Signature Integration (Objetivo 2)

`signatureToSpecifications()` (nova função, pura, dentro do arquivo de wiring) achata os campos não-nulos de `ProductSignature` (`model`, `color`, `capacityGb`, `ramGb`, `screenSizeIn`, `processor`, `gpu`, `voltage`, `powerW`, `ean`, `manufacturerCode`, `bundleIncludes`) em um `Record<string,string>` — a mesma forma que o fator `specifications` do Engine já esperava. Substitui, não mescla, o dado bruto — mesma decisão de design que `PRODUCT_INTELLIGENCE_LAYER.md` já documentava como a intenção de Κ-3 ("substitui O QUE é passado para esse campo — nunca COMO ele é comparado").

## Product Identity / Universal Taxonomy Integration (Objetivo 3)

`resolveCategoryGateSlug()` (nova função, pura): `categoryId` (UUID) → `categories.slug` real (novo método de repositório, batch, `findCategorySlugsByIds`) → nó da Universal Taxonomy (`findNodeByRealCategorySlug`, já existia). Fallback disciplinado: se o lookup não encontrar o slug real para um `categoryId`, o próprio `categoryId` é usado como valor do gate — reproduz exatamente o comportamento antigo (igualdade de UUID) para esse caso, em vez de colapsar produtos não resolvidos numa mesma categoria falsa `""`. Só um `categoryId` genuinamente nulo gera `""`, como antes.

**Caminho legado identificado**: `src/domains/connectors/services/stages/ProductIdentityShadowStage.ts` (avaliação de Shadow Mode em tempo de sincronização, por oferta, não por `canonical_products`) permanece **não conectado** à Universal Taxonomy/Product Signature — documentado como duplicidade real em `PRODUCT_IDENTITY_PIPELINE.md`, fora do escopo desta Mission porque não gera `merge_candidates` nem afeta Comparable Coverage.

## Cross Merchant Evaluation (Objetivo 4/5) — MEDIÇÃO REAL vs. SIMULAÇÃO

Metodologia: `CanonicalMergeSuggestionService` real e inalterado, importado sem reimplementação, executado uma vez para cada um dos 17.991 `canonical_products` ativos de produção, com repositórios em memória (dados reais buscados em lote do Supabase; `create()` grava em um array local em vez de `merge_candidates`) — mesma disciplina "código real, dado real, zero persistência" já usada por `scripts/kappa3-cross-merchant-simulation.ts`. **Nenhum `merge_candidates` foi escrito em produção por esta verificação.**

| Métrica | ANTES (Φ-1, produção real, fila de 3.072 já persistida) | DEPOIS (Κ-4, reavaliação completa do catálogo, SIMULAÇÃO não persistida) |
|---|---:|---:|
| Total de candidatos ≥70% | 3.072 (fila acumulada histórica) | **1.920** (recomputação do zero, catálogo inteiro) |
| Alta confiança (≥95%) | 0 | **59** |
| Média (85-94%) | 1.114 | **863** |
| Revisão manual (70-84%) | 1.958 | **998** |
| Cross-merchant | **0** | **66** |
| Intra-merchant | 3.056 | 1.854 |
| Indeterminado | 16 | 0 |
| Produtos distintos numa dupla cross-merchant | 0 | **130** |

A comparação ANTES/DEPOIS não é 1:1 perfeita (ANTES é uma fila acumulada ao longo de várias sincronizações com o gate antigo; DEPOIS é uma recomputação integral com o gate novo, num único instante) — mas o número que importa é qualitativo e inequívoco: **candidatos cross-merchant saíram de 0 para 66**. Antes desta Mission, nenhuma configuração da fila real de produção continha um único candidato que cruzasse lojas; a razão raiz (Product Signature e Universal Taxonomy nunca conectados) está corrigida.

## Comparable Coverage (Objetivo 6)

**MEDIÇÃO REAL** (não mudou, porque nada foi escrito em produção): CPC continua **6/17.990 = 0,03%** — reconfirmado rodando `npm run cpc:report` depois da verificação acima. `npm run observatory:report` reconfirmou Marketplace Health **63/100** e AI Readiness **52,6/100**, idênticos a `MARKETPLACE_OPTIMIZATION.md` (Mission Φ-1). O wiring em si não altera nenhum dado até que `suggestMergesFor` seja de fato chamado em produção (próxima sincronização de conector, ou uma execução em lote autorizada) — coerente com o desenho de Shadow Mode.

**SIMULAÇÃO** (nunca extrapolada além do que a reavaliação mediu; explicitamente não somada aos 6 já reais, já que a sobreposição entre os dois conjuntos não foi verificada): SE todas as 66 duplas cross-merchant acima fossem aprovadas e executadas — decisão humana que este relatório não toma —, union-find sobre as mesmas 66 arestas produziria:

| Threshold | Grupos resultantes (SIMULAÇÃO) | Κ-3 (simulação isolada, Product Signature sozinho, sem Universal Taxonomy) |
|---|---:|---:|
| 2+ lojas | **64** | 199 produtos desbloqueados (projeção) |
| 3+ lojas | **2** | não reportado |
| 4+ lojas | **0** | não reportado |
| 5+ lojas | **0** | não reportado |

O número integrado (64, via o caminho real de produção) é mais conservador que a projeção isolada de Κ-3 (199) — explicação honesta, não uma contradição: a simulação de Κ-3 rodou sobre ~1,3M pares marketplace-wide sem o gate de `brandId` real de produção aplicado da mesma forma estrita que `CanonicalMergeSuggestionService.findByBrandId` aplica aqui, e sem contabilizar que `normalizeBrandName`/`KNOWN_BRAND_DUPLICATES` (também construído em Κ-2) permanece **não conectado** — ver `PROGRAM_K_CLOSURE.md`. O número desta Mission é o que o pipeline real, integrado, hoje realmente produziria.
