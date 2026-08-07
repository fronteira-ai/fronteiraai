# CATALOG OPERATIONS MANUAL
# Mission Ω-Catalog Operations — Modelo Operacional Oficial do ParaguAI

**Categoria**: `docs/operations/`
**Criado**: 2026-07-25
**Status**: Oficial — qualquer operador novo deve conseguir executar toda a operação do catálogo consultando somente este documento.
**Escopo**: exclusivamente operacional. Nenhum componente de domínio (Product Identity, Recovery Engine, Learning Engine, Canonical Catalog, Gatekeeper) foi alterado para produzir este documento.

---

## 1–2. Processos operacionais — mapa completo

### Catalog Recovery

- **Objetivo**: recuperar `brand_id`/`category_id` de produtos históricos escritos antes do Gatekeeper existir, usando as 5 camadas determinísticas já implementadas.
- **Entrada**: produtos com `brand_id`/`category_id` nulo ou "forbidden" (hoje: 22.705 em marca "Outros").
- **Saída**: linhas em `catalog_recovery_decisions` (nunca sobrescritas) + `products.brand_id`/`category_id` atualizados quando confirmado.
- **Frequência ideal**: semanal, até o backlog esgotar; mensal depois disso (manutenção).
- **Responsável**: Operador de Catálogo.
- **Pré-condições**: nenhuma — ferramenta já pronta, roda contra produção hoje.
- **Critérios de sucesso**: `catalog_recovery_decisions` cresce; `products` com brand/category "forbidden" diminui na próxima auditoria.
- **Critérios de falha**: execução termina com erro antes de processar o backlog completo; nenhuma decisão nova é gravada após uma execução `--execute`.

### Pending Reviews

- **Objetivo**: um humano confirma o valor real de uma marca/categoria que o Gatekeeper não conseguiu resolver sozinho.
- **Entrada**: linhas em `catalog_pending_reviews` com `status='pending'` (hoje: 24.836).
- **Saída**: `resolved_value` gravado, propagado a `merchant_attribute_patterns.resolved_value` (efeito automático via `PendingReviewResolutionService`).
- **Frequência ideal**: diária ou semanal, em lotes.
- **Responsável**: Operador de Catálogo.
- **Pré-condições**: **nenhum ponto de execução existe hoje** — `PendingReviewResolutionService` só é chamada em testes unitários; não há script nem rota de admin. Este processo está documentado mas **não é operável no estado atual** sem que uma Missão futura construa o consumidor mínimo (fora do escopo desta Missão, que não gera código).
- **Critérios de sucesso**: `catalog_pending_reviews.status='resolved'` cresce; a mesma correção nunca é pedida duas vezes para a mesma loja+valor.
- **Critérios de falha**: fila permanece 100% `pending` (estado atual).

### Merge Candidates

- **Objetivo**: sugerir, nunca decidir sozinho, que dois Canonical Products são o mesmo produto real.
- **Entrada**: Canonical Products ativos, agrupados por marca (`CanonicalMergeSuggestionService.suggestMergesFor`).
- **Saída**: linhas em `merge_candidates`, status `pending`.
- **Frequência ideal**: automática, a cada sincronização (após deploy do Ω-Canonical Integration) — hoje só acontece quando `canonical-catalog-bootstrap.ts` roda manualmente.
- **Responsável**: sistema (geração automática); Operador de Catálogo (revisão).
- **Pré-condições**: Canonical Coverage > 0 para a loja em questão.
- **Critérios de sucesso**: candidatos com `tier auto/probable` (confiança ≥85) aparecem na fila regularmente.
- **Critérios de falha**: fila cresce sem nenhuma geração nova por várias semanas (sinal de que o gerador parou).

### Merge Executor

- **Objetivo**: aplicar (ou reverter) uma decisão humana já aprovada, unindo dois Canonical Products.
- **Entrada**: `merge_candidates.status='approved'`.
- **Saída**: offers reatribuídas, `canonical_products` de origem desativado, `merge_executions` gravado (auditoria permanente).
- **Frequência ideal**: imediatamente após cada aprovação, ou em lote diário.
- **Responsável**: Operador de Catálogo (via `/admin/merge-execution`).
- **Pré-condições**: candidato já `approved`; origem e destino ainda ativos.
- **Critérios de sucesso**: `merge_executions.status='executed'`; Comparable Product Coverage sobe.
- **Critérios de falha**: erro de execução (origem/destino já mesclados por outro processo) — recuperável via os próprios códigos de erro já existentes (`SOURCE_ALREADY_MERGED` etc.).

### Learning Engine

