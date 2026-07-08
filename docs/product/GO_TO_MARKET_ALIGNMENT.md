# GO_TO_MARKET_ALIGNMENT.md
# PROGRAM Ξ — Mission Ξ-1 — Parte 8: Alinhamento de Go-To-Market

**Categoria**: `docs/product/` (companion de Program Ω/Δ/Ξ)
**Data**: 2026-07-08
**Base**: todo critério abaixo referencia uma métrica já definida e medível (`MARKETPLACE_TRUTH_REPORT.md`, `docs/product/KPI_BASELINE.md`) — nenhum marco é "sentir que está pronto".

---

## Beta Fechado

**Critério**: infraestrutura operacional + prova de conceito de comparação real, mesmo que mínima.

| Critério objetivo | Meta | Estado hoje |
|---|---|---|
| Marketplace Density Score | ≥80/100 | ✅ 83,2/100 (Δ-3) |
| Canonical Coverage | 100% | ✅ 100% (Δ-3) |
| Pelo menos 1 comparação de preço real e verificável | ≥1 | ✅ 1 (Shopping China × Mega Eletrônicos) |
| Conectores ativos sem falha | ≥4 | ✅ 4/4, 0 falhas (Δ-2) |

**Status: Beta Fechado — critérios já atendidos hoje**, com a ressalva de que "sincronização automática" ainda depende de execução scriptada manual (`PRODUCTION_ACTIVATION_REPORT.md`) — aceitável para Beta Fechado (equipe interna/parceiros próximos, tolerância a operação manual), não para estágios seguintes.

## Beta Público

**Critério**: comparação de preço em volume suficiente para um usuário externo, não só um caso isolado.

| Critério objetivo | Meta | Estado hoje |
|---|---|---|
| Produtos comparáveis (2+ ofertas) | ≥50 | ❌ 4 (`MARKETPLACE_TRUTH_REPORT.md`) |
| Offer Density | ≥1,05 | ❌ 1,0024 |
| Merchants ativos | ≥6 | ❌ 4 |
| Pelo menos 1 categoria em estado "Parcial" ou melhor | ≥1 | ✅ Notebooks/Informática (`CATEGORY_DOMINATION_PLAN.md`) |
| AI Readiness Score | ≥40/100 | ❌ 34,2/100 |

**Status: Não atingido.** Depende diretamente de `EXECUTION_WAVES.md` Wave Ξ-1 (Cellshop + Nissei) — é a Wave dimensionada especificamente para mover Produtos Comparáveis e Offer Density.

## Launch Candidate

**Critério**: pelo menos 2 categorias inteiras dominadas (pela definição de `CATEGORY_DOMINATION_PLAN.md`), rede de merchants competindo de verdade.

| Critério objetivo | Meta | Estado hoje |
|---|---|---|
| Categorias dominadas | ≥2 | ❌ 0 |
| Merchants ativos | ≥8 de 10 Tier 1 | ❌ 4 |
| Offer Density | ≥1,5 | ❌ 1,0024 |
| Produtos comparáveis | ≥15% do catálogo | ❌ 0,32% |
| Sincronização automática ponta-a-ponta (sem execução manual) | Sim | ❌ Não — bloqueado por limite de `maxDuration` da Vercel (`PRODUCTION_ACTIVATION_REPORT.md`), requer decisão de arquitetura fora do escopo de todas as missões até aqui |

**Status: Não atingido.** Depende de `EXECUTION_WAVES.md` Ξ-1 a Ξ-4 completas **e** de uma decisão de arquitetura para o gargalo de sincronização automática — a única barreira nesta lista que nenhuma Wave de aquisição de merchant resolve sozinha.

## General Availability (GA)

**Critério**: os 10 merchants Tier 1 resolvidos (conectados ou formalmente encerrados como Data Partnership ativa), maioria das categorias de `CATEGORY_DOMINATION_PLAN.md` dominadas, operação contínua sem intervenção manual.

| Critério objetivo | Meta | Estado hoje |
|---|---|---|
| Merchants Tier 1 resolvidos | 10 de 10 | 4 de 10 |
| Categorias dominadas | ≥6 de 9 mapeadas | 0 |
| Offer Density | ≥3,0 (meta de `OFFER_DENSITY_STRATEGY.md`, Δ-1, para VISION 2035) | 1,0024 |
| Sincronização 100% automática | Sim | Não |
| AI Readiness Score | ≥70/100 | 34,2/100 |

**Status: Não atingido**, nem esperado nesta fase — GA é o horizonte final desta estratégia, não um marco de curto prazo.

## Leitura consolidada

O ParaguAI está hoje exatamente na fronteira entre **Beta Fechado** (atingido) e **Beta Público** (não atingido) — e a distância entre os dois é medida, não vaga: 46 produtos comparáveis a mais, Offer Density subindo de 1,0024 para 1,05. `EXECUTION_WAVES.md` Wave Ξ-1 é dimensionada precisamente para essa distância.
