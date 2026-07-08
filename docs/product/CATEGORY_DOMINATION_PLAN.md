# CATEGORY_DOMINATION_PLAN.md
# PROGRAM Ξ — Mission Ξ-1 — Parte 3: Estratégia de Domínio por Categoria

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ)
**Data**: 2026-07-08

---

## Critério de "categoria dominada"

Uma categoria é considerada dominada para o Launch quando tem: (1) cobertura mínima de merchants ativos vendendo nela, (2) densidade mínima de produtos comparáveis (2+ ofertas por produto canônico), (3) pelo menos 1 comparação de preço real e verificável exibível como prova de valor. Nenhum limiar abaixo foi fixado por intuição — cada um é ancorado no único precedente real medido (`MERCHANT_OVERLAP_MATRIX.md`) ou marcado como projeção.

## Categorias avaliadas

| Categoria | Merchants Prioritários (declarado/conectado) | Cobertura Mínima | Densidade Mínima | Meta de Comparação | Status Hoje |
|---|---|---|---|---|---|
| **Smartphones/Celulares** | Cellshop, Mobile Zone, Mega Eletrônicos, Shopping China | 3 de 4 merchants do cluster ativos | ≥30% dos produtos-modelo top com 2+ ofertas | ≥10 modelos com comparação real de preço exibível | **Não dominada** — hoje só 2 dos 4 (Shopping China, Mega Eletrônicos) conectados, 1 produto comparável no total |
| **Apple (marca, cross-categoria)** | Nissei (distribuidor oficial) | Nissei conectado + 1 outro merchant com produtos Apple reais | ≥5 modelos comparáveis | ≥3 comparações reais | **Não dominada** — Nissei ainda bloqueado, nenhum dado de produto Apple confirmado em nenhum merchant conectado hoje |
| **Samsung (marca, cross-categoria)** | Cellshop, Mega Eletrônicos, Mobile Zone | 2+ merchants do cluster eletrônicos ativos | ≥20% dos modelos Samsung com 2+ ofertas | ≥5 comparações reais | **Não dominada** — mesma lacuna do cluster eletrônicos |
| **Notebooks/Informática** | Atacado Connect, Nissei, Visão VIP, Mega Eletrônicos | 3 de 4 ativos | ≥25% dos modelos com 2+ ofertas | ≥8 comparações reais | **Parcial** — Atacado Connect e Mega Eletrônicos já ativos (392 + 269 produtos), mas 0% de sobreposição medida entre eles hoje |
| **Games** | Nenhum merchant Tier 1 audita tem este perfil declarado | N/A — gap de cobertura, não de densidade | N/A | N/A | **Gap real, não coberto por nenhum dos 10 Tier 1** — fora do escopo desta missão propor um merchant novo fora da lista já auditada |
| **TVs** | Mega Eletrônicos, Cellshop, Atacado Connect | 2+ ativos | ≥15% com 2+ ofertas | ≥5 comparações | **Não dominada** — sem dado de subcategoria TV confirmado nos conectados hoje |
| **Áudio** | Mega Eletrônicos, Atacado Connect | 2+ ativos | ≥15% com 2+ ofertas | ≥3 comparações | **Não dominada** — mesma lacuna |
| **Fotografia** | Nissei (distribuidor Canon/Nikon oficial) | Nissei conectado | ≥10 modelos | ≥3 comparações | **Não dominada** — depende inteiramente de Nissei, hoje bloqueado |
| **Informática (geral)** | Atacado Connect, Visão VIP, Nissei | 2+ ativos | ≥20% com 2+ ofertas | ≥8 comparações | **Parcial** — Atacado Connect sozinho tem 392 produtos, mas sem par de comparação real |

## Leitura honesta

**Nenhuma categoria está dominada hoje**, pela própria definição acima — todas exigem pelo menos 2 merchants do mesmo cluster ativos e comparação real medida, e hoje existe exatamente 1 produto comparável em todo o marketplace (`MARKETPLACE_TRUTH_REPORT.md`). O gap de "Games" é estrutural: nenhum dos 10 merchants Tier 1 já auditados declara esse perfil — expandir esta categoria exigiria auditar um merchant fora da lista atual, decisão fora do escopo desta missão (que trabalha exclusivamente com o universo já conhecido).

## Prioridade de domínio de categoria (ordem recomendada)

1. **Smartphones/Celulares** — maior precedente real (o único par comprovado, Shopping China × Mega Eletrônicos, já toca esta categoria) e maior concentração de merchants pendentes no mesmo cluster (Cellshop, Mobile Zone).
2. **Notebooks/Informática** — já tem 2 merchants grandes conectados (Atacado Connect, Mega Eletrônicos), falta apenas convergência real entre eles ou um terceiro merchant do cluster (Nissei/Visão VIP).
3. **Apple/Fotografia** — dependem quase inteiramente de um único merchant (Nissei), maior risco de concentração, mas maior valor de marca se viabilizado.
4. **TVs/Áudio/Samsung** — sub-conjuntos do cluster eletrônicos já priorizado no item 1, crescem organicamente com ele.
5. **Games** — não endereçável com o universo de merchants já auditado; não priorizado nesta missão.