- **Objetivo**: transformar correções humanas confirmadas em conhecimento reutilizável e versionado.
- **Entrada**: `merchant_attribute_patterns.resolved_value`, `catalog_recovery_decisions`, `marketplace_memory_facts` confirmados.
- **Saída**: `knowledge_history` (append-only).
- **Frequência ideal**: semanal (`scripts/knowledge-engine-backfill.ts --execute`), seguido do relatório de validação.
- **Responsável**: Operador de Catálogo.
- **Pré-condições**: depende diretamente de Pending Reviews ter throughput real (hoje zero) — sem isso, o backfill só encontra o que o Recovery Engine já gerou.
- **Critérios de sucesso**: `knowledge_history` cresce; promoções para escopo `global` aparecem.
- **Critérios de falha**: nenhuma linha nova por múltiplas execuções seguidas.

### Canonical Integration

- **Objetivo**: garantir que toda offer nova entre automaticamente no Canonical Catalog.
- **Entrada**: migrations `20260724120000_canonical_suggestion_outbox.sql` + `20260725090000_outbox_hardening.sql`.
- **Saída**: `CanonicalLinkStage` ativo no Sync Pipeline; crons `merge-suggestions` e `outbox-maintenance` rodando.
- **Frequência ideal**: ação única de rollout (não recorrente); depois disso, é automático por construção.
- **Responsável**: CTO/Engenharia (aplicação da migration + deploy).
- **Pré-condições**: revisão já concluída (Fases 1–3 aprovadas e congeladas).
- **Critérios de sucesso**: Canonical Coverage sobe de 46,8% para próximo de 100% nas sincronizações seguintes.
- **Critérios de falha**: erro de migration; `CanonicalLinkStage` gerando `bootstrapFailures`/`linkFailures` de forma sustentada nos logs.

### Outbox

- **Objetivo**: processar sugestões de merge de forma desacoplada, com retenção, prioridade e expiração automáticas.
- **Entrada**: `canonical_suggestion_outbox.status='pending'`.
- **Saída**: `status='done'`/`dead_letter`/`expired`; `merge_candidates` novos.
- **Frequência ideal**: automática — cron `merge-suggestions` a cada 15min, `outbox-maintenance` diário.
- **Responsável**: sistema (automático após deploy).
- **Pré-condições**: Canonical Integration deployado.
- **Critérios de sucesso**: `dead_letter` permanece ~0; backlog não cresce sem limite.
- **Critérios de falha**: `dead_letter` crescendo; fila `pending` envelhecendo sem processamento.

### Bootstrap Histórico

- **Objetivo**: processar o backlog histórico (ex.: Shopping China, 20 mil+ offers) sem competir pelo orçamento do Sync Pipeline.
- **Entrada**: `products` ainda não vinculados a um Canonical Product.
- **Saída**: `canonical_products` criados/vinculados, itens enfileirados no Outbox, checkpoint em `canonical_bootstrap_checkpoint`.
- **Frequência ideal**: sob demanda, uma vez por backlog identificado.
- **Responsável**: Operador de Catálogo (via `scripts/historical-canonical-bootstrap-run.ts`).
- **Pré-condições**: Canonical Integration deployado.
- **Critérios de sucesso**: checkpoint chega a `status='completed'`.
- **Critérios de falha**: checkpoint fica `failed` (erro registrado em `last_error`) ou parado em `running` sem progresso.

## 3. Matriz RACI

| Processo | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Catalog Recovery | Operador de Catálogo | CTO | Engenharia (se erro de execução) | Product Owner |
| Pending Reviews | Operador de Catálogo | CTO | Engenharia (construir o entrypoint faltante) | Product Owner |
| Merge Candidates (geração) | Sistema | CTO | — | Operador de Catálogo |
| Merge Candidates (revisão) | Operador de Catálogo | CTO | Product Owner (casos ambíguos) | Engenharia |
| Merge Executor | Operador de Catálogo | CTO | — | Product Owner |
| Learning Engine | Operador de Catálogo | CTO | Engenharia | Product Owner |
| Canonical Integration (rollout) | Engenharia | CTO | Product Owner | Operador de Catálogo |
| Outbox | Sistema | CTO | Engenharia (alertas) | Operador de Catálogo |
| Bootstrap Histórico | Operador de Catálogo | CTO | Engenharia | Product Owner |

Hoje uma única pessoa acumula Operador de Catálogo + CTO + Engenharia — a matriz define os papéis para quando a equipe crescer, não uma estrutura hipotética sem uso imediato: já separa claramente o que é decisão de produto (Product Owner) do que é execução operacional.

