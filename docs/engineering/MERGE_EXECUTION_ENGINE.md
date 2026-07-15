# MERGE_EXECUTION_ENGINE.md
# Program Ω — Mission Ω-1 — Canonical Merge Execution Engine

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-14
**Status**: Implementado e quality-gated (lint/typecheck/test/build 100% verde). Execução real contra produção depende de autorização explícita do CTO — ver `docs/engineering/MERGE_OPERATIONS.md`.

---

## 1. O gap que esta Mission fecha

`docs/product/RELEASE_2_FOUNDATION_COMPLETE.md` §10 nomeava isto como pendência conhecida desde o Release 1.7: *"Executor de merge do Product Identity — `IMergeCandidateRepository` não tem método que efetivamente funda dois `canonical_products`; um `MergeCandidate` aprovado hoje não move CPC."* A rota `PATCH /api/admin/canonical-catalog/merge-candidates/[id]` já existia, mas só gravava um status — "aprovar" não tinha efeito nenhum no catálogo. 3.106 `merge_candidates` reais existiam (Fase 2 Sprint 2.8), zero executados.

Esta Mission implementa exatamente o executor, e nada além dele — **zero mudança em `ProductIdentityEngine`, `CanonicalMergeSuggestionService` ou qualquer lógica de matching**. Todo candidato que o executor processa já foi gerado por infraestrutura existente (Program Κ/Λ); este Engine só sabe fazer uma coisa: dado um candidato já **aprovado por um humano**, mover dado real e registrar auditoria — de forma sempre reversível.

## 2. Shadow Mode é preservado, não suspenso

A doutrina permanente (`docs/product/RELEASE_2_FOUNDATION_COMPLETE.md` §5: *"Shadow Mode permanente para Product Identity — o `ProductIdentityEngine` nunca funde produtos automaticamente"*) continua válida. `MergeExecutorService.execute()` **recusa executar qualquer candidato que não esteja em status `Approved`** — e `approve()` é sempre uma ação humana explícita (via admin panel ou uma decisão de lote nomeada pelo CTO), nunca um efeito colateral automático da classificação de confiança. Alta confiança (`≥95%`) não pula a fila — só muda a prioridade de revisão.

## 3. Modelo de dados

Migration: `supabase/migrations/20260714130000_merge_execution_engine.sql`.

- **`canonical_products.is_active` / `merged_into_id`** (novas colunas) — um merge nunca é um `DELETE`. A linha "source" permanece para sempre, só marcada `is_active=false` e `merged_into_id` apontando para o "target" (survivor). Isso é o que torna todo merge reversível por construção.
- **`merge_candidates.status`** — CHECK estendido de 4 para 6 valores: `pending`, `approved`, `rejected`, `ignored` (já existiam) + **`merged`**, **`rolled_back`** (novos — fecham o ciclo de vida Pending→Approved→Merged/Rejected, ou Merged→RolledBack).
- **`merge_executions`** (nova tabela, append-only) — o log de auditoria de cada execução real: `source_canonical_product_id`, `target_canonical_product_id`, **`moved_offer_ids` (jsonb)** — a lista exata de offers movidos nesta execução, nunca re-derivada de "offers hoje ligados ao target" (um merge posterior no mesmo target tornaria essa inferência errada). `status` (`executed`/`rolled_back`), `executed_by`/`executed_at`, `rolled_back_by`/`rolled_back_at`.

**Raio de impacto de um merge**: confirmado por auditoria de código antes de escrever a migration — a única FK que referencia `canonical_products.id` é `offers.canonical_product_id`. Nenhuma outra tabela (`price_history`, `market_changes`) referencia `canonical_products` diretamente. Um merge move exatamente essa FK, nada mais.

## 4. Arquitetura de código

Tudo em `src/domains/canonical-catalog/` — o domínio já dono de `CanonicalProduct`/`MergeCandidate`, nunca `product-identity/` (que continua sem saber que um executor existe, por desenho de dependência: `product-identity/` → `canonical-catalog/`, nunca o contrário).

```
src/domains/canonical-catalog/
  domain/MergeExecution.ts
  repositories/IMergeExecutionRepository.ts
  infrastructure/SupabaseMergeExecutionRepository.ts
  services/MergeAuditService.ts          — Objetivo 1 (classificação)
  services/MergeExecutorService.ts       — Objetivo 2 (approve/reject/preview/execute/rollback)
  services/MergeQueueDashboardService.ts — Objetivo 4 (stats do painel)
```

