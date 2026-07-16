# SCALABILITY_REPORT.md
# Program Ξ (Xi) — Mission Ξ-1 — Autonomous Marketplace Engine

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-16
**Metodologia**: dados reais, dois tipos citados explicitamente por tipo — (1) tipos de virada já medidos em `docs/engineering/MARKETPLACE_FOUNDATION_SCALE_AUDIT.md` (2026-07-03, não remedidos aqui, citados); (2) observação direta desta própria sequência de Missions (Mission OPS-1, execução real em produção). Baseline real atual: 18.010 produtos, 18.015 ofertas, 929 categorias, 7 lojas, 852 marcas.

---

## 1. O achado mais urgente — não é um dos que o brief cita

Antes de projetar 50 mil-5 milhões: o componente que **já mostra estresse real na escala atual** é a geração de candidatos de merge via rede real (`CanonicalMergeSuggestionService.suggestMergesFor`, chamado sequencialmente, um produto por vez, por `scripts/canonical-catalog-bootstrap.ts`). Observação direta, Mission OPS-1 (2026-07-16): processar 18.010 produtos, com chamadas de rede reais (não simulação em memória), levou **mais de 60 minutos** (observação direta via checkpoints de execução desta sessão — o script não loga progresso, então a duração exata não foi cronometrada, mas o tempo decorrido entre início e conclusão foi medido pelos horários reais de checkpoint desta sessão). Isso é o gargalo real de escala mais próximo, não os 50-100 mil já nomeados por `MARKETPLACE_FOUNDATION_SCALE_AUDIT.md`.

## 2. Simulação por patamar (Objetivo 8) — nunca opinião, sempre dado já medido

| Patamar | Fator sobre hoje (18.010) | O que já está medido e continua escalando | O que já está medido e deixa de escalar | O que precisa evoluir |
|---|---:|---|---|---|
| **50 mil produtos** | 2,8x | Health Engine, Metrics, Alertas, Snapshot (todos `count`-only ou amostra fixa — `MARKETPLACE_FOUNDATION_SCALE_AUDIT.md` §"O que já está pronto") | Bootstrap sequencial real: ~2,8x o tempo observado hoje (60min→~3h) — ainda tecnicamente executável, mas deixa de ser um "piloto rápido" | Nada obrigatório ainda — zona de atenção, não de bloqueio |
| **100 mil produtos** | 5,6x | Mesmos componentes acima | Agregação de categoria/marca em memória entra na zona de virada já nomeada ("50-100 mil", `MARKETPLACE_FOUNDATION_SCALE_AUDIT.md` Achado 1); bootstrap sequencial (~5,6x = 6-14h) começa a ultrapassar uma janela operacional de um dia útil | `CatalogMetrics.getCategoryCoverage()`/`getBrandCoverage()` — migrar para `GROUP BY` Postgres (mitigação já documentada, não implementada) |
| **500 mil produtos** | 27,8x | Health Engine/Metrics/Alertas continuam seguros (mesma razão: contagem, não payload de linhas) | Agregação em memória "deixa de ser o padrão certo" (citação literal do achado já medido); bootstrap sequencial (27,8x ≈ dias) torna-se inviável como processo único | Processamento de merge suggestion precisa deixar de ser sequencial-por-produto-via-rede — paralelização ou fila, decisão de arquitetura fora do escopo desta Mission (seria código) |
| **1 milhão de produtos** | 55,5x | Contagens continuam O(1) por natureza (`count: exact, head: true`) | Fila de `merge_candidates`: à taxa real observada (+1.523 candidatos gerados sobre 18.010 produtos processados em Mission OPS-1 ≈ 8,5%), 1M produtos poderia gerar ~85 mil candidatos novos numa única passada — revisão 100% humana (restrição desta Mission preserva isso) deixa de ser operacionalmente viável neste volume | Fila de revisão precisa de priorização automática (não aprovação automática — `CONFIDENCE_ENGINE.md` já resolve isso sem violar Shadow Mode) |
| **5 milhões** (de ofertas, o número que `MARKETPLACE_FOUNDATION_SCALE_AUDIT.md` já identificou como o real ponto de virada, não o número de produtos) | — | Nada no atual `marketplace-operations/` sobrevive sem mudança neste patamar, segundo o próprio achado já medido | Merchant Priority Engine (`MerchantPriorityService.listAll()`) — busca todas as `offers`/`price_history` em uma única requisição, já nomeado como inviável neste volume | Mover para agregação por loja no Postgres (mitigação já documentada em 2026-07-03, ainda não implementada) |

## 3. Conclusão

Dois pontos de virada já estavam medidos e documentados antes desta Mission (50-100 mil produtos; 5 milhões de ofertas) — nenhum dos dois é urgente na escala real de hoje (18 mil produtos, 7 lojas). O ponto de virada que esta Mission encontra e que **não** estava documentado é mais próximo: o mecanismo real de geração de candidato de merge via chamadas de rede sequenciais já é lento na escala atual, e cresce pelo menos linearmente (provavelmente pior, dado que `findByBrandId` busca o coorte inteiro de uma marca por avaliação). Isso não é um problema de arquitetura de dados — é um problema de forma de execução (sequencial vs. paralelo/em lote), fora do escopo de mudança desta Mission, mas o achado mais acionável do Objetivo 8.