## 4. Runbooks

### Runbook — Executar Catalog Recovery

- **Objetivo**: reduzir o backlog de marca/categoria "forbidden".
- **Passo a passo**: 1) `npx tsx scripts/catalog-recovery-run.ts` (dry-run); 2) revisar contagem de `recovered`/`pending`/`conflicts`; 3) `npx tsx scripts/catalog-recovery-run.ts --execute`; 4) reexecutar `product-discovery-audit.ts` para confirmar queda no backlog.
- **Checklist**: dry-run revisado ☐ · nenhum conflito inesperado ☐ · execução completa sem erro ☐ · nova contagem de "Outros" registrada ☐.
- **Critérios de conclusão**: execução termina, `catalog_recovery_decisions` cresce, backlog de "Outros" mede menor que antes.
- **Rollback**: não aplicável — decisões são aditivas, nunca sobrescrevem; reverter significa apenas não usar o valor recuperado (não há write destrutivo).
- **Evidências esperadas**: log da execução + nova medição de Brand/Category Coverage.

### Runbook — Processar Pending Reviews

- **Objetivo**: confirmar manualmente o valor real de marcas/categorias que o Gatekeeper não resolveu.
- **Passo a passo**: **bloqueado hoje — não existe ferramenta de execução.** Quando existir (Missão futura): 1) listar pendentes por loja; 2) confirmar valor real; 3) chamar `PendingReviewResolutionService.resolve()`; 4) confirmar propagação automática para duplicatas da mesma loja+valor.
- **Checklist**: N/A até o entrypoint existir.
- **Critérios de conclusão**: N/A.
- **Rollback**: N/A.
- **Evidências esperadas**: N/A — este runbook fica registrado como um débito de tooling a resolver, não uma operação executável hoje.

### Runbook — Aprovar Merge Candidates

- **Objetivo**: revisar e decidir sobre candidatos de merge sugeridos.
- **Passo a passo**: 1) abrir `/admin/merge-execution`; 2) priorizar por confiança (`tier auto` primeiro); 3) para cada candidato, comparar nome/specifications/imagem entre origem e destino; 4) aprovar ou rejeitar; 5) para aprovados, executar via a mesma tela (ou lote).
- **Checklist**: candidatos de tier `auto` revisados primeiro ☐ · nenhuma aprovação sem checar categoria/marca batendo ☐ · execução confirmada ☐.
- **Critérios de conclusão**: fila de `pending` diminui na sessão.
- **Rollback**: `MergeExecutorService.rollback()` — reverte exatamente as offers movidas por aquela execução, reativa a origem.
- **Evidências esperadas**: contagem de aprovados/rejeitados/executados na sessão; `merge_executions` novo por execução.

### Runbook — Validar Canonical Coverage

- **Objetivo**: confirmar que offers novas estão entrando no Canonical Catalog.
- **Passo a passo**: 1) rodar `product-discovery-audit.ts` (ou consulta equivalente); 2) comparar % de offers linkadas por loja contra a medição anterior; 3) investigar qualquer loja estagnada.
- **Checklist**: medição registrada ☐ · comparação com semana anterior feita ☐ · lojas estagnadas identificadas ☐.
- **Critérios de conclusão**: relatório gerado e arquivado.
- **Rollback**: não aplicável (somente leitura).
- **Evidências esperadas**: números por loja, com data.

### Runbook — Auditoria Semanal

- **Objetivo**: checkpoint semanal de todos os KPIs deste manual.
- **Passo a passo**: 1) rodar `product-discovery-audit.ts` + `catalog-quality-signature-recovery.ts`; 2) preencher a tabela de KPIs (seção 6); 3) comparar contra a semana anterior; 4) abrir um item de ação para todo KPI em estado de alerta ou crítico (seção 10).
- **Checklist**: os 10 KPIs oficiais medidos ☐ · comparação semana-a-semana registrada ☐ · ações abertas para desvios ☐.
- **Critérios de conclusão**: registro da semana arquivado (mesmo que informalmente, ex.: um documento de log).
- **Rollback**: não aplicável.
- **Evidências esperadas**: tabela de KPIs datada.

### Runbook — Rodar Bootstrap Histórico

