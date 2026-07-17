# PRODUCT_IDENTITY_MEMORY_ROLLOUT_RUNBOOK.md
# Program Ω — Implementation Phase, Mission Ω-4 — Controlled Production Rollout

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-17
**Escopo**: exclusivamente operacional — nenhum código, nenhuma arquitetura, nenhuma feature nova. Opera exclusivamente os dois mecanismos que Mission Ω-3 já construiu e testou: `PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT` e `PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT`.

---

## 0. Onde este rollout realmente acontece

`CanonicalMergeSuggestionService.suggestMergesFor` — a única superfície real que este flag afeta — é invocado hoje exclusivamente por `scripts/canonical-catalog-bootstrap.ts` (execução operacional em lote, o mesmo caminho usado em Mission OPS-1 e no backfill de Marketplace Memory), não por nenhuma rota de API síncrona voltada ao comprador. "Rollout em produção", nesta arquitetura, significa **qual fração dos `canonical_products`, selecionada deterministicamente por hash do id, usa leitura de Marketplace Memory na próxima vez que o pipeline de sugestão rodar** — não uma mudança instantânea de comportamento por requisição de usuário. Isso muda a leitura de "tempo de rollback" (§4) e de "SLO de latência" (§2) em relação a um serviço request/response tradicional — documentado explicitamente, não presumido.

## 1. Rollout progressivo — critérios objetivos de avanço (Objetivo 1/7)

| Etapa | O que muda | Critério objetivo de avanço para a próxima |
|---|---|---|
| 0% (hoje) | Nenhum produto usa leitura — comportamento idêntico a antes de Mission Ω-3 | Baseline: Quality Gate verde (716/716 testes), comparação real 8/8 idêntica (Mission Ω-3) |
| 5% | ~1/20 dos produtos, selecionados por hash determinístico | Parity Errors = 0 nesta etapa; Fallback Rate dentro do SLO (§2); nenhuma regressão no volume/confiança de `merge_candidates` gerados |
| 10% | ~1/10 dos produtos | Mesmos critérios da etapa anterior, sustentados por uma segunda execução independente |
| 25% | ~1/4 dos produtos | Mesmos critérios; primeira etapa em que a Reuse Rate real (§3) se torna estatisticamente estável o suficiente para comparar com a redução teórica de 624,2x (Mission Ξ-2) |
| 50% | Metade dos produtos | Mesmos critérios; nenhuma etapa anterior pode ter tido uma regressão não explicada |
| 100% | Todo produto processado usa leitura primeiro | Mesmos critérios; esta é a etapa em que `PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT` passa a ser candidato a reduzir (decisão de uma Mission futura, não desta) |

**Nenhuma etapa avança automaticamente** — cada avanço é uma decisão humana explícita, baseada nas métricas reais coletadas na etapa atual (Quality Gate desta Mission: "nenhuma promoção poderá ocorrer sem evidências").

## 2. SLOs — cada um justificado pela arquitetura já existente, nenhum valor inventado

| SLO | Valor | Justificativa real |
|---|---|---|
| Parity Errors | **0 tolerado sem investigação** (não "0 sempre" — o mecanismo já se autocorrige) | O design de Mission Ω-3 já garante que uma divergência nunca produz um resultado errado (`specsEqual` falha → retorna o valor fresco). O SLO aqui não é sobre correção (já garantida), é sobre qualidade de dado da Memory — qualquer contagem > 0 sinaliza fatos obsoletos acumulando e deve ser investigada, nunca ignorada silenciosamente |
| Fallback Rate | **< 5%** | Ancorado no precedente real já em produção: `MarketplaceHealthEngine` já trata uma taxa de erro média de conector de 2,5% como saudável (`connector_errors: 98/100`, medido em Mission Φ-1). Leituras de Marketplace Memory são estruturalmente mais simples que um sync de conector externo — 5% é deliberadamente mais folgado que o precedente de 2,5%, porque esta é a primeira operação real sob carga desta Mission, não um sistema já maduro |
| Read Success Rate | **> 95%** | O inverso aritmético do Fallback Rate acima — mesmo SLO, nomeado como o número que a Mission pediu explicitamente |
| Rollback Time | Ver §4 — dois números reais, diferentes por natureza da operação, nunca um único número inventado | — |

## 3. Observability — o "dashboard" (Objetivo 3)

Sem UI nova (restrição: "nenhuma nova funcionalidade") — os 6 contadores já existem em produção desde Mission Ω-3 (`readThroughMetrics`, exportado por `CanonicalMergeSuggestionService`). Este "dashboard" é a leitura desses contadores ao final de cada execução operacional, reportada aqui como uma tabela, mesma disciplina de todo relatório real desta sequência de Missions:

| Métrica | Fonte real |
|---|---|
| Read Hits / Read Misses | `readThroughMetrics.hits` / `.misses` |
| Reuse Rate | `hits / reads` |
| Fallback Rate | `fallbacks / reads` |
| Parity Errors | `readThroughMetrics.parityErrors` |
| Latency | Tempo de parede da execução do script (`time npx tsx ...`), mesma metodologia já usada em Mission Ω-2 |
| Memory Reads | `readThroughMetrics.reads` |
| Memory Writes | contagem real de `learnFacts` bem-sucedidos (write-back em misses) |

## 4. Rollback Plan (Objetivo 4)

- **Quando interromper o rollout**: Parity Errors > 0 sem explicação documentada imediata, OU Fallback Rate > 5% sustentado por mais de uma execução.
- **Quando voltar para 0%**: qualquer regressão real no volume ou na confiança dos `merge_candidates` gerados, comparado ao baseline de Mission Ω-3 (8 candidatos, mesma confiança, no conjunto de 300 produtos já validado).
- **Quando congelar avanço** (ficar na etapa atual, sem regressão nem avanço): Fallback Rate entre 3-5% — dentro do SLO, mas próximo o suficiente do limite para justificar mais uma execução de confirmação antes de avançar.
- **Quando promover**: todos os critérios de §1 atendidos, com evidência real anexada ao relatório da etapa.
- **Como reverter, tecnicamente**: `PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT=0` no próximo comando executado — **imediato** para o caminho operacional real desta Mission (scripts, lidos via `process.env` a cada execução, nunca cacheado). Se esta leitura for um dia promovida para uma rota de API síncrona da aplicação Next.js implantada na Vercel, a reversão exigiria alterar a env var no painel da Vercel — **não instantânea**, sujeita ao tempo de novo deploy da plataforma (minutos, não segundos) — nomeado aqui honestamente como uma diferença real entre os dois contextos de execução, não escondida.

## 5. Como operar (Objetivo 8)

- **Como monitorar**: rodar `npx tsx scripts/canonical-catalog-bootstrap.ts --execute` com `PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT` no valor da etapa atual; ler os 6 contadores de `readThroughMetrics` ao final (hoje só via log — nenhuma persistência de métrica histórica existe ainda, gap nomeado, não desta Mission).
- **Como pausar**: não iniciar a próxima execução — como o rollout não é contínuo/em tempo real (é por execução de script), "pausar" é simplesmente não rodar a próxima vez.
- **Como reverter**: ver §4.
- **Como investigar um incidente**: toda divergência de paridade já é logada com `console.error` incluindo o `canonical_product_id`, o valor reutilizado, e o valor recalculado (Mission Ω-3) — o ponto de partida de qualquer investigação é essa linha de log.

## 6. Resultado real do rollout executado (2026-07-17)

Todos os 6 estágios (0/5/10/25/50/100%) foram executados de verdade contra produção, amostra fixa e determinística de 500 `canonical_products` por estágio:

| Estágio | Elapsed | ms/produto | Memory Reads | Hits | Misses | Fallbacks | Parity Errors | `merge_candidates` Δ |
|---|---|---|---|---|---|---|---|---|
| 0% (baseline) | 92,5s | 185,1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 5% | 142,7s | 285,5 | 6.902 | 3.374 | 3.528 | 0 | 0 | 0 |
| 10% | 142,0s | 284,0 | 13.719 | 7.443 | 6.276 | 0 | 0 | 0 |
| 25% | 192,7s | 385,4 | 36.387 | 18.780 | 17.607 | 0 | 0 | 0 |
| 50% | 250,4s | 500,8 | 70.472 | 35.242 | 35.230 | 0 | 0 | 0 |
| 100% | 831,9s | 1.663,7 | 141.434 | 72.514 | 68.920 | 0 | 0 | 0 |

**Correção**: provada em toda a faixa 0-100% com dados reais — 0 Parity Errors, 0 Fallbacks, 0 regressão em `merge_candidates`, em qualquer estágio.

**Performance**: degrada com o rollout, não melhora — porque `PRODUCT_IDENTITY_MEMORY_PARITY_SAMPLE_PERCENT` está no padrão de 100%, forçando recomputo total em todo hit. A 100%, uma execução completa do catálogo (~17.983 produtos) extrapola para **~8,3 horas**, contra ~55 minutos no baseline. O ganho teórico de eliminar a redundância de 624,2x (Mission Ξ-2) permanece bloqueado até uma Mission futura reduzir a taxa de amostragem de paridade.

**Decisão operacional vigente**: `PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT=50` em `.env.local` — correção idêntica a 100%, custo de tempo ~2,7x o baseline (aceitável), sem pagar o custo adicional de 100% até a amostragem de paridade ser revisada.
