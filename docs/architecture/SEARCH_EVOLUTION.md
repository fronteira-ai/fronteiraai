# SEARCH_EVOLUTION.md
# Program Π (Pi) — Mission Π-1 — Product Knowledge Graph

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura — zero código, Search e Advisor permanecem intocados por esta Mission.
**Ver também**: `docs/architecture/PRODUCT_KNOWLEDGE_GRAPH.md`.

---

## 1. Search Optimization (Objetivo 6)

O fluxo pedido no brief — buscar "iphone" → encontrar todos os modelos → sucessores → acessórios → vendedores → preços → recomendações — hoje é parcialmente possível e parcialmente um gap real, mapeado exatamente contra `PRODUCT_KNOWLEDGE_GRAPH.md` §4:

```
Buscar "iphone"
  ↓
Todos os modelos       ✅ já funciona (busca textual sobre `products.name`, services/search.service.ts)
  ↓
Todos os sucessores     ❌ gap real — exige relacionamento "sucessor/antecessor", que exige Família/Linha (não existe)
  ↓
Todos os acessórios     ❌ gap real — exige relacionamento "acessório de", que a Universal Taxonomy tem o esqueleto
                           (`level: 2` = variante/acessório) mas nunca populado como relação produto-a-produto
  ↓
Todos os vendedores      ✅ já funciona — é exatamente o que `offers`/Comparable Coverage já fazem, quando o produto
                           está corretamente identificado (Program Κ-4 aumentou isso, mesmo que ainda pequeno)
  ↓
Todos os preços          ✅ já funciona
  ↓
Recomendações            ⚠️ parcial — `OpportunityEngine`/composers de `buyer-intelligence/` já existem e já
                           consomem Comparable Coverage; ficam mais fortes automaticamente à medida que o
                           Knowledge Graph aumenta CPC, sem precisar de nenhuma mudança neles
```

**Como o Search deveria usar o Knowledge Graph (arquitetura, sem código)**: hoje a busca encontra produtos por similaridade textual de nome. Com o Knowledge Graph (mesmo lógico, computado — `PRODUCT_KNOWLEDGE_GRAPH.md` §3), uma busca por "iphone" resolveria primeiro para `brandId` (Apple, dado estruturado, 100% confiável), depois expandiria por `manufacturerCode`/`model` compartilhado (53,6%/3,2% de cobertura real) para agrupar variantes do mesmo produto físico ANTES de apresentar resultados — o comprador veria "iPhone 17 Pro Max" como 1 entrada com N ofertas, não N entradas quase-idênticas competindo por atenção. Isso não é uma reescrita do motor de busca — é a mesma composição que `CompareFoundationService` já faz, aplicada uma camada acima, na lista de resultados em vez de na página de comparação.

## 2. Advisor Optimization (Objetivo 7) — sem alterar o Advisor

`ParaguAIAdvisorComposer` (`src/domains/buyer-intelligence/`) já compõe múltiplos sinais (preço, confiança de loja, timing) sem duplicar lógica de nenhum domínio fonte — mesma disciplina que o Knowledge Graph segue. O Advisor não precisa ser alterado porque ele já consome Comparable Coverage e `OpportunityEngine` como estão; à medida que o Knowledge Graph aumenta a base de produtos com 2+/3+ lojas (medido: teto de 397/36 grupos via `manufacturerCode`, `KNOWLEDGE_GRAPH_ROADMAP.md`), o Advisor automaticamente tem mais casos reais para recomendar sobre — o mesmo padrão observado em `CROSS_MERCHANT_ACTIVATION_PILOT.md` (Mission OPS-1): `BestDealComposer` não mudou uma linha, só passou a ter dado real para operar.

**A única mudança arquitetural que tornaria o Advisor mais forte sem alterá-lo**: o Knowledge Graph expor um campo adicional de contexto (`relatedProducts`/`sameManufacturerCode`) que os composers já existentes poderiam opcionalmente consumir no futuro — não uma obrigação desta proposta, apenas o ponto de extensão natural, nomeado para uma Mission futura decidir.

## 3. Por que isso não exige uma reescrita de Search

Toda a mudança proposta é sobre **o que alimenta a apresentação de resultados**, nunca sobre como a busca em si funciona (índice, ranking textual, etc. — tudo intocado). Isso segue exatamente o padrão já validado por Program Κ Mission Κ-4: mudar o insumo, nunca o algoritmo.