- **Objetivo**: processar um backlog histórico específico (ex.: uma loja recém-incluída no Canonical Catalog).
- **Passo a passo**: 1) confirmar que Canonical Integration está deployado; 2) `npx tsx scripts/historical-canonical-bootstrap-run.ts --run-key=<nome> --batch-size=100 --sleep-ms=200`; 3) monitorar `canonical_bootstrap_checkpoint.status`; 4) reexecutar o mesmo `--run-key` até `status='completed'`.
- **Checklist**: run-key documentado ☐ · checkpoint monitorado ☐ · conclusão confirmada ☐.
- **Critérios de conclusão**: `status='completed'`.
- **Rollback**: `--cancel` interrompe com segurança entre batches; nenhuma reversão de dado é necessária (bootstrap+link+enqueue são idempotentes).
- **Evidências esperadas**: `totalProcessed`/`totalCreated`/`totalLinked`/`totalEnqueued`/`totalFailed` final.

## 5. Calendário Operacional

- **Diárias**: (após deploy) crons automáticos `merge-suggestions` e `outbox-maintenance` — nenhuma ação humana.
- **Semanais**: Auditoria Semanal (KPIs); sessão de revisão de Merge Candidates; execução de Catalog Recovery (até o backlog esgotar).
- **Mensais**: execução do Learning Engine backfill + relatório de validação; revisão de Recovery Coverage.
- **Extraordinárias**: Bootstrap Histórico (nova loja/backlog identificado); investigação de alerta crítico (seção 7); rollout de Canonical Integration (ação única).

## 6. SLIs e SLOs

| SLI | Fórmula | Meta (SLO) | Alerta | Crítico |
|---|---|---|---|---|
| Pending Review Aging | média(dias em `pending`) | <7 dias | >30 dias | >90 dias (hoje: indefinido, 0 resolvidos) |
| Review Throughput | itens resolvidos/semana | >100/semana | <20/semana | 0/semana (estado atual) |
| Recovery Throughput | `catalog_recovery_decisions` novas/semana | >200/semana | <50/semana | 0 por >4 semanas |
| Canonical Coverage | offers linkadas / total | ≥97% | <90% | <70% (hoje: 46,8%) |
| Brand Coverage | marca real / total | ≥90% | <70% | <50% (hoje: 40,7%) |
| Comparable Coverage | canonical ≥2 lojas / ativos | ≥5% | <1% | <0,1% (hoje: 0,04%) |
| Merge Approval Time | média(reviewed_at − created_at) para aprovados | <7 dias | >30 dias | indefinido (hoje: quase nenhum aprovado) |

## 7. Alertas Operacionais

| Alerta | Severidade | Ação imediata | Ação corretiva | Responsável |
|---|---|---|---|---|
| Brand Coverage caiu | Alta | Confirmar se é regressão de conector ou medição | Investigar conector recente; rodar Recovery Engine | Operador de Catálogo |
| Pending Reviews cresceram sem resolução | Média | Registrar no relatório semanal | Priorizar sessão de revisão | Operador de Catálogo |
| Recovery parou (0 novas decisões por 4+ semanas) | Média | Confirmar execução manual pendente | Agendar execução | Operador de Catálogo |
| Merge Queue parada (0 revisões por 2+ semanas) | Média | Agendar sessão | Revisar backlog acumulado | Operador de Catálogo |
| Canonical Coverage caiu | Alta | Verificar se `CanonicalLinkStage` está gerando falhas nos logs | Investigar `bootstrapFailures`/`linkFailures` | Engenharia |
| Outbox acumulando (`dead_letter` crescendo) | Alta | Inspecionar `last_error` dos itens em `dead_letter` | Corrigir causa raiz; nunca reenfileirar automaticamente | Engenharia |
| Bootstrap Histórico parado em `running` sem progresso | Baixa | Verificar se o processo ainda está ativo | Reexecutar o mesmo `--run-key` | Operador de Catálogo |

## 8. Dashboard Executivo

**Saúde do Pipeline**: Canonical Coverage · Offers linkadas por loja · Outbox (pending/processing/dead_letter/expired) · Merge Candidates por status.

**Saúde do Catálogo**: Brand Coverage · Category Coverage · Specification Coverage · ProductSignature Depth · Image Coverage · Price Coverage.

**Saúde Operacional**: Pending Review Aging · Review Throughput · Recovery Throughput · Merge Approval Time · Merge Approval Rate.

**Saúde do Marketplace**: Comparable Product Coverage · número de lojas ativas · distribuição de offers por loja · idade do dado mais antigo não revisado.

## 9. Processo Oficial de Melhoria Contínua

