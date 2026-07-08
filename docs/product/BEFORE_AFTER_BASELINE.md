# BEFORE_AFTER_BASELINE.md
# PROGRAM Δ — Mission Ω-4.1 — Canonical Bootstrap: Before / After

**Categoria**: `docs/product/` (companion de Program Ω)
**Data da execução**: 2026-07-08
**Comando executado**: `npm run canonical-catalog:bootstrap` (dry-run, validação) seguido de `npm run canonical-catalog:bootstrap:execute` (escrita real)
**Script**: `scripts/canonical-catalog-bootstrap.ts` — já existente desde a Release 1.7 Wave 4, nenhuma linha alterada por esta missão

---

## Métricas obrigatórias — Before / After

| Métrica | Before (Ω-4.0, mesmo dia) | After (esta execução) | Delta |
|---|---|---|---|
| **Canonical Coverage** (produtos) | 36 / 650 (5,5%) | 650 / 650 (**100%**) | +614 produtos, +94,5 p.p. |
| **Products Without Canonical** | 614 | **0** | -614 |
| **Canonical Match Rate** (ofertas) | 39 / 653 (5,97%) | 653 / 653 (**100%**) | +614 ofertas, +94 p.p. |
| **Merge Candidates** | 0 | **0** | 0 (650 avaliações rodadas, nenhuma escreveu candidato — ver `MERGE_CANDIDATES_REPORT.md`) |
| **Confidence Distribution** | N/A (fila vazia) | N/A (fila continua vazia) | Sem dado — nenhum candidato foi gerado para distribuir |
| **Duplicate Groups** | 0 (nunca medido) | 0 (nenhum candidato → nenhum grupo) | 0 |
| **Processing Time** | N/A | Não instrumentado pelo script em si (sem timestamp de início/fim no log); observado empiricamente abaixo de 5 minutos de wall-clock para 650 produtos, incluindo dry-run + execução real | — |
| **Failed Matches** | N/A | 0 (relatado pelo próprio script: `Failed: 0`) | 0 |
| **Products Requiring Manual Review** | N/A (fila de `merge_candidates` nunca existiu) | 0 pendentes (fila continua vazia) | 0 |

## O que NÃO mudou (confirmado explicitamente, não assumido)

Toda métrica abaixo foi remedida após a execução e está **idêntica** ao valor de `KPI_BASELINE.md` (Ω-4.0) — evidência direta de que a execução não teve efeito colateral fora do escopo pretendido:

| Métrica | Before | After |
|---|---|---|
| Products total | 650 | 650 |
| Products with image / brand / category | 648 / 650 / 650 | 648 / 650 / 650 |
| Offers total | 653 | 653 |
| Offers in_stock true/false | 552 / 101 | 552 / 101 |
| Offers with ≥1 offer per product (distinct product_id) | 649 | 649 |
| Price History total / distinct offer | 618 / 615 | 618 / 615 |
| Brands / Categories total | 140 / 175 | 140 / 175 |
| Stores (total/discovered/admin/verified/active) | 6/0/6/6/6 | 6/0/6/6/6 |
| Merchant Stores (claimed) | 0 | 0 |
| Connectors total | 4 | 4 |
| Connector sync runs | 19 (18 success) | 19 (18 success) |

Nenhum produto, oferta, marca, categoria, histórico de preço, loja, merchant ou conector foi criado, alterado ou removido por esta execução — exatamente o escopo restrito pela missão.

## Sumário do próprio script (log real, não reconstruído)

```
Mode: EXECUTE
Products processed    : 650
Canonical created     : 614
Canonical pre-existed : 36
Offers linked         : 614
Merge suggestion runs : 650
Failed                : 0
Data written to Supabase.
```

## Leitura honesta do resultado

**O que a execução prova**: a hipótese central da Mission Ω-4.0 estava correta — o gap de 94,5 pontos percentuais em Canonical Coverage era inteiramente um problema de **execução pendente**, não de algoritmo, heurística ou arquitetura. Rodar o script já existente, sem tocar em uma linha de código, fechou o gap por completo.

**O que a execução não prova (e não deveria)**: que o catálogo está livre de duplicatas. Zero `MergeCandidate` gerados em 650 avaliações é consistente com duas explicações — (1) o catálogo de fato não tem duplicatas reais hoje (plausível: os produtos observados durante o dry-run, ex. vários itens distintos da marca Cuisinart — cafeteira, moedor, faca elétrica — são genuinamente produtos diferentes, não o mesmo produto duplicado), ou (2) a heurística de confiança está mais conservadora do que deveria. Esta execução não tem evidência para distinguir as duas — ver `MERGE_CANDIDATES_REPORT.md`.
