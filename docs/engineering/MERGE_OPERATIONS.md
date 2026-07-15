# MERGE_OPERATIONS.md
# Runbook — Merge Execution Engine (Program Ω — Mission Ω-1)

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-14
**Audiência**: quem opera o painel `/admin/merge-execution` — não um documento de arquitetura (isso é `MERGE_EXECUTION_ENGINE.md`).

---

## 1. Ciclo de vida de um candidato

```
Pending ──approve──▶ Approved ──execute──▶ Merged ──rollback──▶ RolledBack
   │
   └──reject──▶ Rejected
```

Nenhuma transição pula uma etapa. `execute()` recusa qualquer candidato que não esteja `Approved` — mesmo que a confiança seja 99%.

## 2. Passo a passo recomendado (primeira execução em produção)

1. **Auditoria (`GET /audit`, aba "Auditoria")** — classifica os 3.106 candidatos pendentes em Alta/Média/Revisão manual. Não escreve nada.
2. **Aprovação seletiva** — começar pela camada Alta confiança (≥95%), em lote pequeno primeiro (mesma disciplina de todo Wave anterior que tocou produção: "5 produtos, depois 200" no Program D Wave 1). Aprovar não move nenhum dado ainda.
3. **Preview (dry-run)** — na aba "Aprovados", clicar "Preview" antes de "Executar" em pelo menos os primeiros candidatos de uma sessão — confirma quantas ofertas moveriam sem escrever.
4. **Executar** (`POST /[candidateId]/execute` ou `POST /execute-batch` com `dryRun:false`) — move as ofertas, desativa o canonical product de origem, grava a auditoria.
5. **Remedir** — rodar `npm run cpc:report` (Objetivo 5) antes e depois de cada lote real, nunca só uma vez ao final — permite atribuir o ganho de CPC a um lote específico, não a "o Wave inteiro".

## 3. Lote (`execute-batch`)

`POST /api/admin/canonical-catalog/merge-execution/execute-batch` body `{ limit: number, dryRun: boolean }`. Processa **apenas** candidatos já `Approved` — nunca aprova nada por conta própria. `dryRun:true` roda um preview de cada um sem escrever; use isso para estimar o impacto de um lote antes de comprometer produção. Execução real é sequencial (não paralela) — dois candidatos com o mesmo target nunca competem entre si por uma condição de corrida.

## 4. O que fazer se uma execução falhar no meio

`execute()` só grava a linha de `merge_executions` (a prova de auditoria) **depois** de `reassignOffers` já ter sido aplicado com sucesso. Se o passo seguinte (`deactivateAndMerge` ou o `INSERT` de auditoria) falhar, as ofertas já foram movidas mas a auditoria pode estar incompleta. Isso é raro (mesma transação lógica, sem transação SQL explícita entre as 2 chamadas — limitação conhecida, não escondida) e, se acontecer, o procedimento é manual: consultar `offers.canonical_product_id` para confirmar o estado real, e usar `reassignOffersByIds` diretamente (via um script one-off, mesmo padrão dos `scripts/kappa1-*.ts`) para completar ou reverter manualmente — nunca reexecutar `execute()` para o mesmo candidato sem antes confirmar o estado real (risco de mover ofertas duas vezes).

## 5. Nunca fazer

- Nunca aprovar um candidato só porque a confiança é alta — confiança alta reduz o risco de um falso positivo, não elimina a necessidade de revisão (a doutrina Shadow Mode é sobre isso).
- Nunca chamar `execute-batch` com um `limit` alto sem antes rodar o mesmo lote com `dryRun:true`.
- Nunca editar `canonical_products.is_active`/`merged_into_id` diretamente via SQL fora do Engine — quebra a garantia de que `merge_executions` é a fonte única de verdade sobre o que foi movido (rollback depende disso).

## 6. Ver também

`MERGE_EXECUTION_ENGINE.md` (arquitetura), `MERGE_ROLLBACK.md` (garantias e procedimento de reversão), `docs/product/COMPARABLE_COVERAGE_REPORT.md` (medição real antes/depois).
