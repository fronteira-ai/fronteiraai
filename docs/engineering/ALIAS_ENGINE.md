# ALIAS_ENGINE.md
# Program Κ — Mission Κ-2 — Objetivo 3

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15

---

## 1. O que é

Não é um serviço separado — é a própria estrutura `realCategorySlugs[]` de cada `UniversalCategoryNode` (`src/domains/taxonomy/data/universal-tree.ts`). Cada categoria oficial carrega a lista de aliases reais (slugs de `categories`, produção) que convergem para ela. `findNodeByRealCategorySlug(slug)` (`src/domains/taxonomy/index.ts`) é a função de resolução — dado um alias real, retorna o nó oficial.

## 2. Exemplo real (não hipotético)

```
smartphones (nó oficial)
  ← "celulares"
  ← "smartphones"
  ← "celular"
  ← "celulares-e-smartphones"
```

```
fones-de-ouvido (nó oficial)
  ← "fone-de-ouvido-sem-fio"
  ← "fone-de-ouvido-com-fio"
  ← "fones-de-ouvido"
  ← "auriculares"
  ← "headsets"
  ← "headset"
```

Todos os 129 aliases mapeados foram verificados linha por linha contra a tabela `categories` real (`scripts/kappa2-tree-verify.ts`, 2026-07-15) — **129/129 existem**, zero fabricado.

## 3. Garantia de unicidade

`findNodeByRealCategorySlug` percorre a árvore inteira (`flattenTree`) e retorna o primeiro nó cujo `realCategorySlugs` contém o slug pedido — testado explicitamente (`src/domains/taxonomy/__tests__/universal-tree.test.ts`) para confirmar que membros do mesmo cluster de sinônimo resolvem ao mesmo nó, e que um par pai/filho (ex.: `perfumes` vs. `perfume-masculino`) resolve a nós **diferentes**, nunca colapsados incorretamente.

## 4. O que o Alias Engine não faz

Não altera nenhuma linha de `categories` — os slugs reais continuam existindo exatamente como estão, com seu próprio `id`. O Alias Engine só adiciona uma segunda camada de leitura (`category_universal_map`, se a migration for aplicada) que aponta cada `category_id` real para o `universal_category_id` que ele representa — nunca uma migração de dado destrutiva.

## Fontes

`src/domains/taxonomy/data/universal-tree.ts`, `scripts/kappa2-tree-verify.ts`, `UNIVERSAL_TAXONOMY.md`.
