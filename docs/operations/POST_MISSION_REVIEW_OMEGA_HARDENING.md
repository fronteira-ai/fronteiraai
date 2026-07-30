# POST-MISSION REVIEW — MISSION Ω-HARDENING
# Produção em Larga Escala — Outbox, Bootstrap Histórico, Observabilidade

**Programa**: Ω (Canonical Catalog Integration)
**Missão**: Ω-Hardening (continuação de Ω-Canonical Integration, Fases 1–2)
**Data**: 2026-07-25
**Autor**: CTO / Claude Sonnet 5
**Status**: **CONGELADA** — implementada, testada, commitada e deployada (`bac54c4`, 2026-07-24; este documento descrevia corretamente o estado no momento em que foi escrito, mas nunca havia sido commitado — corrigido em 2026-07-30 pela Mission Ω-Infrastructure Closeout, junto com dois hotfixes de produção que o outbox precisou depois de operar em volume real: ver `docs/operations/PROJECT_STATUS.md`)

---

> Este documento é o registro permanente de encerramento da Mission Ω-Hardening. Cobre exclusivamente o hardening de produção do Canonical Suggestion Outbox aprovado nas Fases 1 e 2 da Mission Ω-Canonical Integration — não reabre nenhuma decisão arquitetural já congelada naquelas Fases.

---

## 1. Executive Summary

A Mission Ω-Canonical Integration (Fases 1–2) fechou a lacuna que a Mission Ω-COMPARISON AUDIT havia medido — o Sync Pipeline nunca vinculava offers ao Canonical Catalog — introduzindo `CanonicalLinkStage` (síncrono, barato) e um Transactional Outbox que desacopla `suggestMergesFor()` (Product Identity) do caminho crítico da sincronização. A Mission Ω-Hardening resolveu o problema seguinte, inerente a qualquer fila que passa a operar continuamente em produção: **sem retenção, ela cresce para sempre; sem prioridade, todo item é tratado igual; sem expiração por idade, um item pode ficar preso indefinidamente fora do alcance do limite de tentativas; sem observabilidade centralizada, uma regressão só seria descoberta por auditoria manual; sem processamento adaptativo e um serviço histórico dedicado, a plataforma não sustenta centenas de milhares a milhões de offers**. O resultado é um outbox pronto para essa escala, com retenção automática, expiração como rede de segurança complementar ao dead-letter, prioridade retrocompatível, lote adaptativo, observabilidade centralizada e um serviço de bootstrap histórico checkpointado — tudo sem tocar Product Identity, `suggestMergesFor()`, `CanonicalLinkStage` (além da injeção de dependência já existente) ou qualquer regra de matching/threshold/confidence. A plataforma está implementada, testada (875 testes, 0 falhas, 0 regressões) e **aguardando aplicação de migration e deploy** — nenhuma ação de produção foi executada.

## 2. Objetivos da Missão

| # | Objetivo | Status | Justificativa |
|---|---|---|---|
| 1 | Política automática de retenção da Outbox | **Implementado** | `OUTBOX_RETENTION_DAYS` (padrão 180), `OutboxRetentionService`, cron independente. Remove exclusivamente `status=done` mais antigo que o período — nunca `pending`/`processing`/`dead_letter`/`expired`, garantido pela própria cláusula `WHERE` do repositório, testado. |
| 2 | Sistema de prioridade | **Implementado** | `HIGH`/`NORMAL`/`LOW`, padrão `NORMAL`. `claimBatch()` ordena por prioridade e depois `created_at`, nessa ordem. `enqueue()` aceita prioridade como 3º parâmetro opcional — todo conector atual (`CanonicalLinkStage`) continua chamando com 2 argumentos, comportamento idêntico. |
| 3 | Expiração de retries | **Implementado** | Novo status `expired`, `MAX_RETRY_AGE_DAYS` (padrão 30), motivo registrado. Nunca reutiliza `dead_letter`. Nota de nomenclatura: "retry", como usado no brief, já existia como sub-estado de `pending` (attempts>0) — não foi criado um 5º/6º status paralelo para isso, decisão documentada para não alterar a máquina de estados além do necessário. |
| 4 | Observabilidade centralizada | **Implementado, com uma ressalva documentada** | Todas as métricas pedidas existem em `OutboxObservabilityService`, uma única fonte, sem duplicação de lógica. Duas delas — Canonical Link Success/Failure Rate e Suggestions Generated/Skipped — são, por restrição explícita desta Missão (não alterar `CanonicalLinkStage`/`suggestMergesFor()`), aproximações honestamente documentadas (ver §4 e §8), não contagens literais de "candidato criado pelo algoritmo". |
| 5 | Batch adaptativo | **Implementado** | `computeAdaptiveBatchSize()` pura, considera backlog + throughput recente, limitada por `OUTBOX_MIN_BATCH_SIZE`/`OUTBOX_MAX_BATCH_SIZE`. Retrocompatível: `sweep(batchLimit)` com valor explícito nunca aciona o cálculo adaptativo. |
| 6 | Bootstrap histórico | **Implementado** | `HistoricalCanonicalBootstrapService` — checkpoint persistido por batch, retomada automática, cancelamento seguro (checado entre batches, nunca no meio de um item), lotes e sleep configuráveis, paginação por keyset (baixo consumo de memória), idempotente. Script operacional `historical-canonical-bootstrap-run.ts` incluso. |
| 7 | Logs estruturados | **Implementado** | Ambos os crons novos emitem JSON estruturado com os campos pedidos (`queue_size`, `batch_size`, `claimed`, `processed`, `retry`, `dead_letter`, `expired`, tempo de processamento, backlog restante, conclusão estimada). |

