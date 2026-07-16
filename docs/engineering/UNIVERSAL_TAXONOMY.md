# UNIVERSAL_TAXONOMY.md
# Program Κ (Kappa) — Mission Κ-2 — A árvore oficial do ParaguAI

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15
**Status**: Camada semântica construída e verificada contra produção; migration pronta, backfill **não executado** — requer autorização explícita do CTO (mesmo padrão de `docs/engineering/MERGE_EXECUTION_ENGINE.md`).
**Implementa**: Option C ("Universal Taxonomy faseada") — a arquitetura já recomendada por `docs/product/TAXONOMY_ARCHITECTURE_RECOMMENDATION.md` (Mission Κ-1), agora construída.

---

## 1. Princípio

`src/domains/taxonomy/` é uma camada semântica pura — zero I/O, zero dependência de `product-identity/`, `canonical-catalog/` ou `connectors/`. Ela nunca depende das categorias que cada lojista já usa (mandato: "nunca depender das categorias dos lojistas") — a árvore é desenhada de cima para baixo (o que o ParaguAI *deveria* vender), e só depois ancorada de baixo para cima onde uma categoria real já existe (`realCategorySlugs`).

**Esta Mission não altera `ProductIdentityEngine`, `CanonicalMergeSuggestionService` ou o Merge Engine.** A árvore existe; se e como ela é consumida por esses sistemas é decisão de uma Mission futura, deliberadamente não tomada aqui.

## 2. Estrutura

`UniversalCategoryNode` (`src/domains/taxonomy/types/taxonomy.types.ts`): `slug`, `name`, `level` (0=departamento, 1=categoria, 2=variante/acessório), `realCategorySlugs` (os slugs reais de `categories` que este nó representa hoje — pode ser vazio, um placeholder honesto), `children?`.

## 3. A árvore (11 departamentos)

Eletrônicos (com sub-árvore Informática), Games, Perfumes, Beleza e Cuidados Pessoais, Relógios, Casa (com sub-árvore Eletrodomésticos), Automotivo, Esportes, Instrumentos, Moda e Acessórios, Ferramentas.

**129 slugs reais de `categories` foram mapeados** — verificado linha por linha contra produção (`scripts/kappa2-tree-verify.ts`): **129/129 existem de fato**, zero entrada fabricada.

**Placeholders honestos, não escondidos**: nós como `drone`, `desktop`, `camera-de-acao`, e departamentos inteiros como Automotivo (só 1 categoria real hoje) têm `realCategorySlugs: []` ou quase vazio — confirma o gap já medido em `docs/marketplace/CATEGORY_GAP_REPORT.md` (Games/Drones/Auto/Instrumentos/Esportes sem cobertura real de nenhum dos 5 merchants ativos). A árvore nomeia o conceito que o marketplace deveria eventualmente cobrir, nunca finge que o dado já existe.

## 4. Fonte dos 129 mapeamentos

Os agrupamentos de sinônimo (Fase 1) reusam, sem reinterpretação, os **66 clusters já validados manualmente** em `docs/product/CATEGORY_CLUSTER_MATRIX.md` / `scripts/kappa1-impact-simulation.ts` (`VALIDATED_CLUSTERS`). A hierarquia pai/filho (Fase 2 — ex.: `perfumes` → `perfume-masculino`) reflete os 377 pares pai/filho que a Mission Κ-1 já identificou como estruturais, nunca resolvíveis por um mapeamento flat.

## 5. Schema (migration, não aplicada)

`supabase/migrations/20260715140000_universal_taxonomy.sql` — 5 tabelas aditivas (`universal_categories`, `category_universal_map`, `canonical_brands`, `brand_universal_map`, `model_aliases`, `attribute_dictionary`). Nenhuma coluna é adicionada a `categories`/`products`/`canonical_products`/`brands`/`merge_candidates` — nenhuma linha existente é tocada. Reversível por completo (todas as 5 são novas e sem consumidor).

## 6. Ver também

`CATEGORY_DICTIONARY.md`, `ALIAS_ENGINE.md`, `MODEL_NORMALIZATION.md`, `ATTRIBUTE_DICTIONARY.md` — os outros 4 documentos desta Mission. O resultado da Cross-Merchant Simulation (Objetivo 7/8) está na resposta da missão (`scripts/kappa2-cross-merchant-simulation.ts` é a fonte reproduzível).
