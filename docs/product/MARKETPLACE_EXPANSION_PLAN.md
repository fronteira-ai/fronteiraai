# MARKETPLACE_EXPANSION_PLAN.md
# PROGRAM Δ — Mission Δ-1 — Plano de Expansão do Marketplace

**Categoria**: `docs/product/` (companion de Program Ω)
**Data**: 2026-07-08
**Natureza**: Plano operacional. Nenhum conector implementado, nenhum banco alterado, nenhuma arquitetura tocada, nenhuma heurística modificada, nenhum ADR desnecessário criado.
**Companions**: `MERCHANT_PRIORITY_MATRIX.md`, `CONNECTOR_EXECUTION_BACKLOG.md`, `MARKETPLACE_COVERAGE_MAP.md`, `OFFER_DENSITY_STRATEGY.md`, `LAUNCH_GAP_ANALYSIS.md`

---

## 1. Onde estamos (herdado de Ω-4.0/Ω-4.1, não remedido aqui)

Infraestrutura pronta, densidade insuficiente. Canonical Coverage 100%, Connector Platform industrializado e provado 4 vezes, mas Offer Density em 1,0046 — o gargalo não é mais arquitetura, é execução de expansão.

## 2. Auditoria de conectores (resumo — detalhe em `MARKETPLACE_COVERAGE_MAP.md`)

| Connector | Status | Ofertas | Qualidade de dado | Última sync | Taxa de erro |
|---|---|---|---|---|---|
| Atacado Connect | Active, Certified | 206 | 99% imagem, 100% resto | 2026-07-04 | 0/4 falhas |
| Roma Shopping | Active, Certified | 205 | 100% | 2026-07-04 | 1/5 falhas (transitória, já conhecida) |
| Mega Eletrônicos | Active, Certified | 203 | 100% | 2026-07-04 | 0/4 falhas |
| Shopping China | Active, **não certificado** | 35 | 100% (mas volume muito abaixo do potencial) | 2026-07-04 | 0/6 falhas |

**Achado que muda a prioridade de todo este plano**: os 4 connectors funcionam sem erro, mas nenhum sincronizou nos últimos 4 dias, e Shopping China entrega uma fração pequena do seu catálogo real. O impacto imediato mais barato não vem de nenhum merchant novo — vem de terminar o que já está pago e funcionando.

## 3. Merchant Expansion Matrix

Ver `MERCHANT_PRIORITY_MATRIX.md` — reaproveita integralmente `docs/marketplace/Tier1_Merchants.md`/`docs/business/TIER1_PARTNERS.md`, não recria critérios.

## 4. Connector Backlog

Ver `CONNECTOR_EXECUTION_BACKLOG.md` — 4 itens organizados por impacto/esforço, nenhum implementado.

## 5. Marketplace Coverage Map

Ver `MARKETPLACE_COVERAGE_MAP.md` — cobertura real por merchant, vazios identificados.

## 6. Offer Density Strategy

Ver `OFFER_DENSITY_STRATEGY.md` — metas justificadas para o Launch e para 2035.

## 7. IA Readiness Impact

Cada frente de expansão deste plano se traduz diretamente em capacidade de IA já **arquitetada e esperando dado**, não em capacidade nova a construir:

| Aumento de cobertura | Serviço que já consome esse dado | Efeito direto na IA |
|---|---|---|
| Mais merchants (Shopping China recertificado, ou os 6 pendentes) | `CompareFoundationService`, `OfferRankingService` | Comparações deixam de ser triviais ("única opção") e passam a ter concorrência real entre lojas |
| Mais ofertas por produto canônico | `PriceIntelligenceService` (Market Intelligence, Release 1.8 Program C) | Savings Engine (`computeSavingsOpportunity`) passa a ter pares reais Loja X vs. Loja Y para calcular economia real — hoje, com 1 oferta/produto, essa função tem quase nada para comparar |
| Mais ciclos de sync (Item 2 do Backlog) | `CanonicalPriceHistoryService`, `FreshnessEngine`, `VolatilityEngine` | Histórico de preço deixa de ser um único ponto (`KPI_BASELINE.md` — 1,005 registros/oferta) e começa a virar série real — pré-requisito para qualquer resposta do tipo "esse preço está bom pra época do ano" (`AI_CONSTITUTION.md` §IX) |
| Mais categorias com concorrência real | `MarketPulseInsightsService`, `VolatilityRollupService` | Contexto agregado por categoria deixa de ser ruído estatístico (poucos pontos) e ganha significância |
| Mais produtos no catálogo | Busca, `/categorias`, SEO footprint (`BUSINESS_MODEL.md` §7) | Mais pontos de entrada orgânicos — efeito multiplicador fora da IA em si |

**Nenhuma dessas melhorias exige uma linha de código de IA nova** — todos os serviços já existem e já leem exatamente esses campos. É a definição operacional de "densidade de dado é o ativo, não a feature" (`AI_CONSTITUTION.md` §VI/§VII).

## 8. Launch Readiness

Ver `LAUNCH_GAP_ANALYSIS.md` — resposta: **não**, com 7 gaps nomeados e não genéricos.

## 9. Recomendação final — qual executar primeiro

**Ativar sync automático dos 4 connectors já certificados (`CONNECTOR_EXECUTION_BACKLOG.md` Item 2)**, seguido imediatamente pela **recertificação do Shopping China (Item 1)**.

**Justificativa, baseada em dados, não em preferência**:
- Ativar sync é a única ação deste plano com **custo zero de engenharia** (configuração de secrets já documentada, não código) e afeta os 4 connectors simultaneamente — maior razão impacto/esforço de todo o plano.
- Shopping China recertificado tem o maior potencial de ganho de Offer Density por esforço de qualquer item — reaproveita 100% de componentes já usados 3 vezes com sucesso (`SitemapParser`, pipeline fixo, sem stage novo), e o alvo (35 → potencialmente 1.000+) é a maior distância entre "o que existe" e "o que já foi provado possível" no backlog inteiro.
- Ambos são pré-condição para que qualquer meta de `OFFER_DENSITY_STRATEGY.md` seja sequer mensurável de forma justa — sem sync ativo, toda métrica futura mede um catálogo estagnado, não a densidade real do mercado.
- Nenhum dos dois compete por prioridade com Program Ω (crescimento de merchants novos) — podem rodar em paralelo, sem disputar o mesmo tempo de execução.

Os 6 merchants Tier 1 restantes (4 comerciais + 2 spikes) seguem em paralelo, sem bloquear os dois itens acima — `MERCHANT_PRIORITY_MATRIX.md` já define a ordem entre eles.
