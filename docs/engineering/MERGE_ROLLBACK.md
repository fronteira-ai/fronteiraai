# MERGE_ROLLBACK.md
# Garantias de reversibilidade — Merge Execution Engine (Program Ω — Mission Ω-1)

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-14

---

## 1. Garantia central

**Todo merge executado por este Engine é reversível.** Isso é verdade por construção do modelo de dados, não por disciplina operacional:

- Um merge **nunca** apaga a linha `canonical_products` de origem — só marca `is_active=false` e `merged_into_id=<target>`.
- Toda execução grava, antes de qualquer outra coisa, a lista **exata** de `offer.id`s que moveu (`merge_executions.moved_offer_ids`) — nunca uma inferência a partir do estado atual do target.

## 2. Por que "offers atualmente no target" não seria seguro para rollback

Se o rollback repontasse "todo offer hoje ligado ao target de volta para a source", isso quebraria no caso realista em que **um segundo merge, de um terceiro canonical product, também moveu ofertas para o mesmo target** entre a primeira execução e o rollback. Reverter pela lista atual moveria offers que nunca pertenceram à source original. Por isso `moved_offer_ids` é gravado por execução, e `reassignOffersByIds` (não `reassignOffers`) é o único método que o rollback usa — ele opera sobre uma lista explícita de ids, nunca sobre uma condição `WHERE canonical_product_id = target`.

## 3. Procedimento de rollback

`POST /api/admin/canonical-catalog/merge-execution/executions/[executionId]/rollback` (ou botão "Reverter" na aba "Executados" do painel).

Passos internos (`MergeExecutorService.rollback`):
1. Confirma que a execução está em status `Executed` (recusa reverter uma execução já revertida — `EXECUTION_ALREADY_ROLLED_BACK`).
2. `reassignOffersByIds(execution.movedOfferIds, execution.sourceCanonicalProductId)` — move exatamente essas ofertas de volta.
3. `reactivate(execution.sourceCanonicalProductId)` — `is_active=true`, `merged_into_id=null`.
4. Marca `merge_executions.status='rolled_back'` (nunca apaga a linha — o rollback também é auditável).
5. Marca `merge_candidates.status='rolled_back'` — o candidato não volta a `Pending`/`Approved` automaticamente; se a reversão foi porque o merge estava errado, o candidato deve ser tratado como uma decisão encerrada, uma nova avaliação exigiria um novo candidato (gerado pela infraestrutura normal do Product Identity), não reaproveitar o antigo.

## 4. O que rollback não cobre

- **Ofertas que mudaram de dono entre a execução e o rollback por outro motivo** (ex.: um segundo merge legítimo moveu uma dessas ofertas específicas para um terceiro canonical product) — `reassignOffersByIds` ainda tentará movê-las de volta para a source original, o que nesse caso raro seria uma correção incorreta. Esse cenário não é impedido automaticamente hoje; é nomeado aqui como limitação conhecida, não escondida — mitigação recomendada: revisar rollbacks de execuções antigas manualmente antes de confirmar, não só clicar "Reverter" às cegas em uma execução de dias atrás.
- **Efeitos derivados já consumidos** — se `PriceIntelligenceService`/`OfferRankingService`/qualquer composer de Buyer Intelligence já leu e exibiu um resultado calculado com o merge aplicado (ex.: uma comparação de preço mostrada a um comprador antes do rollback), esse resultado já foi servido; o rollback corrige o dado para leituras futuras, não retroage sobre o que já foi exibido — comportamento esperado de qualquer sistema compute-on-read deste projeto (mesma disciplina do `FreshnessEngine`).

## 5. Nunca fazer

- Nunca reverter uma execução e, na sequência, reexecutar o mesmo candidato sem primeiro rodar `preview()` de novo — o estado do source/target pode ter mudado desde a execução original (ex.: o target pode ter recebido outro merge nesse intervalo).
- Nunca tratar `rolled_back` como equivalente a `rejected` para fins de reprocessamento — um candidato `rolled_back` não deve ser silenciosamente re-tentado.

## 6. Ver também

`MERGE_EXECUTION_ENGINE.md` (arquitetura completa), `MERGE_OPERATIONS.md` (runbook do dia a dia).
