# MERCHANT_OVERLAP_MATRIX.md
# PROGRAM Δ — Mission Δ-3 — Matriz de Sobreposição entre Merchants

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08 — medição direta, catálogo 100% canonicalizado

---

## Matriz completa (4 merchants reais e certificados)

| Merchant A | Merchant B | Produtos Compartilhados | % do Menor Catálogo | Potencial de Comparação | Impacto para IA | Impacto para Usuário |
|---|---|---|---|---|---|---|
| Shopping China (229) | Mega Eletrônicos (269) | **1** | 0,44% | Mínimo — 1 produto real comparável | Nenhum agregado — 1 caso isolado não gera insight estatístico | Nenhum perceptível |
| Shopping China (229) | Roma Shopping (372) | 0 | 0% | Nenhum | Nenhum | Nenhum |
| Shopping China (229) | Atacado Connect (392) | 0 | 0% | Nenhum | Nenhum | Nenhum |
| Mega Eletrônicos (269) | Roma Shopping (372) | 0 | 0% | Nenhum | Nenhum | Nenhum |
| Mega Eletrônicos (269) | Atacado Connect (392) | 0 | 0% | Nenhum | Nenhum | Nenhum |
| Roma Shopping (372) | Atacado Connect (392) | 0 | 0% | Nenhum | Nenhum | Nenhum |

**Catálogo de cada merchant, para contexto** (contagem de canonical products distintos com oferta ativa): Atacado Connect 392, Roma Shopping 372, Mega Eletrônicos 269, Shopping China 229.

## Leitura por merchant

- **Roma Shopping** (maior catálogo, 372 produtos): 0% de sobreposição com qualquer outro merchant. Opera como um catálogo completamente paralelo — reforça o achado de `MARKETPLACE_COVERAGE_MAP.md` (Mission Δ-1) de que é o merchant de perfil mais amplo (7 departamentos), mas essa amplitude não se traduz em concorrência com os outros 3.
- **Atacado Connect** (2º maior, 392 produtos): mesma situação — 0% de sobreposição.
- **Mega Eletrônicos** e **Shopping China**: única sobreposição real de todo o marketplace (1 produto) — ambos com perfil de categoria mais próximo (eletrônicos/importados gerais), consistente com a expectativa qualitativa já registrada em `MARKETPLACE_COVERAGE_MAP.md`.

## Por que o potencial de comparação é "Nenhum" em 5 de 6 pares, objetivamente

Não é uma avaliação subjetiva — é a contagem exata de produtos elegíveis para comparação (2+ ofertas do mesmo canonical product) entre cada par. Zero produtos compartilhados significa, matematicamente, zero comparações de preço possíveis entre esses dois merchants hoje, para qualquer produto do catálogo atual.

## O que isso implica para a Growth Decision

Ver `GROWTH_DECISION_REPORT.md` — esta matriz é a evidência quantitativa central da decisão.
