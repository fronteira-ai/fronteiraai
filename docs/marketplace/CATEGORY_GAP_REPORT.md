# CATEGORY_GAP_REPORT.md
# PROGRAM ΔR — MISSION ΔR-2 — Objetivo 3

**Categoria**: `docs/marketplace/` (ADR-048)
**Data**: 2026-07-14
**Escopo**: as 15 categorias nomeadas explicitamente no mandato desta missão (Celulares, Notebooks, Games, TVs, Perfumes, Relógios, Drones, Auto, Casa, Informática, Fotografia, Instrumentos, Esportes, Moda, Infantil), avaliadas contra dado real já medido. Onde nenhuma medição existe, isso é declarado como gap real — nunca preenchido com uma estimativa.

---

## Como ler esta matriz

- **Volume medido**: contagem real de produtos, quando existe (`docs/product/CATEGORY_INVENTORY_REPORT.md`, Κ-1, 2026-07-13, 18.010 produtos).
- **Merchants no cluster**: quantos dos 10 Tier 1 (conectados ou bloqueados) declaram este perfil de categoria, por auditoria técnica (`Tier1_Merchants.md`).
- **Cobertura hoje**: quantos desses merchants estão de fato conectados e contribuindo dado real.
- **Comparabilidade**: se existe pelo menos 1 comparação de preço real e verificável nesta categoria — herda diretamente de `MERCHANT_OVERLAP_MATRIX.md`/`COMPARABLE_PRODUCT_COVERAGE_REPORT.md` (o único par comprovado do marketplace inteiro é Shopping China × Mega Eletrônicos, perfil eletrônicos/celulares).

---

## Matriz completa

