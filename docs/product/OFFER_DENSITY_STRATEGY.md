# OFFER_DENSITY_STRATEGY.md
# PROGRAM Δ — Mission Δ-1 — Estratégia de Densidade de Ofertas

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08
**Base**: `docs/product/KPI_BASELINE.md` (Ω-4.0) + medição por merchant desta missão (`MARKETPLACE_COVERAGE_MAP.md`)

---

## Ponto de partida (medido, não estimado)

Offer Density hoje: **1,0046 ofertas por produto** (653 ofertas / 650 produtos). Na prática, cada produto tem exatamente uma loja vendendo — o Compare Engine, o ranking de ofertas e qualquer recomendação de "melhor preço" têm, hoje, quase nenhum material real para comparar.

## Por que este é o gargalo certo a atacar agora (não hipótese, decorrência direta de Ω-4.1)

Canonical Coverage está em 100% (`BEFORE_AFTER_BASELINE.md`) — o pré-requisito estrutural para comparação já existe. O que falta não é mecanismo, é **volume de oferta concorrente por produto canônico**. Um Recommendation Engine (`ROADMAP_2_0.md` Wave 2) construído agora, sobre 1,0046 ofertas/produto, teria dado estruturalmente insuficiente para recomendar "a melhor opção entre lojas" — porque na esmagadora maioria dos casos não há uma segunda opção.

## Metas quantitativas para o Launch (justificadas, não arbitrárias)

| Meta | Valor | Justificativa |
|---|---|---|
| **Offer Density média** | ≥1,5 ofertas/produto | Alcançável fechando só o Item 1 do `CONNECTOR_EXECUTION_BACKLOG.md` (Shopping China de 35 para ~1.000+ ofertas) — a nova densidade de Shopping China por si só desloca a média, mesmo sem nenhum merchant novo, **se e somente se** houver overlap de categoria real com os outros 3 (não confirmado — ver limitação abaixo) |
| **% de produtos com múltiplas ofertas** | ≥15% do catálogo | Hoje, com 4 merchants majoritariamente não-sobrepostos (`MARKETPLACE_COVERAGE_MAP.md`), esse número está estruturalmente próximo de 0%; a meta de 15% é alcançável apenas com merchants novos que **compitam** em categoria com os já existentes — ou seja, depende de priorizar merchants por overlap, não só por tamanho de catálogo |
| **% de produtos comparáveis** (≥2 ofertas, mesmo canonical) | ≥10% do catálogo | Consequência direta da meta acima — não é uma meta independente |
| **Categorias com maior concorrência esperada** | Eletrônicos, Informática | As 4 lojas ativas + os 6 candidatos Tier 1 convergem fortemente para essas 2 categorias (`Tier1_Merchants.md` §5, perfil de cada loja) — é onde a comparação de preço real primeiro vai existir |
| **Merchants com maior cobertura esperada** | Roma Shopping (7 departamentos, ~24k produtos reais) | Já é, por larga margem, o catálogo mais amplo entre os certificados — qualquer expansão futura de categoria no marketplace deve considerar o que Roma Shopping já cobre antes de priorizar um novo merchant para a mesma categoria |

## A limitação que estas metas herdam, honestamente

Toda meta acima assume que merchants novos (ou o Shopping China recertificado) vão **competir** em categoria com os 4 já ativos — mas `MARKETPLACE_COVERAGE_MAP.md` já registra que essa sobreposição nunca foi medida nominalmente. Isso não invalida as metas — apenas significa que a primeira validação real de "a densidade subiu porque há concorrência real, não porque há mais catálogo paralelo" só acontece depois da execução do `CONNECTOR_EXECUTION_BACKLOG.md`, remedindo Offer Density exatamente como `MARKETPLACE_OBSERVATORY_BASELINE.md` já prescreve (remedir a cada Wave concluída).

## Meta para a VISION 2035 (herdada de `KPI_BASELINE.md`, não redefinida aqui)

3+ ofertas por produto nas categorias mais populares — reflexo de concorrência de preço real entre lojas da fronteira, o estado descrito em `BUSINESS_MODEL.md` §4 como o ponto em que o flywheel de efeito de rede realmente acelera.
