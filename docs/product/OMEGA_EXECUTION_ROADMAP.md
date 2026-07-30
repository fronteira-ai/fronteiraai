# Ω EXECUTION ROADMAP
# Mission Ω-Execution Roadmap — Plano Mestre de Execução do ParaguAI

**Categoria**: `docs/product/`
**Criado**: 2026-07-25
**Status**: Oficial — plano mestre para os próximos 6–12 meses, consolidando Ω-COMPARISON AUDIT, Ω-CANONICAL INTEGRATION, Ω-HARDENING, Ω-PRODUCT DISCOVERY, Ω-CATALOG QUALITY e Ω-CATALOG OPERATIONS. Nenhuma evidência nova foi coletada para este documento — toda afirmação aqui já foi medida e registrada nas seis Missões anteriores desta sequência.
**Escopo**: exclusivamente priorização e sequenciamento. Nenhum código, migration ou algoritmo foi alterado.

---

## 1. Gargalos consolidados

| Gargalo | Origem | Impacto usuário | Impacto negócio | Urgência | Dependências | Risco de não tratar |
|---|---|---|---|---|---|---|
| ~~Sync Pipeline não linka offers ao Canonical Catalog automaticamente~~ | Ω-COMPARISON AUDIT | — | — | **Resolvido e deployado** (Ω-CANONICAL INTEGRATION, commit `bac54c4`, 2026-07-24 — `CanonicalLinkStage` ativo em produção) | Nenhuma | — |
| Marca "Outros" em 59,3% do catálogo (22.798 produtos) | Ω-PRODUCT DISCOVERY / Ω-CATALOG QUALITY | Alto — bloqueia filtro, busca relevante e matching | Alto — teto de qualquer ganho futuro de comparação | Alta | Catalog Recovery Engine (já pronto, rodou 1x) | Nenhuma melhoria de matching futura terá efeito prático |
| Pending Review Resolution sem nenhum ponto de execução | Ω-CATALOG OPERATIONS | Alto, indireto — correção humana nunca se propaga | Alto — Learning Engine depende disso, hoje vazio | Alta | Requer construir um consumidor mínimo (código novo — única exceção nesta lista) | 24.836 itens represados permanentemente; Learning Engine nunca recebe dado real |
| Merge Queue quase nunca operada (14 de 4.681 revisados) | Ω-COMPARISON AUDIT / Ω-CATALOG OPERATIONS | Alto — candidatos detectados nunca viram comparação visível | Médio-Alto | Média-Alta | Nenhuma — UI já existe e funciona | Candidatos genuínos (114–121 cross-store já medidos) nunca geram valor real |
| Especificações estruturadas ausentes em 70,3% do catálogo | Ω-PRODUCT DISCOVERY / Ω-CATALOG QUALITY | Médio-Alto | Médio | Média | Melhoria por conector, iterativa | Mesmo com marca certa, confiança de match tem teto |
| Nenhuma cadência operacional/medição contínua estabelecida | Ω-CATALOG OPERATIONS | Indireto | Médio — regressões não são detectadas | Média | Nenhuma técnica — disciplina de operação | Qualquer ganho conquistado pode regredir sem ninguém perceber |

## 2. Matriz Impacto × Esforço

**Alto Impacto / Baixo Esforço** — fazer primeiro:
- ~~Deploy do Ω-Canonical Integration~~ — **feito** (`bac54c4`, 2026-07-24)
- Catalog Recovery Engine em volume completo (ferramenta pronta, só precisa rodar)
- Cadência real de Merge Queue (UI já existe)
- Auditoria semanal com os scripts já existentes

**Alto Impacto / Alto Esforço** — planejar:
- Construir o entrypoint de Pending Review Resolution (única iniciativa que exige código novo nesta lista; alto impacto porque desbloqueia Learning Engine + Review Throughput)
- Melhorar extração de especificações por loja (trabalho por conector, não uma correção única)