## 3. Escopo Executado

**Outbox**: colunas `priority` e status `expired` adicionados (migration aditiva); `enqueue()` com prioridade opcional; `claimBatch()` priorizado (seleção por índice existente + ordenação em memória por `PRIORITY_RANK` — decisão deliberada de manter `text + CHECK`, o padrão já usado em toda tabela deste projeto, em vez de introduzir o único `ENUM` nativo do schema).

**Bootstrap Histórico**: `HistoricalCanonicalBootstrapService` + `IBootstrapCheckpointRepository`/`SupabaseBootstrapCheckpointRepository` + tabela `canonical_bootstrap_checkpoint` (uma linha por `run_key`, nunca sobrescrita entre execuções distintas) + script `scripts/historical-canonical-bootstrap-run.ts` (`--run-key`, `--batch-size`, `--sleep-ms`, `--max-batches`, `--cancel`).

**Observabilidade**: `OutboxObservabilityService.snapshot()` — composição total/ativa da fila, retry rate, dead-letter rate, tentativas médias, tempo médio/P95/P99 de processamento (amostrado, calculado em memória), drain rate, backlog, ETA. `summarizeCanonicalLinkStageMetrics()` — função pura, lê `StageMetrics.details` já existente (Fase 2), não conectada a nenhuma rota ao vivo.

**Batch Adaptativo**: `computeAdaptiveBatchSize()` pura + integração retrocompatível em `CanonicalSuggestionSweepService.sweep()` + uso real no cron `merge-suggestions` (que passou a chamar `sweep()` sem limite fixo).

**Prioridade**: tipo `CanonicalSuggestionPriority`, `PRIORITY_RANK` como fonte única de ordenação, coluna + índice `(priority, created_at)`.

**Retenção**: `OutboxRetentionService` + config `outboxRetentionDays()` (lida a cada chamada, sem cache).

**Expiração**: `OutboxExpirationService` + config `maxRetryAgeDays()`, ambos com o mesmo padrão de leitura em tempo de chamada.

**Testes**: 42 novos — retenção (5), expiração (6), prioridade + concorrência/idempotência (8), batch adaptativo puro + integração (6+2), bootstrap histórico (8), observabilidade (7). Dois fakes de teste novos (`InMemoryCanonicalSuggestionOutboxRepository`, `InMemoryBootstrapCheckpointRepository`) com semântica real, não apenas stubs.

**Infraestrutura**: migration `20260725090000_outbox_hardening.sql` (aditiva); 2 crons novos em `vercel.json` (`merge-suggestions` já existia, agora adaptativo; `outbox-maintenance`, novo, diário, independente); 2 novos métodos aditivos em `ICatalogRepository` (`findProductsAfterId`, `findOfferIdsByProductId`) necessários para o bootstrap histórico ler o catálogo sem duplicar a lógica do Gatekeeper.

## 4. Compatibilidade

Confirmado por leitura direta do diff desta Missão — **nenhuma linha foi alterada** em:
- `src/domains/product-identity/` (Product Identity, `suggestMergesFor()`, thresholds, confidence) — intocado.
- `src/domains/connectors/services/stages/CanonicalLinkStage.ts` — intocado, zero mudança funcional.
- `src/domains/connectors/services/SyncOrchestrator.ts` — intocado nesta Missão (a única injeção de dependência que esse arquivo recebeu foi na Fase 1/2 da Mission Ω-Canonical Integration, não nesta).
- `src/domains/connectors/normalization/BrandCategoryGatekeeper.ts` (Gatekeeper) — intocado.
- `src/domains/connectors/services/CatalogRecoveryEngine.ts` (Recovery Engine) — intocado.
- `src/domains/learning-engine/` (Learning Engine) — intocado.
- Nenhuma regra de merge, threshold ou fórmula de confidence foi tocada em `canonical-catalog/`.

