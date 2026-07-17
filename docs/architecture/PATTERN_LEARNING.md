# PATTERN_LEARNING.md
# Program Ξ (Xi) — Mission Ξ-2 — Marketplace Learning Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura — "aprendizagem automática" aqui significa detecção determinística de recorrência, nunca inferência estatística/IA (restrição explícita: "não criar IA").

---

## Objetivo 6 — como o sistema evolui sem intervenção humana, sem ser IA

O mecanismo é **contagem e confirmação por recorrência determinística**, não aprendizado de máquina:

```
Uma chave de especificação nunca vista aparece (ex.: "Almacenamiento" numa loja nova)
  │
  ├─ Aparece 1 vez → registrada como candidata, não promovida a alias
  │
  ├─ Aparece N vezes (limiar objetivo, ex.: ≥10 — mesmo espírito do piso "possible=70"
  │   já usado pelo Merge Engine: um número fixo, aprovado, nunca uma heurística oculta)
  │   E o valor sempre casa com o formato esperado do conceito (ex.: `\d+\s?GB` para
  │   capacidade — os mesmos normalizadores determinísticos que `value-normalizers.ts`
  │   (Κ-3) já usa, inalterados) → promovida a alias LOCAL daquele merchant
  │
  └─ Um humano confirma (mesmo padrão de revisão de merge_candidates já existente)
      → promovida a alias GLOBAL, se o mesmo padrão aparecer em 2+ merchants
      independentes (evidência de que não é um acidente de um único merchant)
```

**Por que isso não é IA**: cada etapa é uma contagem e uma checagem de formato contra uma função determinística já existente (`normalizeCapacityToGb`, `normalizeColorToken`, etc., Κ-3, inalteradas). Não há modelo estatístico, não há probabilidade — é o mesmo tipo de regra que já rege `ATTRIBUTE_KEY_ALIASES` hoje, só que descoberta automaticamente por recorrência em vez de escrita manualmente uma vez.

## O que pode ser aprendido dessa forma (Objetivo 6, item por item)

| Conceito | Aprendível por recorrência? | Evidência real que sustenta isso |
|---|---|---|
| Expressões recorrentes / tokens | Sim — mesma lógica de `tokenize()` já existente, só contando frequência entre produtos em vez de descartar após uma comparação | `PRODUCT_IDENTITY_ALGORITHM_VERSION`/`tokenize()`, ProductIdentityEngine |
| Aliases (chave→conceito) | Sim — exatamente o mecanismo acima | `MERCHANT_LEARNING.md`, 4 padrões reais já medidos |
| Manufacturer Codes | Parcialmente — o extrator (`extractManufacturerCode`) já é heurístico e determinístico; o que se aprende por recorrência é a CONFIANÇA de um padrão específico (ex.: "códigos que começam com 'A' + 4 dígitos são sempre Apple", já 53,63% de yield medido em Π-1), não o extrator em si | `ATTRIBUTE_COVERAGE_REPORT.md`, Π-1 |
| Categorias | Sim — `realCategorySlugs[]` (Universal Taxonomy, Κ-2) já é essa lista, hoje estática; o mesmo mecanismo de recorrência a manteria crescendo | `taxonomy/data/universal-tree.ts` |
| Marcas | Sim — `normalizeBrandName()` (Κ-2) já é determinística; o gap não é o normalizador, é decidir quando 2 nomes brutos são "recorrentemente" a mesma marca (Κ-5 já mediu que isso importa pouco hoje: 0,16% do catálogo) | `PROGRAM_K_CLOSURE.md`, Κ-5 |
| Modelos | Parcialmente — `normalizeAppleModelToken` é Apple-only (yield 3,18%, medido em Π-1); expandir para outras marcas de alto volume é justamente a recomendação #2 do `KNOWLEDGE_GRAPH_ROADMAP.md` (Π-1), e seguiria o mesmo mecanismo de recorrência | Π-1 |
| Famílias / Linhas | **Não ainda** — não existe o conceito para aprender recorrência sobre (gap estrutural, não de mecanismo) | `PRODUCT_KNOWLEDGE_GRAPH.md`, Π-1 |
| Atributos (cor, capacidade, etc.) | Sim — mesmo mecanismo de chave→conceito de `MERCHANT_LEARNING.md` | — |

## O limite explícito

Este mecanismo nunca decide um merge sozinho — só decide se um PADRÃO DE EXTRAÇÃO vale a pena promover de "candidato" para "confiável." A decisão de identidade de produto (é ou não o mesmo produto) continua 100% do `ProductIdentityEngine`, intocado, com aprovação humana obrigatória preservada (`CONFIDENCE_ENGINE.md`, Ξ-1).