**Baixo Impacto / Baixo Esforço** — oportunista:
- Bootstrap Histórico de lojas já pequenas e 100% linkadas (Nissei/Cellshop — só 2 offers cada, quase nada pendente)
- Ajustes finos de fragmentação de categoria (já em 94,9%, ganho marginal)

**Baixo Impacto / Alto Esforço** — adiar:
- Evoluir busca para deduplicar via Canonical Product **antes** de CPC subir (hoje o ganho percebido seria quase nulo — a mesma iniciativa vira Alto Impacto depois que CPC subir, é uma questão de sequência, não de mérito)
- Dashboard executivo completo automatizado antes de haver dado real fluindo pelos processos

## 3. Priorização

1. ~~**Deploy Ω-Canonical Integration**~~ — **concluído** (`bac54c4`, 2026-07-24). O outbox que essa integração alimenta (`canonical_suggestion_outbox`) precisou de dois hotfixes adicionais para operar em escala real (Mission Ω-Merge-Suggestions Hotfix + Ω-GitHub Final Hotfix, 2026-07-29/30) — ver `docs/operations/PROJECT_STATUS.md`.
2. **Catalog Recovery Engine em volume** — ferramenta pronta, 830 de ~23.500 candidatos de marca já processados (piso de 3,7%). Benefício: Brand Coverage sobe diretamente. Pré-requisito: nenhum. Risco: baixo.
3. **Construir entrypoint mínimo de Pending Review Resolution** — única ação de código desta lista; maior alavancagem estrutural porque é a ÚNICA fonte de correção humana confirmada que alimenta o Learning Engine. Pré-requisito: decisão de escopo de uma Mission de implementação. Risco: baixo (é aditivo, reusa serviço já testado).
4. **Cadência real de Merge Queue** — UI pronta, zero código. Benefício: Merge Approval Rate sai de 0,3%. Pré-requisito: nenhum. Risco: baixo.
5. **Estabelecer Auditoria Semanal como prática** — scripts já existem (`product-discovery-audit.ts`, `catalog-quality-signature-recovery.ts`, `comparison-forensics-audit.ts`). Benefício: transição para Nível 3 de maturidade (Ω-CATALOG OPERATIONS). Risco: nenhum.
6. **Bootstrap Histórico do backlog Shopping China** — depende do item 1. Benefício: Canonical Coverage da maior loja sobe de 10,7% para perto de 100%.
7. **Operar Pending Review Resolution em volume** — depende do item 3. Benefício: Review Throughput deixa de ser zero; Learning Engine passa a ter dado real.
8. **Melhorar extração de especificações por loja** — mais lento, paralelo a tudo acima, sem bloquear nada.
9. **Evoluir busca para deduplicar por Canonical Product** — só depois que CPC subir de forma perceptível (meta de curto prazo já definida: 1%).

## 4. Sequenciamento em ondas

**Onda 1** (imediata, paralela, sem conflito entre si):
- Deploy Ω-Canonical Integration (Engenharia)
- Catalog Recovery Engine em volume (Operador de Catálogo)
- Início de cadência de Merge Queue (Operador de Catálogo)

**Onda 2** (parcialmente dependente da Onda 1):
- Bootstrap Histórico do backlog Shopping China (depende do deploy)
- Definição de escopo da Mission de entrypoint de Pending Review Resolution (independente, pode começar em paralelo)
- Consolidação de Auditoria Semanal como prática contínua

**Onda 3** (depende da Onda 2):
- Operação de Pending Review Resolution em volume (depende do entrypoint construído)
- Learning Engine backfill regular (depende de Pending Review ter throughput real)
- Melhoria de extração de especificações por loja (paralela, não bloqueia nada)

**Onda 4** (só faz sentido após ganho real de CPC):
- Evolução da busca para deduplicar por Canonical Product
- Dashboard executivo completo e alertas automatizados

## 5. Critérios de entrada e saída por onda