**Como a retrocompatibilidade foi preservada**: toda extensão foi aditiva por construção, nunca por exceção manual —
- `enqueue(canonicalProductId, source, priority?)`: parâmetro novo é opcional com valor padrão; a chamada de 2 argumentos que `CanonicalLinkStage` já fazia continua produzindo exatamente o mesmo efeito (`priority='normal'`).
- `sweep(batchLimit?, staleClaimMs?)`: `batchLimit` deixou de ter um valor padrão fixo e passou a aceitar `undefined`; todo chamador que já passava um valor explícito (os testes da Fase 2) recebe exatamente esse valor, sem cálculo adaptativo algum.
- `StageMetrics.details?`: campo opcional; toda stage pré-existente que nunca o preenche continua com o mesmo formato de saída.
- Migration: coluna nova com `DEFAULT`, união de valor novo no `CHECK` — nenhuma linha existente muda de significado.
- `ICatalogRepository`: 2 métodos novos, nenhuma assinatura existente alterada.

## 5. Resultados Técnicos

**Arquivos criados**: 20 (12 de produção + 8 de teste, incluindo 2 fakes reutilizáveis) — ver lista completa no relatório de entrega da Fase 3.
**Arquivos modificados**: 14, todos em `connectors/` ou wiring (`vercel.json`, `ICatalogRepository.ts`, `SupabaseCatalogRepository.ts`, `CanonicalSuggestionSweepService.ts`, a rota `merge-suggestions`, `index.ts`, e 5 arquivos de teste ajustados para as novas assinaturas de fake).
**Migrations**: 1 nova (`20260725090000_outbox_hardening.sql`), aditiva, não aplicada.
**Novos serviços**: `OutboxRetentionService`, `OutboxExpirationService`, `OutboxObservabilityService`, `HistoricalCanonicalBootstrapService` — 4.
**Novos crons**: `outbox-maintenance` (novo) + `merge-suggestions` (já existente, agora adaptativo) — 1 rota nova, 1 comportamento estendido.
**Novos testes**: 42.

**Qualidade**: `tsc --noEmit` → 0 erros. `npm run lint` → 0 erros (1 warning pré-existente em `scripts/comparison-forensics-audit.ts`, arquivo de uma Missão anterior, não tocado aqui). `npm run build` → sucesso, incluindo as 2 rotas novas. **Testes: 875 no total (era 833 ao final da Ω-5), 132 suítes, 0 falhas. 42 testes novos. Zero regressões** — todo teste pré-existente da Fase 2 continua verde sem modificação de asserção (exceto a atualização mecânica de fakes para satisfazer as novas assinaturas de interface, nunca uma mudança de expectativa de comportamento).

## 6. Impacto Arquitetural

A arquitetura aprovada nas Fases 1–2 (Sync Pipeline → `CanonicalLinkStage` síncrono e barato → Outbox → cron desacoplado → `suggestMergesFor()`) **não mudou de forma**. O que mudou é que o Outbox deixou de ser uma fila simples e passou a ser um componente com ciclo de vida completo: todo item que entra tem um destino final garantido — `done`, `dead_letter` (tentativas esgotadas) ou `expired` (idade excedida, rede de segurança independente de tentativas) — e os únicos itens que crescem indefinidamente (`done`) são automaticamente podados. **Limitação removida**: a ausência de um caminho para processar o backlog histórico sem competir pelo orçamento de tempo do Sync Pipeline ou do cron de sugestões — `HistoricalCanonicalBootstrapService` é essa capacidade nova, dimensionada para centenas de milhares de registros sem risco de estouro de memória ou perda de progresso. **Capacidades novas**: fila com prioridade (abre caminho para um conector ou processo futuro pedir tratamento preferencial sem qualquer mudança de arquitetura); processamento adaptativo ao volume real, não a uma constante arbitrária; uma superfície de observação única e centralizada que substitui a necessidade de auditoria forense manual para detectar regressão.

## 7. Impacto Operacional