`ICanonicalCatalogRepository` ganhou 5 métodos aditivos: `findOfferIdsByCanonicalProductId` (leitura, para preview), `reassignOffers` (UPDATE...RETURNING atômico, usado pela execução real), `reassignOffersByIds` (rollback — repointa exatamente os ids gravados na auditoria, nunca "tudo que está no target hoje"), `deactivateAndMerge`, `reactivate`.

### `MergeAuditService` (Objetivo 1)

Reclassifica cada candidato `pending` usando os limiares de confiança **já aprovados pelo CTO** (`product-identity/types/enums.ts`: `auto=95, probable=85, possible=70`) — deliberadamente duplicados (não importados; `canonical-catalog/` nunca depende de `product-identity/`, mesma regra que já protege `MergeCandidatePenalty`). Alta ≥95%, Média 85–94%, Revisão manual 70–84% (piso já garantido pelo `CanonicalMergeSuggestionService`, que só grava candidatos ≥70%). Zero algoritmo novo.

### `MergeExecutorService` (Objetivo 2)

- `approve(candidateId, reviewedBy)` / `reject(...)` — guardas de máquina de estado: só age sobre um candidato `Pending`.
- `preview(candidateId)` — dry-run puro. Valida integridade (fonte/destino existem, não são o mesmo, nenhum já foi mesclado) e retorna exatamente quais offers moveriam, **sem escrever nada**.
- `execute(candidateId, executedBy)` — exige `status=Approved`. Ordem: `reassignOffers` (atômico, `UPDATE...RETURNING`) → `deactivateAndMerge` (marca source inativo) → grava `merge_executions` → flip do candidato para `Merged`.
- `executeBatch(candidateIds, executedBy)` — sequencial (nunca paralelo — dois candidatos que compartilham o mesmo target não podem correr concorrentemente sem risco de condição de corrida), isola falha por candidato (nunca aborta o lote inteiro por um erro).
- `rollback(executionId, rolledBackBy)` — reverte exatamente o que aquela execução moveu.

### `MergeQueueDashboardService` (Objetivo 4)

Compute-on-read (mesmo padrão de `ExchangeDashboardService`/`RealtimeCommerceDashboardService`) — nenhuma tabela de agregação nova. `successRate` é `null`, nunca `0`/`100` fabricado, quando ainda não houve nenhuma tentativa (`merged + rolledBack === 0`) — mesma disciplina que corrigiu `ExchangeProviderHealthService` no Release 1.8.

## 5. API

`app/api/admin/canonical-catalog/merge-execution/`: `GET /audit`, `GET /queue?status=`, `GET /stats`, `GET /executions?status=`, `POST /[candidateId]/approve`, `POST /[candidateId]/reject`, `POST /[candidateId]/execute?dryRun=`, `POST /execute-batch` (body `{limit, dryRun}` — só processa candidatos já `Approved`), `POST /executions/[executionId]/rollback`.

A rota pré-existente `PATCH /api/admin/canonical-catalog/merge-candidates/[id]` **não foi alterada nem removida** — continua gravando só um status, sem efeito. As novas rotas `merge-execution/*` são o caminho real; nada as consome ainda além do painel novo (`/admin/merge-execution`), então não há conflito de comportamento com nenhum consumidor existente.

## 6. Painel operacional (Objetivo 4)

`app/admin/merge-execution/page.tsx` — 5 abas: Auditoria (Pendentes, com classificação Alta/Média/Manual e botões Aprovar/Rejeitar), Aprovados (Preview dry-run + Executar), Executados (com botão Reverter), Rejeitados, Rollback. Tiles de estatística no topo (pendentes/aprovados/merged/rejeitados/rollback/ofertas movidas/taxa de sucesso).

## 7. O que este Engine deliberadamente não faz

- Não gera novos `MergeCandidate`s (isso é `CanonicalMergeSuggestionService`, intocado).
- Não recalcula confiança nem re-executa `ProductIdentityEngine.evaluate()`.
- Não aprova automaticamente candidatos de alta confiança — cada aprovação é uma decisão humana registrada (`reviewed_by`).
- Não corrige a fragmentação de categoria (929 linhas, Program Κ) — o executor só move o que já foi aprovado; se a fila de candidatos aprovados estiver estruturalmente pequena (Sprint 2.7 já provou isso via simulação de 11,28M pares), o Engine não pode compensar isso — só executa o que existe.

## 8. Fontes

`docs/product/RELEASE_2_FOUNDATION_COMPLETE.md`, `docs/product/PRODUCT_IDENTITY_DECISION_REPORT.md` (Sprint 2.7), `docs/product/CATEGORY_INVENTORY_REPORT.md` (Program Κ), `src/domains/product-identity/services/CanonicalMergeSuggestionService.ts`.