| Onda | Entrada | Saída | KPIs que devem melhorar |
|---|---|---|---|
| 1 | Aprovação de deploy já concedida (Ω-Hardening); disponibilidade de operador | Canonical Coverage >90%; Recovery Coverage em crescimento sustentado; Merge Approval Rate >5% | Canonical Coverage, Brand Coverage, Merge Approval Rate |
| 2 | Onda 1 com Canonical Coverage >90% | Checkpoint do Bootstrap Histórico em `completed`; escopo da Mission de entrypoint definido | Canonical Coverage (Shopping China especificamente), Recovery Coverage |
| 3 | Entrypoint de Pending Review Resolution funcionando | Review Throughput sustentado >0; Pending Review Aging caindo; `knowledge_history` crescendo | Review Throughput, Pending Review Aging, Learning Engine (linhas novas) |
| 4 | Comparable Product Coverage ≥1% (meta de curto prazo já definida na Ω-CATALOG QUALITY) | Busca sem duplicação perceptível; dashboard ativo | Comparable Product Coverage, experiência de busca (qualitativo) |

## 6. Estimativa de ganho (qualitativo)

| Iniciativa | Ganho usuário | Ganho operacional | Ganho marketplace | Redução de risco | KPI afetado |
|---|---|---|---|---|---|
| Deploy Ω-Canonical Integration | Alto | Alto | Alto | Alto (elimina débito arquitetural já identificado) | Canonical Coverage |
| Catalog Recovery em volume | Alto | Médio | Alto | Médio | Brand Coverage, Recovery Coverage |
| Entrypoint Pending Review | Alto (indireto) | Alto | Médio | Alto (destrava Learning Engine) | Review Throughput, Pending Review Aging |
| Cadência Merge Queue | Alto | Médio | Médio | Baixo | Merge Approval Rate |
| Auditoria semanal contínua | Baixo (indireto) | Alto | Baixo | Alto (detecção precoce de regressão) | Todos os SLIs |
| Bootstrap Histórico (Shopping China) | Alto | Médio | Alto | Baixo | Canonical Coverage |
| Enriquecimento de especificações | Médio | Baixo | Médio | Baixo | Specification Coverage, ProductSignature Depth |
| Busca sem duplicação | Alto (só após Onda 3–4) | Baixo | Alto | Baixo | Comparable Product Coverage (percepção) |

## 7. Dependências cruzadas e caminho crítico

```
Deploy Ω-Canonical Integration ──┬──► Bootstrap Histórico (Shopping China) ──► Canonical Coverage ≈100%
                                  │
Catalog Recovery em volume ──────┼──► Brand Coverage sobe ──► candidatos de merge com mais qualidade
                                  │
Cadência de Merge Queue ─────────┴──► Merge Approval Rate sobe

Entrypoint Pending Review (código) ──► Review Throughput > 0 ──► Learning Engine com dado real ──► correções automáticas por loja (futuro)

[Canonical Coverage alto] + [Brand Coverage alto] + [Merge Approval Rate alto] ──► Comparable Product Coverage sobe de forma real ──► Busca sem duplicação passa a valer a pena
```

**Caminho crítico para o maior ganho de valor ao usuário** (Comparable Product Coverage subir de 0,04% para algo perceptível) passa pelas três pernas da Onda 1 simultaneamente — nenhuma sozinha é suficiente, mas todas as três já estão prontas para começar amanhã, sem nenhum código novo.

## 8. Missões recomendadas

