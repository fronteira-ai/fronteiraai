# MARKETPLACE_OBSERVATORY_BASELINE.md
# PROGRAM Ω — Mission Ω-4.0 — Marketplace Observatory v1

**Categoria**: `docs/product/` (companion de Program Ω)
**Natureza**: Especificação do mecanismo de observação contínua da densidade do marketplace — a diferença entre isto e `MARKETPLACE_BASELINE.md` é que aquele é a fotografia; este é a **câmera**: como e quando a próxima fotografia deve ser tirada, e o que fazer com a série ao longo do tempo.
**Status**: v1 — especificação + primeira medição real (esta Wave). Implementação de UI/dashboard **não construída** nesta missão (restrição explícita: nenhuma funcionalidade nova).

---

## O que é o Marketplace Observatory

Não é um domínio novo, não é uma tabela nova, não é uma feature. É o **processo** de reexecutar a mesma medição (`database/health_checks/marketplace_density.sql`) em cadência regular e comparar contra a série histórica — mesma disciplina já usada por `marketplace_health_snapshots` (Release 1.8 Program 0 Wave 1), só que para os KPIs de densidade que essa tabela não cobre hoje (canonical coverage, image coverage, brand/category fragmentation, merge queue).

**Princípio central, herdado de `MISSION_OMEGA_4_EXECUTION_BLUEPRINT.md` §4**: reuso, não construção nova. Este documento especifica; não implementa.

---

## v1 — o que existe agora

1. **A query reproduzível**: `database/health_checks/marketplace_density.sql` — mesmo padrão de `rls.sql`/`policies.sql`/`storage_buckets.sql` já existentes na mesma pasta.
2. **A primeira medição real**: `KPI_BASELINE.md` (2026-07-08) — ponto zero da série.
3. **A leitura interpretada**: `MARKETPLACE_BASELINE.md` — a mesma medição, em prosa, com riscos nomeados.

O que **não** existe ainda (proposto para uma Wave de execução futura, explicitamente fora desta missão):

- Uma tabela de snapshot dedicada (`marketplace_density_snapshots`, por analogia a `marketplace_health_snapshots`) — exigiria uma migration, fora da restrição desta Wave ("não executar migrações").
- Uma aba de UI no `/admin/marketplace-operations` — exigiria código novo, fora da restrição ("não criar funcionalidades").
- Um cron dedicado — mesma razão.

## Cadência proposta (recomendação, não implementada)

| Cadência | O que rodar | Por quê |
|---|---|---|
| A cada Wave de densidade concluída (Ω-4.1 a Ω-4.7) | `database/health_checks/marketplace_density.sql` completo | Medir o efeito real da Wave — nenhuma Wave se declara concluída sem remedição, mesma disciplina de Quality Gate já usada em toda Wave de engenharia |
| Semanal (uma vez ativada) | Subconjunto: Offer Density, Canonical Coverage, Claimed Stores | Os 3 KPIs mais diretamente ligados ao trabalho ativo de Program Ω + Ω-4.1 |
| Mensal | Medição completa, comparada contra a baseline anterior | Série histórica para visualizar tendência, não só ponto |

## Marketplace Density Score — cálculo proposto (v1, sobre os números desta baseline)

Agregado ponderado simples, mesma lógica de composição já usada em `MarketplaceHealthEngine` (múltiplos fatores, pesos documentados, `Promise.allSettled`-style isolamento de falha de um fator não derruba o score):

| Fator | Peso | Valor nesta baseline | Contribuição |
|---|---|---|---|
| Images per Product | 20% | 99,7% | 19,9 |
| Categories Coverage (preenchimento) | 15% | 100% | 15,0 |
| Brand Coverage (preenchimento) | 15% | 100% | 15,0 |
| Canonical Coverage | 25% | 5,5% | 1,4 |
| Offer Density (normalizado, meta=3,0) | 25% | 1,0046/3,0 → 33,5% | 8,4 |
| **Marketplace Density Score v1** | 100% | | **≈ 59,7 / 100** |

**Leitura honesta do número**: um score de ~60/100 reflete exatamente o que `MARKETPLACE_BASELINE.md` descreve em prosa — os campos básicos (imagem, marca, categoria) estão bem preenchidos, mas os dois fatores que realmente definem se o marketplace "funciona" como comparador (Canonical Coverage e Offer Density) estão baixos o suficiente para puxar o composto para baixo. Isso é o comportamento correto de um score honesto — não deveria estar alto ainda.

**Pesos são uma proposta desta Wave, não uma decisão final** — ajustar exige apenas editar este documento (Tipo 2, `NORTH_STAR.md` §12), não uma ADR.

---

## Como este Observatory se relaciona com engines já existentes

| Engine já existente | Continua sendo dono de | O que o Observatory adiciona |
|---|---|---|
| `MarketplaceHealthEngine` | Score de saúde operacional (8 fatores: uptime, sucesso de sync, etc.) | Nada — não duplicado. O Density Score acima é um score diferente, sobre dado de catálogo, não sobre operação de conector |
| `FreshnessEngine`/`VolatilityEngine` | Frescor e volatilidade de preço | Nada — o Observatory referencia a saída dessas engines quando disponível, não recalcula |
| `ConnectorHealthService`/`MerchantPriorityService` | Qualidade por merchant | Nada — mesma relação |
| `marketplace_health_snapshots` | Snapshot diário operacional | O Observatory propõe um snapshot **paralelo**, de densidade de catálogo — dimensão diferente, mesma cadência possível |

---

## Definition of Done desta Wave (Ω-4.0), conforme mandato do CTO

- [x] Todas as métricas fundamentais do ecossistema estão mensuráveis (`KPI_BASELINE.md` — todo KPI tem valor real ou está explicitamente marcado "requer engine"/"não medido nesta Wave" com o motivo).
- [x] Nenhum dado de produção foi alterado — toda query executada foi `SELECT`/`count`/`head:true`, nenhuma escrita.
- [x] Nenhuma migration executada.
- [x] Nenhuma funcionalidade criada — o Observatory é uma especificação + uma query, não uma feature.
- [x] Product Identity permanece em Shadow Mode — nenhum merge automático executado ou proposto para execução imediata.
- [x] Attribute Extraction não implementado — permanece nomeado como gap real (`MISSION_OMEGA_4_EXECUTION_BLUEPRINT.md` §5), não construído.

**Esta Wave está encerrada.** Nenhuma Wave subsequente (Ω-4.1 em diante) deve iniciar sem este baseline — que agora existe — ser lido primeiro.
