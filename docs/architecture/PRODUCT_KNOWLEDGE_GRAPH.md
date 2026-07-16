# PRODUCT_KNOWLEDGE_GRAPH.md
# Program Π (Pi) — Mission Π-1 — Product Knowledge Graph

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura. Zero código, zero migration, zero alteração de algoritmo. Compõe domínios já existentes (`taxonomy/`, `product-intelligence/`, `product-identity/`, `canonical-catalog/`) — não os substitui.
**Ver também**: `docs/architecture/PRODUCT_IDENTITY_V2.md`, `docs/engineering/ATTRIBUTE_COVERAGE_REPORT.md`, `docs/product/KNOWLEDGE_GRAPH_ROADMAP.md`.

---

## 1. Princípio

O gargalo nomeado pela Mission não é "o algoritmo erra" — é "o algoritmo recebe texto inconsistente." `ProductIdentityEngine` já é explicável, já é correto sobre o dado que recebe (Program Κ provou isso: 0→66/99 candidatos cross-merchant reais, zero linha do Engine alterada). O Knowledge Graph não é um motor de decisão novo — é uma **camada de identidade estruturada** que existe para que o Engine (e tudo que vem depois dele) pare de depender de comparar strings de nome/especificação brutas.

## 2. A hierarquia pedida (Objetivo 2) — mapeada contra o que já existe e o que é gap real

```
Produto (canonical_products — já existe, Program Ω)
  ↓
Marca (brands + taxonomy/data/brand-normalization.ts — já existe, Program Κ-2, não wired)
  ↓
Família ❌ GAP REAL — não existe como conceito em nenhum domínio hoje
  ↓
Linha ❌ GAP REAL — não existe como conceito em nenhum domínio hoje
  ↓
Modelo (ProductSignature.model — já existe, Program Κ-3, yield real 3,18%, só Apple)
  ↓
EAN (ProductSignature.ean — já existe, yield real 1,51%, não sustentável como base)
  ↓
MPN / manufacturerCode (ProductSignature.manufacturerCode — já existe, yield real 53,63% ← FUNDAÇÃO REAL)
  ↓
GTIN ❌ GAP REAL — zero dado, zero extrator, não é um problema de código, é ausência de fonte
  ↓
Atributos (ProductSignature completo — já existe, Program Κ-3)
  ↓
Relacionamentos (❌ GAP REAL — ver §4, nenhum domínio hoje modela isso)
  ↓
Ofertas (offers — já existe)
  ↓
Histórico (price_history — já existe, Release 1.6+)
  ↓
Preço (offers.price_usd + Exchange — já existe)
  ↓
Confiança (MatchFactor/penalties do ProductIdentityEngine — já existe, Release 1.7)
  ↓
Opportunity (OpportunityEngine — já existe, Program Λ/Π anterior)
```

**Leitura honesta**: 10 dos 13 elos já existem, construídos e testados. Os 3 gaps reais (Família, Linha, GTIN) não são falhas de engenharia — Família/Linha são um nível de abstração que nunca foi modelado porque nenhuma Mission anterior precisou dele (Universal Taxonomy modela Departamento→Categoria→Variante, um eixo diferente, de produto, não de marca); GTIN é ausência de dado na fonte, não solucionável por arquitetura.

## 3. Como o Knowledge Graph realmente funciona — arquitetura em camadas

Não um grafo literal em um banco de grafos novo (fora do escopo — "não alterar banco") — um **grafo lógico**, computado por composição de repositórios já existentes, exatamente como `CompareFoundationService`/`OpportunityEngine` já compõem múltiplos domínios sem duplicar dado:

```
Camada 1 — Identidade Estruturada (novo conceito, zero storage novo necessário)
  Node: ProductIdentityNode = {
    canonicalProductId,      // já existe
    brandId,                  // já existe
    manufacturerCode,         // já existe (ProductSignature, hoje calculado on-read)
    model,                    // já existe (ProductSignature)
    universalCategorySlug,    // já existe (Program Κ-2/Κ-4)
    attributes: ProductSignature completo  // já existe
  }

Camada 2 — Relacionamentos (novo conceito lógico, ver §4)
  Edge: ProductRelationship = { fromId, toId, type, confidence, evidence }

Camada 3 — Composição para consumidores (Search, Advisor, Opportunity —
  já existem, nenhum alterado)
```

**Por que "computado, não persistido" é a escolha certa aqui**: `manufacturerCode`/`model`/`universalCategorySlug` já são calculados a partir de dado real via funções puras (`buildProductSignature`, `findNodeByRealCategorySlug`) sem I/O — exatamente como Program Κ Mission Κ-4 já provou funcionar em produção. Persistir esses valores em colunas novas exigiria migration (proibido nesta Mission); computá-los sob demanda, na mesma camada que já os computa hoje, não exige nada novo — é literalmente o que `CanonicalMergeSuggestionService` já faz a cada chamada.

## 4. Knowledge Graph Relationships (Objetivo 5)

| Relacionamento | Como seria detectado (sem algoritmo novo) | Confiança |
|---|---|---|
| Mesmo modelo | `ProductSignature.model` idêntico + mesma marca | Alta onde `model` existe (3,18% hoje) |
| Mesmo fabricante | `brand_id` idêntico | Alta (100% — já é dado estruturado) |
| Mesmo EAN | `ProductSignature.ean` idêntico | Alta onde existe (1,51% hoje — não sustentável em volume) |
| Mesmo MPN/manufacturerCode | `ProductSignature.manufacturerCode` idêntico + mesma marca | Alta onde existe (**53,63% hoje — a base real**) |
| Mesmo SKU | Não detectável — SKU não existe em nenhuma fonte (0% medido) | N/A |
| Sucessor/antecessor | ❌ Não existe hoje nenhum sinal real (ano/geração extraído em apenas 1,16%/0,92% dos títulos) — exigiria um vocabulário de linha de produto por marca, que é exatamente o gap "Família/Linha" do §2 |
| Mesmo acessório / produto compatível | ❌ Não existe hoje — exigiria um relacionamento produto→categoria "acessório de" que a Universal Taxonomy já tem o esqueleto para (`level: 2` = "variante/acessório" em `UniversalCategoryNode`), mas nunca foi populado como relação produto-a-produto |
| Produto similar | Já existe parcialmente — é exatamente o que `ProductIdentityEngine` computa como "Manual"/"Média" (candidatos abaixo do piso de merge, mas com similaridade real) — reaproveitar, não recriar |
| Produto premium/econômico | ❌ Não existe — exigiria um eixo de "tier" por linha de produto, mesmo gap de Família/Linha |
| Produto substituto | ❌ Não existe — mesmo gap |

**Leitura honesta**: dos 13 relacionamentos pedidos, **4 já são medíveis hoje com dado real** (mesmo modelo, mesmo fabricante, mesmo MPN, produto similar via tiers existentes do Engine); **1 existe mas não é viável em volume** (mesmo EAN); **8 são gaps reais**, e todos os 8 compartilham a mesma causa raiz: ausência do nível "Família/Linha" — não são 8 problemas distintos, são 1 problema (hierarquia de linha de produto por marca) manifestado 8 vezes.

## 5. O que o Knowledge Graph explicitamente NÃO é

Não substitui `ProductIdentityEngine` (continua sendo o único que decide "mesmo produto", intocado). Não substitui `taxonomy/`/`product-intelligence/` (são os provedores de dado do grafo, não concorrentes). Não é um banco de grafos novo — é uma composição lógica sobre o que já existe, no mesmo espírito de `CompareFoundationService`.