1. **Mission Ω-Canonical Rollout** — Objetivo: aplicar as migrations já aprovadas e fazer o deploy do Ω-Canonical Integration/Hardening. Escopo: operação de rollout, não implementação. Resultado esperado: Canonical Coverage de 46,8% para >90%. Dependências: nenhuma. Critério de sucesso: `CanonicalLinkStage` ativo, crons rodando, 0 regressão nos testes já existentes.
2. **Mission Ω-Brand Resolution at Scale** — Objetivo: operar o Catalog Recovery Engine até esgotar o backlog de marca "Outros". Escopo: execução operacional recorrente, sem novo código. Resultado esperado: Brand Coverage de 40,7% para ≥70%. Dependências: nenhuma. Critério de sucesso: `catalog_recovery_decisions` cobrindo ≥80% do backlog medido.
3. **Mission Ω-Review Entrypoint** — Objetivo: construir o consumidor mínimo de `PendingReviewResolutionService` (script ou rota) — única Mission desta lista que implementa código novo. Escopo: aditivo, reusa serviço já testado, sem alterar Gatekeeper/Recovery Engine. Resultado esperado: Review Throughput deixa de ser zero. Dependências: nenhuma técnica. Critério de sucesso: primeira resolução real em produção.
4. **Mission Ω-Merge Cadence** — Objetivo: estabelecer e sustentar cadência semanal de revisão da Merge Queue. Escopo: operacional, ferramenta já existe. Resultado esperado: Merge Approval Rate de 0,3% para ≥30%. Dependências: nenhuma. Critério de sucesso: backlog de `pending` não cresce mais do que é revisado.
5. **Mission Ω-Specification Enrichment** — Objetivo: elevar Specification Coverage e ProductSignature Depth por loja. Escopo: melhoria de parser por conector, sem novo algoritmo central. Resultado esperado: Specification Coverage de 29,7% para ≥45%. Dependências: nenhuma. Critério de sucesso: ProductSignature Depth (≥2 campos além de manufacturerCode) sobe de forma mensurável por loja.
6. **Mission Ω-Search Deduplication** — Objetivo: evoluir a busca para consultar o Canonical Catalog em vez de `products` bruto. Escopo: só iniciar depois que Comparable Product Coverage atingir ≥1%. Resultado esperado: usuário para de ver o mesmo produto como resultados aparentemente diferentes. Dependências: Missões 1–4 concluídas. Critério de sucesso: resultados de busca deduplicados para os produtos já agrupados.

## 9. Riscos estratégicos

**Decisões que podem comprometer o roadmap**: adiar indefinidamente o deploy do Ω-Canonical Integration — é a única ação sem custo adicional e sem risco técnico já identificado; adiá-la sem motivo técnico é puro custo de oportunidade. Tratar "qualidade de dado" como um projeto único e finito, em vez de uma operação contínua (seção 11 da Ω-CATALOG OPERATIONS já mostrou que a lacuna é de prática, não de ferramenta) — se as Missões 1–4 forem tratadas como eventos isolados em vez de cadência, o catálogo volta ao estado atual em poucas semanas.

**Iniciativas que podem esperar**: Mission Ω-Search Deduplication (dependente de CPC subir primeiro); dashboard executivo completo e automação de alertas (mais valiosos depois que os processos de base já tiverem dado real fluindo).

**Iniciativas que não podem esperar**: Mission Ω-Canonical Rollout e Mission Ω-Brand Resolution at Scale — ambas já têm ferramenta pronta, zero dependência técnica, e são pré-requisito para qualquer ganho futuro medido nas seis Missões anteriores.

## 10. Recomendação final

**"Se eu fosse responsável pelo ParaguAI, começaria amanhã pela Mission Ω-Canonical Rollout."**

Justificativa, exclusivamente com evidência já coletada: é a única iniciativa deste roadmap com **esforço marginal zero** — o código já foi implementado, testado (875 testes, 0 falhas) e aprovado explicitamente nas Fases 1–3 da Mission Ω-Canonical Integration/Hardening; falta apenas aplicar a migration e fazer o deploy, uma decisão de rollout, não de engenharia. É também a iniciativa com o **maior raio de desbloqueio**: sem ela, Canonical Coverage permanece em 46,8% (Shopping China, 59,6% do volume do marketplace, continua 89,3% fora do sistema), o Bootstrap Histórico não tem onde rodar, e toda geração automática de Merge Candidates continua dependendo de execução manual do script antigo. Nenhuma outra iniciativa deste roadmap — nem Brand Resolution, nem Review Entrypoint — tem esse mesmo custo zero combinado com esse mesmo raio de impacto: as duas exigem execução operacional real ao longo de semanas; o Rollout exige uma decisão que já foi tomada.