| Categoria | Volume medido | Merchants no cluster | Cobertura hoje | Comparabilidade | Status |
|---|---|---|---|---|---|
| **Celulares** | 670 (`Celulares e Smartphones`) + 355 (`Smartphones`) = 1.025+ produtos, fragmentados em slugs distintos | Cellshop, Mobile Zone, Mega Eletrônicos, Shopping China | 3 de 4 conectados (Shopping China, Mega Eletrônicos, Mobile Zone) — Cellshop bloqueado | O único par de comparação real do marketplace inteiro toca este cluster (Shopping China × Mega Eletrônicos) | **Parcial** — maior cobertura relativa de qualquer categoria nomeada, mas ainda sem comparação em volume |
| **Notebooks** | 244–245 produtos | Atacado Connect, Nissei, Visão VIP, Mega Eletrônicos | 2 de 4 (Atacado Connect, Mega Eletrônicos) | 0% de sobreposição de produto medida entre os 2 conectados, apesar de a categoria em si já ser compartilhada por 5 merchants no slug (`CATEGORY_INVENTORY_REPORT.md` §4) | **Parcial** — maior coincidência de slug entre merchants de toda a auditoria Κ-1, mas isso não gerou nenhuma comparação de produto real ainda |
| **Games** | Não medido | **Nenhum dos 10 Tier 1 audita este perfil declarado** | 0 | Nenhuma | **Gap real de cobertura** — não é um problema de execução, é ausência total no universo já auditado; expandir exige auditar um merchant fora da lista atual, fora do escopo desta missão |
| **TVs** | Não quebrado como subcategoria em nenhum dos conectados | Mega Eletrônicos, Cellshop, Atacado Connect (perfil "Eletrônicos" geral) | Provavelmente presente dentro de categorias genéricas ("Eletrônicos"/"ELECTRONICOS"), mas nunca confirmado nominalmente | Não medida | **Gap de granularidade** — produto pode existir sob um `category_id` genérico, mas nenhuma auditoria isolou TVs como fato verificado |
| **Perfumes** | **~1.450 produtos** (`Perfume Masculino` 520 + `Perfume Feminino` 475 + `Perfume Unissex` 302 + `Perfume Femenino` 153) — **8% do catálogo inteiro**, a maior massa de produto de qualquer categoria nomeada nesta missão | Mega Eletrônicos (dominante, 3 categorias), Mobile Zone (1) | Concentrado em 1-2 merchants por variante de gênero — nenhuma delas com 2+ merchants reais | Nenhuma comparação real confirmada apesar do volume altíssimo | **Maior contradição desta matriz**: altíssimo volume, comparabilidade ainda próxima de zero — reforça o achado central desta fase (volume ≠ comparabilidade) |
| **Relógios** | Existe (`Reloj Masculino`/`Relojes femeninos`/`Reloj Unisex`), volume abaixo de 244 (fora do Top 11 de `CATEGORY_INVENTORY_REPORT.md` §4) — número exato não medido nesta missão | Não auditado por merchant | Não medido | Não medida | **Gap de granularidade** — mesmo padrão de fragmentação por gênero do Perfumes, em escala menor, nunca quantificado por merchant |
| **Drones** | Não medido, nenhuma menção em nenhum documento desta fase | Não auditado | Desconhecido | Não medida | **Gap real, não auditado** |
| **Auto** | Não medido, nenhuma menção em nenhum documento desta fase | Não auditado | Desconhecido | Não medida | **Gap real, não auditado** |
| **Casa** | Sinal indireto: `CASA Y ESCRITORIO` aparece entre os "buckets genéricos" de fallback citados em `CATEGORY_INVENTORY_REPORT.md` §4 (sem contagem própria isolada); Roma Shopping declara departamento "Cozinha" | Roma Shopping (Cozinha), possivelmente Atacado Connect | Roma Shopping conectado | Não medida | **Gap de granularidade** — sinal existe, nunca isolado como categoria própria medida |
| **Informática** | Atacado Connect (392 produtos, maior catálogo do cluster) | Atacado Connect, Visão VIP, Nissei, Mega Eletrônicos | 1 de 4 conectados isoladamente com volume relevante (Atacado Connect) | Sem par de comparação real — Atacado Connect não tem par ativo no mesmo cluster | **Parcial** — maior catálogo individual do cluster, mas sem concorrência real |
| **Fotografia** | Não medido nos merchants conectados | Nissei (distribuidor oficial Canon/Nikon) | 0 — depende inteiramente de um merchant bloqueado | Nenhuma | **Não dominada, dependência total de um único merchant bloqueado** — desbloquear Nissei é a única alavanca conhecida para esta categoria |
| **Instrumentos** | Não medido, nenhuma menção em nenhum documento desta fase | Não auditado | Desconhecido | Não medida | **Gap real, não auditado** |
| **Esportes** | Não medido, nenhuma menção em nenhum documento desta fase | Não auditado | Desconhecido | Não medida | **Gap real, não auditado** |
| **Moda** | Sinal indireto: Roma Shopping declara departamento "Roupa e Calçados" (sem contagem própria isolada) | Roma Shopping | Roma Shopping conectado | Não medida | **Gap de granularidade** — sinal existe, nunca quantificado |
| **Infantil** | Sinal indireto: Roma Shopping declara departamento "Brinquedos" (sem contagem própria isolada) | Roma Shopping | Roma Shopping conectado | Não medida | **Gap de granularidade** — mesma situação de Moda |

---

## Leitura consolidada

Das 15 categorias nomeadas no mandato:

- **1 com cobertura parcial forte e prova de comparabilidade** (Celulares).
- **2 com cobertura parcial e volume relevante mas zero comparabilidade** (Notebooks, Informática).
- **1 com volume altíssimo e comparabilidade quase nula** (Perfumes) — o achado mais contra-intuitivo desta matriz.
- **1 dependente inteiramente de um merchant bloqueado** (Fotografia/Nissei).
- **4 com sinal indireto mas nunca quantificado nominalmente** (TVs, Relógios, Casa, Moda, Infantil — 5, não 4; corrigido).
- **5 sem nenhuma menção em qualquer documento desta fase, gap real e não auditado** (Games, Drones, Auto, Instrumentos, Esportes).

**Conclusão honesta**: mais de um terço das categorias que o CTO nomeou como referência estratégica **nunca foi auditado tecnicamente em nenhuma missão anterior**. Isso é uma lacuna de descoberta, não de execução — nenhum dos 10 merchants Tier 1 já conhecidos cobre Games/Drones/Auto/Instrumentos/Esportes de forma declarada, e expandir para essas categorias exige um novo lote de auditoria de merchants fora do universo atual (ver `MARKETPLACE_EXPANSION_ROADMAP.md` Wave 4).

## Fontes

`docs/product/CATEGORY_INVENTORY_REPORT.md`, `docs/product/CATEGORY_DOMINATION_PLAN.md`, `docs/marketplace/Tier1_Merchants.md`.