Quando um KPI piorar (cruza o limite de alerta ou crítico definido na seção 6): **quem investiga** — Operador de Catálogo, usando os scripts de auditoria já existentes (`product-discovery-audit.ts`, `catalog-quality-signature-recovery.ts`, `comparison-forensics-audit.ts`); **quem aprova** a ação corretiva — CTO; **quem executa** — Operador de Catálogo (rodar o runbook aplicável) ou Engenharia (se a causa for um bug de conector/pipeline); **quem valida** — nova medição do mesmo KPI após a correção, mesmo processo de auditoria; **como registrar** — entrada no relatório semanal (seção 4, Auditoria Semanal), citando o KPI, o valor antes/depois, e o runbook usado.

## 10. Definição oficial de CATALOG HEALTH

- **Saudável**: Brand Coverage ≥70% **e** Canonical Coverage ≥90% **e** Pending Review Aging <14 dias **e** `dead_letter` ~0.
- **Atenção**: qualquer KPI cruza o limite de alerta da seção 6, mas nenhum cruza o limite crítico.
- **Crítico**: qualquer um dos seguintes — Canonical Coverage <70%, Brand Coverage <50%, Recovery Throughput em 0 por >4 semanas, ou Review Throughput em 0 por >4 semanas.

**Estado atual, por esta definição: CRÍTICO** — Canonical Coverage em 46,8% (abaixo de 70%), Brand Coverage em 40,7% (abaixo de 50%), e Review Throughput em 0 desde sempre.

## 11. OPERATIONAL MATURITY MODEL

**Nível 1 — Manual**: toda operação depende de alguém lembrar de rodar um script manualmente, sem cadência real.
**Nível 2 — Repetível**: as mesmas operações rodam de forma consistente (idempotentes, com checkpoint), mas ainda sem cadência fixa nem métrica.
**Nível 3 — Mensurável**: KPIs definidos e medidos regularmente (este documento e o Ω-Catalog Quality criam a base, mas medição regular ainda não é prática estabelecida).
**Nível 4 — Automatizado**: crons rodam sem intervenção humana para as partes que não exigem julgamento (outbox, geração de merge candidates).
**Nível 5 — Autônomo**: o sistema se autocorrige sem revisão humana.

**Posição atual do ParaguAI: Nível 1 (Manual), com bases de Nível 2 já construídas em código.**

Justificativa por evidência: Catalog Recovery rodou exatamente 1 vez em produção; Merge Queue teve 14 aprovações desde que existe; Pending Reviews nunca foi operado (0 de 24.836); não existe nenhum dashboard ou alerta ativo hoje — tudo mediu-se manualmente, sob demanda, nesta e nas duas Missões anteriores. Ao mesmo tempo, as ferramentas em si já têm propriedades de Nível 2 (idempotência, checkpoint, retomada) — a lacuna não é técnica, é de **prática operacional estabelecida**.

O que falta para o Nível 2: transformar os runbooks desta Missão em cadência real (a mesma pessoa realmente rodar Recovery/Merge Queue toda semana, não só quando uma Missão pede). O que falta para o Nível 3: medir os SLIs desta seção com regularidade e registrar a série histórica (hoje cada medição é um evento isolado de Missão, não uma série contínua). O que falta para o Nível 4: aplicar a migration e fazer o deploy do Ω-Canonical Integration/Hardening — o código já é Nível 4 por design (crons automáticos, retenção, expiração), só não está em produção. O que falta para o Nível 5: nada planejado — autocorreção sem revisão humana contradiz o princípio Shadow Mode que rege Product Identity/Merge Engine desde a fundação do projeto; este é um teto arquitetural deliberado, não uma lacuna a fechar.

## 12. O ParaguAI já possui capacidade operacional para crescer 10x sem mudança arquitetural?

**NÃO.**

Justificativa exclusivamente com evidência: o **código** já foi construído para escala (Ω-Hardening: batch adaptativo, retenção, checkpoint de baixo consumo de memória para centenas de milhares de registros) — isso não está em questão. Mas esta Missão pediu especificamente capacidade **operacional**, e a evidência aqui é direta: hoje, com o volume atual, **0 de 24.836** pending reviews foram resolvidos e **14 de 4.681** merge candidates foram revisados, desde que o sistema existe. Um crescimento de 10x no catálogo produziria, pela mesma proporção medida hoje (59,3% de marca "Outros"), algo em torno de 227.000 produtos malformados e um backlog de revisão correspondentemente maior — sobre um processo cujo throughput real medido é **zero**. Arquitetura pronta para 10x não é o mesmo que operação pronta para 10x: a própria existência desta sequência de Missões (Ω-Catalog Quality e Ω-Catalog Operations) é evidência de que a lacuna reconhecida é exatamente essa. Crescer o volume sem primeiro estabelecer throughput operacional real (seção 11, Nível 2→3) multiplicaria o backlog, não a qualidade percebida pelo usuário.
