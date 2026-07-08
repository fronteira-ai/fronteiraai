# COMPETITIVE_DENSITY_MATRIX.md
# PROGRAM Ξ — Mission Ξ-1 — Parte 2: Matriz de Competição entre Merchants

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ)
**Data**: 2026-07-08
**Base**: `MERCHANT_OVERLAP_MATRIX.md` (Mission Δ-3, dado medido) para os 4 conectados; `MERCHANT_LANDSCAPE.md` (projeção rotulada) para os 6 pendentes.

---

## Matriz medida — os 4 merchants já conectados

| Par | Sobreposição | Status |
|---|---|---|
| Shopping China × Mega Eletrônicos | 1 produto (0,44% do menor catálogo) | **Medido** — único par com convergência real |
| Shopping China × Roma Shopping | 0 | Medido |
| Shopping China × Atacado Connect | 0 | Medido |
| Mega Eletrônicos × Roma Shopping | 0 | Medido |
| Mega Eletrônicos × Atacado Connect | 0 | Medido |
| Roma Shopping × Atacado Connect | 0 | Medido |

## Matriz projetada — pares com o maior potencial de aumentar comparação de preços

Ordenada pela projeção de maior para menor sobreposição esperada, usando exclusivamente o perfil de categoria declarado (`Tier1_Merchants.md`) e ancorada no único par real medido:

| Par | Sobreposição Projetada | Justificativa |
|---|---|---|
| **Cellshop × Mega Eletrônicos** | **Alta** | Cellshop = "Celulares/Informática/Eletrônicos/Eletrodomésticos" — perfil quase idêntico ao par real medido (Shopping China × Mega Eletrônicos) |
| **Cellshop × Shopping China** | **Alta** | Mesmo raciocínio — ambos eletrônicos/celulares gerais |
| **Mobile Zone × Cellshop** | **Alta** | Ambos "Celulares/Eletrônicos" — cluster mais estreito de todo o painel |
| **Mobile Zone × Mega Eletrônicos** | **Alta** | Mesmo cluster |
| **Nissei × Atacado Connect** | **Média-Alta** | Nissei = distribuidor oficial de marcas premium (Apple/Sony/Canon/Nikon) em Informática/Eletrodomésticos — categoria próxima de Atacado Connect (Informática/Eletrônicos multi-nível) |
| **Nissei × Mega Eletrônicos** | **Média-Alta** | Mesma lógica |
| **Visão VIP × Atacado Connect** | **Média** | Ambos informática, mas Visão VIP tem catálogo não descoberto — incerteza técnica reduz confiança da projeção |
| **Casa Americana × Roma Shopping** | **Baixa-Média** | Ambos "geral" — mas Roma Shopping já provou 0% de sobreposição real com qualquer parceiro, o precedente mais forte disponível |
| **New Zone × Roma Shopping** | **Baixa** | "Atacado" × "geral" — dois perfis amplos, precedente real (Roma Shopping) mostra 0% mesmo contra perfis mais estreitos |
| **New Zone × Atacado Connect** | **Baixa** | Mesma lógica — "atacado" tende a distribuir por volume/variedade, não por concentração em SKUs específicos comparáveis |

## Quais combinações geram o maior aumento de comparação de preços

**Resposta direta**: o cluster "Celulares/Eletrônicos gerais" — Cellshop, Mobile Zone, junto com os já conectados Shopping China e Mega Eletrônicos. É o único cluster com um precedente real medido de convergência (não uma suposição), e concentra 2 dos 6 merchants pendentes.

**O que não gera aumento significativo, segundo a mesma lógica de evidência**: adicionar merchants de perfil "geral"/"atacado" (New Zone, Casa Americana) — o precedente real mais forte disponível (Roma Shopping, catálogo de 372 produtos, perfil "geral", 0% de sobreposição com qualquer um dos outros 3) argumenta contra a expectativa de que catálogos amplos e não especializados gerem competição de preço, independentemente do volume.

## Nível de confiança desta matriz

Alto para os 4 pares medidos. Médio para os pares projetados — baseados em perfil de categoria declarado e em um único precedente real (n=1 par positivo, n=3 pares negativos) — suficiente para orientar prioridade, insuficiente para ser tratado como certeza. Cada merchant integrado deve gerar sua própria remedição real (mesmo padrão de `MARKETPLACE_OBSERVATORY_BASELINE.md`), substituindo projeção por medição assim que possível.
