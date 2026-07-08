# MARKETPLACE_HEALTH_AFTER_ACTIVATION.md
# PROGRAM Δ — Mission Δ-2 — Marketplace Health: Before / After

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08 — medição read-only direta contra produção, mesmo script de `Ω-4.0`/`Δ-1`

---

## Before (fim da Mission Ω-4.1) → After (fim da Mission Δ-2)

| Métrica | Before | After | Delta |
|---|---|---|---|
| Products | 650 | **1.263** | +613 (+94,3%) |
| Products with image | 648 (99,7%) | 1.251 (99,05%) | +603 |
| Products with brand | 650 (100%) | 1.263 (100%) | +613 |
| Products with category | 650 (100%) | 1.263 (100%) | +613 |
| Offers | 653 | **1.266** | +613 (+93,9%) |
| Offers with canonical | 653 (100%) | 1.012 (79,9%) | ver nota¹ |
| Canonical products | 650 | 1.009 | +359 |
| Merge candidates | 0 | 0 | 0 (1.650 avaliações acumuladas, ainda zero) |
| Offers in stock | 552 | 1.088 | +536 |
| Offers out of stock | 101 | 178 | +77 |
| Price History (registros) | 618 | 1.258 | +640 |
| Brands | 140 | 199 | +59 |
| Categories | 175 | 305 | +130 |
| Connector sync runs | 19 (18 success) | 24 (23 success) | +5 (+5 success) |
| **Offer Density** | **1,0046** | **1,0024** | **-0,0022 (essencialmente estável)** |

¹ Canonical Coverage caiu em termos percentuais porque 613 produtos novos entraram sem canonical ainda; um segundo bootstrap (mesmo script de Ω-4.1, reexecutado nesta missão) recuperou 359 deles. 254 permanecem sem canonical — limitação real do script (consulta sem paginação, cap de 1.000 linhas por chamada Supabase), descoberta nesta missão, não corrigida (exigiria alterar o script).

## O achado mais importante desta remedição

**Offer Density não melhorou, apesar do catálogo quase dobrar.** 613 produtos novos entraram, mas a razão oferta/produto permaneceu praticamente idêntica (1,0046 → 1,0024). Isso confirma, com dado real, a ressalva que `OFFER_DENSITY_STRATEGY.md` (Mission Δ-1) já havia nomeado como não verificada: crescer o catálogo dos mesmos 4 merchants, sem overlap de categoria entre eles, adiciona **cobertura**, não **concorrência de preço**. O objetivo central do marketplace (comparar preços entre lojas) não avançou nesta execução — só a amplitude do catálogo avançou.

## Marketplace Density Score — recálculo (mesma fórmula de `MARKETPLACE_OBSERVATORY_BASELINE.md`)

| Fator | Peso | Before | After |
|---|---|---|---|
| Images per Product | 20% | 99,7% → 19,9 | 99,05% → 19,8 |
| Categories Coverage | 15% | 100% → 15,0 | 100% → 15,0 |
| Brand Coverage | 15% | 100% → 15,0 | 100% → 15,0 |
| Canonical Coverage | 25% | 5,5%* → 1,4 | 79,9% → 20,0 |
| Offer Density (meta=3,0) | 25% | 33,5% → 8,4 | 33,4% → 8,3 |
| **Score total** | | **~59,7*** | **~78,1** |

*Nota: o "Before" da tabela de Score usa o baseline de Ω-4.0 (antes do bootstrap canônico), não o de Ω-4.1 — mantido assim para mostrar a trajetória completa desde a primeira medição.

**+18,4 pontos**, inteiramente vindos de Canonical Coverage. Offer Density — o único fator que mede concorrência real de preço — está estagnado e é agora, por larga margem, o fator que mais segura o score total.

## Conector Health / Crawl Health

Todos os 4 conectores: 0 falhas em 800 itens processados nesta missão (`CONNECTOR_RECERTIFICATION_REPORT.md`). Sync runs totais 19 → 24, taxa de sucesso mantida em ~96%.

## Price Freshness

`price_history` cresceu de 618 para 1.258 registros — mas isso reflete majoritariamente **primeiro registro** de itens novos (640 registros novos ≈ 640 itens novos persistidos), não profundidade de série temporal para itens já existentes. Price Freshness real (via `FreshnessEngine`) não foi recalculada nesta missão — mesma ressalva já registrada em `KPI_BASELINE.md`.
