# MARKETPLACE_DASHBOARD.md
# Program Φ (Phi) — Mission Φ-1 — Continuous Comparability Optimization

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Auditoria de dashboard existente + proposta de extensão (não construída — proposta, respeitando a restrição "NÃO criar migrations" desta Mission). A maior parte do que o Objetivo 4 pede **já existe em produção**.

---

## 1. O que já existe (auditado, não reconstruído)

`/admin/marketplace-operations` (`app/admin/marketplace-operations/page.tsx`, Release 1.8 Program 0 Wave 1, Epic 7) já é um painel operacional real, com 5 abas:

| Aba | Widget | Cobre |
|---|---|---|
| Visão Geral | `HealthScoreGauge`, `FactorBreakdownTable` | Marketplace Health Score + os 8 fatores |
| Cobertura | `CoverageGapList`, `KpiRow` | gaps de categoria/cobertura |
| Conectores | `ConnectorHealthTable` | saúde/erro/freshness por merchant |
| Prioridade | `MerchantPriorityTable` | ranking de merchant por impacto (`MerchantPriorityService`) |
| Alertas | `AlertsList` | `MarketplaceAlertService` — acknowledge/resolve/ignore |

Fonte única: `GET /api/admin/marketplace-operations/dashboard/overview`, composta server-side pelo `MarketplaceOperationsDashboardService` (`Promise.allSettled`, mesmo padrão de isolamento do `MarketplaceHealthEngine`).

**Histórico já persistido**: `MarketplaceSnapshotService.recordDaily()` grava 1 snapshot/dia via `GET /api/cron/marketplace-operations/snapshot`, agendado em `vercel.json` (`0 7 * * *`, cron nativo — permitido porque é diário, ao contrário dos crons de alta frequência que precisaram ser desacoplados para GitHub Actions, ADR-052). `MarketplaceSnapshotService.getHistory(days)` já existe para consumir essa série.

**Merge Queue já tem painel próprio**: `/admin/merge-execution` (Program Ω, Mission Ω-1) — aprovação/execução/rollback de `merge_candidates`, fora do escopo de `marketplace-operations` por desenho (comentário no código: "Growth/Analytics/Claims/Canonical-merge review já têm lares dedicados... este dashboard não os reincorpora").

## 2. O que o Objetivo 4 pede e ainda não existe

Comparando os 5 pontos pedidos ("evolução dos KPIs", "novos merges", "novos comparáveis", "categorias melhorando/degradando", "merchants com pior/maior ganho") contra o que está construído:

| Pedido | Status real |
|---|---|
| Evolução dos KPIs (Health, AI Readiness, contagens básicas) | **Já existe** — `MarketplaceSnapshotService` + cron diário |
| Evolução de CPC / Merge Queue Depth / Category Fragmentation / Attribute Coverage | **Não existe** — `MarketplaceMetricsSnapshot` (`src/domains/marketplace-operations/types/metrics.types.ts`) não tem esses campos; só `coveragePct` genérico |
| Novos merges (execuções do dia) | **Parcial** — `merge_executions` é append-only com `executed_at`, dado existe, mas `/admin/merge-execution` não tem uma view "hoje vs. ontem" |
| Novos comparáveis (CPC delta) | **Não existe** — `cpc-report.ts` é um snapshot pontual, sem histórico |
| Categorias melhorando/degradando | **Não existe** — nenhuma tabela guarda `category_id → coverage` ao longo do tempo |
| Merchants com pior/maior qualidade e ganho | **Parcial** — `MerchantPriorityService` já rankeia por impacto atual, mas não por *variação* |

## 3. Proposta (arquitetura, não implementação)

Dois caminhos, em ordem de esforço:

### 3a. Sem migration (disponível hoje)
Adicionar uma 6ª aba **"Comparabilidade"** a `/admin/marketplace-operations`, reaproveitando os widgets existentes (`KpiRow` já genérico o suficiente), alimentada por uma rota nova que só chama os scripts já existentes como serviços (`cpc-report`, `merge-audit-report` já são funções puras sobre repositórios existentes, só empacotadas como scripts CLI hoje — extrair a lógica para um serviço chamável por uma API route é refactor, não algoritmo novo). Mostra o **snapshot atual** de CPC/Merge Queue/Taxonomy/Attribute — sem histórico ainda, mas sem exigir schema novo.

### 3b. Com migration (requer autorização do CTO, fora do escopo desta Mission)
Estender `MarketplaceMetricsSnapshot`/`marketplace_health_snapshots` com os campos que faltam (`cpcPct`, `mergeQueueDepth`, `categoryFragmentationRatio`, `attributeCoveragePct`) — mesma tabela, novas colunas aditivas, mesmo padrão idempotente por `snapshot_date` que já existe. Isso é o que habilitaria de fato "evolução dos KPIs" e "categorias melhorando/degradando" com histórico real, não só o dia atual.

**Esta Mission não implementa 3a nem 3b** — ambas são recomendação para a próxima Wave que tocar `marketplace-operations/`, com o caminho técnico já mapeado para não exigir descoberta nova quando for autorizada.

## 4. Merchants com maior ganho — leitura possível hoje sem nova infraestrutura

Sem histórico persistido, uma leitura direta do baseline atual já responde parcialmente "merchant com maior ganho potencial": comparando `Offer Density` por merchant (`cpc-report.ts` §Per-store) contra `Merchant Overlap Matrix` (mesmo relatório), **roma-shopping** (1.564 ofertas, overlap real = 0 com os outros 4 merchants substanciais) é o maior catálogo hoje sem nenhum comparável — ver `MARKETPLACE_FEEDBACK_LOOP.md` Regra 2. Isso não exige dashboard novo, só a leitura correta do relatório já existente.
