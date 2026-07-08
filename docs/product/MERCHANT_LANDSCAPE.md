# MERCHANT_LANDSCAPE.md
# PROGRAM Ξ — Mission Ξ-1 — Parte 1: Panorama de Merchants da Fronteira

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ)
**Data**: 2026-07-08
**Fonte primária, reaproveitada, não recriada**: `docs/marketplace/Tier1_Merchants.md` (auditoria técnica, 2026-07-03) + `docs/business/TIER1_PARTNERS.md` (pipeline comercial) + medição real de produção (Mission Δ-3, `MERCHANT_OVERLAP_MATRIX.md`). Nenhum merchant novo foi auditado nesta missão — o universo permanece os 10 Tier 1 já conhecidos, mais precisamente caracterizado agora com dado real de produção para os 4 já conectados.

---

## Convenção de rótulo

- **Medido** — número vem de query direta contra produção (Mission Δ-3).
- **Declarado** — vem da auditoria técnica pública de `Tier1_Merchants.md` (robots.txt/sitemap/páginas públicas), nunca inferido.
- **Projetado** — estimativa qualitativa desta missão, baseada no perfil declarado, explicitamente rotulada como projeção, nunca apresentada como fato medido.

## Os 10 merchants Tier 1

| Merchant | Segmento Principal | Categorias Dominantes | Volume de Catálogo | Sobreposição Esperada com os 4 Conectados | Qualidade de Dado | Facilidade Técnica | Potencial de Comparação | Valor para IA |
|---|---|---|---|---|---|---|---|---|
| **Shopping China** *(conectado)* | Importados/Geral | ~20+ categorias declaradas | **229 canonical products com oferta ativa (Medido)** | — (já é referência) | Alta (100% imagem/marca/categoria, Medido) | — | Comparável consigo mesmo, N/A | Base do modelo |
| **Mega Eletrônicos** *(conectado)* | Eletrônicos | ~14 categorias | **269 (Medido)** | — | Alta (Medido) | — | **1 produto real com Shopping China (Medido)** | Único par com convergência real hoje |
| **Roma Shopping** *(conectado)* | Geral (7 departamentos) | Cozinha, Eletrônicos, Informática, Brinquedos, Roupa/Calçados, Beleza, Bebidas | **372 (Medido)** | — | Alta (Medido) | — | **0 com qualquer outro conectado (Medido)** | Amplia cobertura, não densidade |
| **Atacado Connect** *(conectado)* | Informática/Eletrônicos | Multi-nível | **392 (Medido)** | — | Alta, 99% imagem (Medido) | — | **0 com qualquer outro conectado (Medido)** | Amplia cobertura, não densidade |
| **Cellshop** | Eletrônicos/Celulares | Tecnologia: Celulares, Informática, Eletrônicos, Eletrodomésticos | Não verificável (bloqueio) | **Alta (Projetado — perfil quase idêntico ao par Shopping China×Mega Eletrônicos, o único com convergência real hoje)** | Não verificável | Bloqueada — Data Partnership | Alto potencial projetado | Alto (projetado) |
| **Nissei** | Informática/Eletrodomésticos | Placas gráficas, refrigeração; distribuidor oficial Apple/Sony/Canon/Nikon | Não verificável (bloqueio) | **Alta (Projetado — marcas premium, categoria próxima de Atacado Connect/Mega Eletrônicos)** | Não verificável | Bloqueada — Data Partnership | Alto potencial projetado, marcas de peso | Alto (projetado) |
| **Mobile Zone** | Celulares/Eletrônicos | Alto giro de SKU (importador) | Não verificável (spike necessário) | **Alta (Projetado — mesmo cluster de Cellshop/Mega Eletrônicos/Shopping China)** | Não verificável | Needs Technical Spike | Alto potencial projetado | Alto (projetado) |
| **Visão VIP** | Informática (apesar do nome) | Eletrônicos/informática | Não verificável (sitemap sem produto) | **Média-Alta (Projetado — cluster informática, próximo de Atacado Connect)** | Não verificável | Needs Technical Spike | Médio-alto potencial projetado | Médio-alto (projetado) |
| **Casa Americana** | Eletrônicos/Geral | Não verificável (bloqueio) | Não verificável | **Média (Projetado — perfil "geral" mais próximo de Roma Shopping, que hoje tem 0% de sobreposição real)** | Não verificável | Bloqueada — Data Partnership | Médio potencial projetado, incerto | Médio (projetado) |
| **New Zone** | Importados/Atacado | Auto-descrita "plataforma de atacado" | Não verificável (bloqueio) | **Baixa (Projetado — perfil de atacado/geral mais próximo de Roma Shopping/Atacado Connect, ambos com 0% de sobreposição real medida)** | Não verificável | Bloqueada — Data Partnership | Baixo potencial projetado | Baixo-médio (projetado, alto volume mas baixa concorrência esperada) |

## O sinal real que orienta toda projeção desta missão

Existe exatamente **um** par medido de merchants com sobreposição de catálogo real: Shopping China × Mega Eletrônicos, ambos autodescritos como "eletrônicos/importados gerais" — 1 produto em comum. Existem exatamente **dois** pares medidos com sobreposição **zero**: Roma Shopping e Atacado Connect (perfis mais amplos/distintos) contra qualquer outro conectado. Esse é o único dado real disponível para projetar os 6 merchants não conectados — usado consistentemente em toda esta missão, nunca substituído por intuição não rotulada.

## O que este documento não faz

Não estima volume de catálogo para os 6 merchants bloqueados/pendentes de spike — `Tier1_Merchants.md` §8 já documenta essa limitação (nenhum fetch foi tentado contra os 4 bloqueados, por política; os 2 pendentes de spike não têm catálogo descobrível via sitemap). Reafirmar uma estimativa aqui seria fabricar precisão que não existe.
