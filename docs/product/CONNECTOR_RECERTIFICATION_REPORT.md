# CONNECTOR_RECERTIFICATION_REPORT.md
# PROGRAM Δ — Mission Δ-2 — Recertificação dos 4 Conectores

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08
**Método**: execução real (`--execute`, não dry-run) de cada script já existente (`npm run sync:<conector>:execute`), fora do caminho da rota de cron (ver `PRODUCTION_ACTIVATION_REPORT.md` — a rota tem uma limitação real de timeout). Nenhum código alterado.

---

## Evidência por conector

| Conector | Recebidos | Novos Persistidos | Já Existentes (skip) | Falhas | Duração |
|---|---|---|---|---|---|
| Mega Eletrônicos | 200 | 74 | 126 | 0 | ~3min |
| Roma Shopping | 200 | 168 | 32 | 0 | ~3min |
| Atacado Connect | 200 | 198 | 2 | 0 | ~3min |
| Shopping China | 200 | 200 | 0 | 0 | 113s |
| **Total** | **800** | **640** | **160** | **0** | — |

**Zero falhas em 800 itens processados across 4 conectores.** Todo item deduplicado corretamente (nenhum duplicado criado — confirmado pelo balanço `deduplicated = persisted + skipped` em cada execução).

## Confirmação por dimensão (mandato da missão)

| Dimensão | Confirmado? | Evidência |
|---|---|---|
| Execução automática | **Parcial** — auth e opt-in corrigidos, mas a rota de cron não completa dentro do timeout (ver `PRODUCTION_ACTIVATION_REPORT.md`); execução real comprovada via script direto | `connector_sync_runs` com 4 novas execuções `dry_run:false`, `status:success` |
| Atualização de preços | Sim | `price_history.total`: 618 → 1258 (+640, um registro por item novo persistido) |
| Atualização de produtos | Sim | `products.total`: 650 → 1263 (+613) |
| Atualização de ofertas | Sim | `offers.total`: 653 → 1266 (+613) |
| Atualização de imagens | Sim, com ressalva | 1251/1263 produtos com imagem (99,05%) — os 4 conectores capturam `image_url` via `MediaStage`, confirmado pelas contagens de sucesso do estágio `media` em cada execução |
| Atualização de categorias | Sim, com ressalva de qualidade | 1263/1263 (100%) preenchido, mas `categories.total` cresceu de 175 para 305 (+130) — mesmo risco de fragmentação já nomeado em `KPI_BASELINE.md`, agora maior em volume absoluto |

## Achado colateral: Market Change Detection está genuinamente ativo

Cada execução relatou dezenas a centenas de eventos no estágio `market-change-detection` (140 a 400 por conector) — confirmação real, não presumida, de que `market_changes` está recebendo eventos de mudança de mercado de verdade a cada sync, alimentando `FreshnessEngine`/`VolatilityEngine`/Market Pulse.

## O que NÃO foi tocado

`ProductIdentityEngine`, heurísticas de confiança, schema, connectors novos, IA. Toda mudança observada é resultado de rodar código já existente e já certificado (Release 1.8 Program D) contra os merchants reais que já tinham conector — nenhuma linha de `src/domains/connectors/` foi editada para produzir este resultado.