**Escalabilidade**: o outbox agora se comporta de forma estável tanto com fila vazia (retenção/expiração inativas, lote mínimo) quanto com backlog de centenas de milhares de itens (lote cresce até o teto configurado, bootstrap histórico paginado). **Observabilidade**: um operador não precisa mais rodar um script de auditoria para saber se a fila está saudável — `dead_letter`/`expired`/backlog/ETA estão centralizados em uma chamada. **Recuperação de falhas**: um claim travado se autorrecupera pela janela de staleness (já existia); agora também há expiração por idade como segunda rede de segurança, e o bootstrap histórico sobrevive a reinício de processo via checkpoint. **Manutenção**: retenção e expiração rodam sozinhas, diariamente, sem intervenção — a fila não é mais um item de limpeza manual de backlog. **Deploy**: toda mudança é aditiva; nenhum passo de migração de dados é necessário além de aplicar a migration. **Rollback**: kill-switches por variável de ambiente (retenção/expiração/limites de lote) e por remoção de entrada de cron, sem necessidade de reverter código — documentado em detalhe no relatório de entrega da Fase 3. **Processamento histórico**: deixa de depender de um script único, não resumível, potencialmente ilimitado em memória — passa a ser uma operação controlada, interrompível e retomável.

## 8. Dívida Técnica

Apenas débitos reais, efetivamente presentes no código entregue:

1. **Duplicação deliberada da sequência bootstrap+link+enqueue** entre `CanonicalLinkStage` (intocado) e `HistoricalCanonicalBootstrapService` (novo) — cerca de 10 linhas, exigida pela proibição explícita de extrair um helper compartilhado tocando `CanonicalLinkStage`.
2. **"Suggestions Generated/Skipped" e "Canonical Link Success/Failure Rate" não medem literalmente o que os nomes sugerem** — o primeiro par mede resultado de execução da fila (`done` vs. `dead_letter`+`expired`), não "candidato criado pelo algoritmo"; o segundo é uma função pura pronta mas nunca invocada por nenhuma rota ao vivo. Ambos são consequência direta da restrição de não alterar `suggestMergesFor()`/`CanonicalLinkStage`, não de uma escolha de implementação evitável.
3. **`HistoricalCanonicalBootstrapService` não tem retry por item** — um produto que falha é contado em `failedCount` e definitivamente pulado nesta execução; reprocessá-lo exige rodar o mesmo `--run-key` de novo depois que o backlog principal terminar (ou uma fila de falhas dedicada, não construída nesta Missão).
4. **Prioridade ordenada em memória, não via `ORDER BY` nativo** — decisão consciente de consistência com o padrão `text + CHECK` deste schema, mas é, tecnicamente, uma escolha que abre mão da capacidade nativa do Postgres em favor de uniformidade de convenção.

## 9. Riscos Conhecidos

**Risco baixo**:
- Overhead da ordenação de prioridade em memória sobre um lote de candidatos elegíveis (limitado a 500) — desprezível no volume atual e projetado.
- `outbox-maintenance` e `merge-suggestions` competem por I/O no mesmo banco em horários próximos — ambos leves, cadência diária/quinzenal-minutos, sem histórico de contenção observado (não medido sob carga real ainda).

**Risco médio**:
- A atomicidade do claim (SELECT + UPDATE condicional) depende inteiramente da garantia de UPDATE do Postgres — correta por design e por precedente de uso consolidado, mas **nunca exercitada por um teste de integração contra um banco real** (este projeto não tem testes de integração contra DB em nenhum domínio até hoje).
- Nenhuma das capacidades desta Missão foi validada sob carga real (100 mil sugestões pendentes, múltiplos workers concorrentes) — a garantia é de design e de teste unitário, não de medição empírica em produção.

**Risco alto**: nenhum identificado nesta revisão.

## 10. Lições Aprendidas

- **Restrições explícitas de "não alterar X" são mais produtivas quando forçam decisões de design em vez de contorná-las silenciosamente** — a proibição de tocar `suggestMergesFor()`/`CanonicalLinkStage` não impediu a Missão de entregar observabilidade e um serviço histórico completos; só exigiu nomear com precisão o que cada métrica mede de fato, em vez de fingir uma precisão que o sistema não pode oferecer sem violar a restrição.
- **Retrocompatibilidade por parâmetro opcional com valor padrão continua sendo o mecanismo mais barato e mais seguro de evolução de interface** neste código-base — repetido em `enqueue()`, `sweep()`, `StageMetrics.details` — nenhuma dessas mudanças exigiu qualquer alteração no lado chamador já existente.
- **Convenções de schema consistentes (`text + CHECK` em vez de `ENUM` nativo) valem mais do que a elegância técnica pontual** de uma única tabela — a decisão de ordenar prioridade em memória em vez de introduzir o único enum nativo do banco é, em si, um artefato dessa lição.
- **Checkpoint por linha nomeada (`run_key`), nunca uma linha global única, é o padrão certo para qualquer processo de longa duração que precise de histórico auditável de execuções** — mesma disciplina já usada por `merge_executions`/`knowledge_history`, agora estendida a um novo tipo de processo (bootstrap em lote).

