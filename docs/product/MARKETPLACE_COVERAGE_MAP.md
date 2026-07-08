# MARKETPLACE_COVERAGE_MAP.md
# PROGRAM Δ — Mission Δ-1 — Mapa de Cobertura do Marketplace

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08 — medição read-only direta contra produção

---

## Cobertura por Merchant (medido diretamente)

| Merchant | Ofertas Ativas | % do Marketplace | Imagem | Marca | Categoria | Canonical | Última Sincronização |
|---|---|---|---|---|---|---|---|
| Atacado Connect | 206 | 31,5% | 99,0% | 100% | 100% | 100% | 2026-07-04 |
| Roma Shopping | 205 | 31,4% | 100% | 100% | 100% | 100% | 2026-07-04 (1 falha em 5 syncs) |
| Mega Eletrônicos | 203 | 31,1% | 100% | 100% | 100% | 100% | 2026-07-04 |
| Shopping China | 35 | 5,4% | 100% | 100% | 100% | 100% | 2026-07-04 |
| (demais — seed/admin) | ~4 | 0,6% | — | — | — | — | N/A |
| **Total** | **653** | **100%** | — | — | — | — | — |

**Achado central**: 3 merchants (Atacado Connect, Roma Shopping, Mega Eletrônicos) concentram 94% de todo o marketplace. Shopping China, apesar de ser o connector mais antigo, contribui apenas 5,4% — muito abaixo do que sua estimativa de catálogo sugere (`MERCHANT_PRIORITY_MATRIX.md`).

## Cobertura por Categoria (qualitativa — overlap real não medido)

| Merchant | Perfil de Categoria (auditoria técnica, `Tier1_Merchants.md`) |
|---|---|
| Atacado Connect | Informática/Eletrônicos, multi-nível |
| Roma Shopping | **Mais amplo dos 4** — 7 departamentos (Cozinha, Eletrônicos, Informática, Brinquedos, Roupa e Calçados, Beleza e Perfumaria, Bebidas) |
| Mega Eletrônicos | Eletrônicos, ~14 categorias top-level |
| Shopping China | Importados/Geral, ~20+ categorias declaradas (mas apenas 3 hardcoded ativas no connector real hoje — ver `CONNECTOR_EXECUTION_BACKLOG.md` Item 1) |

**Limitação honesta**: 175 categorias distintas existem no banco (`KPI_BASELINE.md`) para 650 produtos — este mapa não determina quantas dessas 175 se sobrepõem entre merchants (ex.: "Eletrônicos" da Mega vs. "Eletrônicos" da Atacado Connect podem ou não ser o mesmo `category_id`). Medir isso exigiria uma auditoria de categoria nominal, fora do escopo desta missão (que é planejamento, não uma nova análise de dado profunda).

## Cobertura por Marca (qualitativa)

Mesma limitação do item acima — 140 marcas distintas, distribuição por merchant não quebrada nesta medição. O que se sabe com certeza (`KPI_BASELINE.md`): 100% dos 650 produtos têm `brand_id` preenchido, mas a proporção de 140 marcas para 650 produtos (~4,6 produtos/marca) já sinaliza fragmentação possível — relevante para este mapa porque marca fragmentada entre merchants (ex.: "Xiaomi" grafado diferente em duas lojas) esconderia oportunidades reais de comparação de preço no Offer Density.

## Cobertura por Tipo de Produto

Não medida nesta missão — o schema não tem um campo de "tipo de produto" distinto de categoria (`types/product.ts` — `category_id` é o único campo de classificação). Registrado aqui como um vazio de modelagem, não um vazio de execução: se "tipo de produto" (ex.: "eletrônico" vs. "vestuário" como nível acima de categoria) se mostrar necessário, é uma decisão de schema, fora do escopo desta missão ("não alterar banco").

## Os maiores vazios do marketplace (conclusão)

1. **Vazio de merchant**: 6 dos 10 Tier 1 auditados não têm nenhuma oferta no marketplace hoje (4 bloqueados comercialmente, 2 pendentes de spike).
2. **Vazio de aproveitamento**: Shopping China está tecnicamente conectado mas entrega ~2–3,5% do seu potencial — o vazio não é falta de merchant, é execução incompleta de um merchant já parceiro.
3. **Vazio de frescor**: nenhum dos 4 connectors ativos sincronizou nos últimos 4 dias — o vazio cresce passivamente todo dia que o cron não roda, independente de qualquer novo merchant.
4. **Vazio de sobreposição real**: sem auditoria de categoria/marca nominal, não é possível hoje afirmar com confiança onde a concorrência de preço (Offer Density) realmente aumentaria com um novo merchant vs. onde apenas adicionaria catálogo paralelo sem comparação — ver `OFFER_DENSITY_STRATEGY.md`.