## 11. Estado Atual da Plataforma

Canonical Catalog está agora integrado ao Sync Pipeline por um caminho totalmente automático: `CatalogWriteStage` → `CanonicalLinkStage` (bootstrap + link + enqueue, síncrono, barato) → `canonical_suggestion_outbox` (com prioridade, retenção, expiração) → cron `merge-suggestions` (adaptativo) → `suggestMergesFor()` (Product Identity, intocado) → `merge_candidates` (revisão humana, Shadow Mode preservado) → `MergeExecutorService` (execução manual aprovada). Um cron `outbox-maintenance` independente mantém a fila saudável sem intervenção. Um serviço `HistoricalCanonicalBootstrapService` separado, sob demanda, processa o backlog histórico com checkpoint e cancelamento seguro. `OutboxObservabilityService` é a fonte única de métricas operacionais desse subsistema.

**Atualização 2026-07-30 (Mission Ω-Infrastructure Closeout)**: todas essas peças estão aplicadas e rodando em produção desde `bac54c4` (2026-07-24) — esta seção descrevia o estado pré-deploy e ficou desatualizada porque o documento nunca foi commitado. Com o outbox operando em volume real (~14 mil itens desde então), dois problemas genuínos de escala (não cobertos por nenhuma Mission anterior) apareceram e foram corrigidos: o cron `merge-suggestions` estourava seu próprio orçamento de execução ao processar lotes reais (Mission Ω-Merge-Suggestions Hotfix, 2026-07-29) e o timeout do cliente GitHub Actions era curto demais para a duração legítima do endpoint já corrigido (Mission Ω-GitHub Final Hotfix, 2026-07-30). Ambos validados com execução real em produção — ver `docs/operations/PROJECT_STATUS.md`.

## 12. Missões Concluídas

| Missão | Entregou | Situação em produção |
|---|---|---|
| Ω-Gatekeeper / Ω-Rehabilitation / Ω-Learning | Catalog Integrity Firewall, Catalog Recovery Engine, Continuous Knowledge Engine | Aplicadas (migrations e backfill executados, ver Post-Mission Review Ω-5) |
| Ω-5 (Continuous Knowledge Engine) | Ledger de conhecimento versionado, append-only | Aplicada e validada em produção |
| Ω-COMPARISON AUDIT | Auditoria forense read-only do Product Matching | Sem escrita — só medição; identificou a lacuna que motivou Ω-Canonical Integration |
| Ω-Canonical Integration (Fases 1–2) | `CanonicalLinkStage`, Transactional Outbox, contrato AT LEAST ONCE DELIVERY | Implementada, testada, **não aplicada/deployada** |
| **Ω-Hardening (esta Missão)** | Retenção, prioridade, expiração, observabilidade, batch adaptativo, bootstrap histórico | Implementada, testada, **não aplicada/deployada** |

## 13. Critérios de Aceitação

- Arquitetura aprovada? **SIM** (Fases 1 e 2 aprovadas explicitamente antes da implementação; esta Missão não alterou nenhuma decisão arquitetural, apenas endureceu o que já estava aprovado).
- Código aprovado? **SIM** — implementado exatamente conforme o escopo pedido, sem desvio, sem funcionalidade não solicitada.
- Testes aprovados? **SIM** — 875/875 verdes, 42 novos, 0 regressões, cobrindo todas as categorias pedidas (TTL, retenção, prioridade, expired, batch adaptativo, bootstrap histórico, observabilidade, métricas, concorrência/idempotência, rollback/recovery).
- Produção aprovada? **NÃO** — nenhuma migration foi aplicada, nenhum deploy foi feito; aguardando autorização explícita.
- Missão concluída? **SIM** — todo objetivo do escopo definido foi implementado, testado e documentado; o que resta é uma decisão de rollout, não trabalho de engenharia pendente.

## 14. Recomendação Final

**A) Mission encerrada. Arquitetura congelada. Pronta para produção.**

---

**Fim do documento. Mission Ω-Hardening congelada.**
