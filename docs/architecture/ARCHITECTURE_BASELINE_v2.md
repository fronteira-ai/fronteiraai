# ARCHITECTURE BASELINE v2.0
# Constituição Arquitetural do ParaguAI — Encerramento do Primeiro Ciclo de Engenharia

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-25
**Status**: Oficial — referência primária para todas as futuras evoluções do ParaguAI. Substitui a necessidade de ler qualquer Mission Ω anterior individualmente.
**Escopo**: exclusivamente consolidação. Nenhum código, migration, algoritmo ou decisão arquitetural nova foi criada para produzir este documento — cada afirmação aqui já foi decidida, implementada e/ou medida por uma das onze Missions do Programa Ω.

---

## 1. Executive Summary

**Objetivo da plataforma**: ParaguAI é um marketplace de comparação de preços (UI em português) para lojas do Paraguai/região de fronteira. A proposta de valor central — declarada oficialmente em `docs/engineering/CATALOG_QUALITY_GOVERNANCE.md` — é a **Comparable Product Coverage**: a fração do catálogo em que um mesmo produto real, vendido por lojas diferentes, é reconhecido como o mesmo produto e comparável lado a lado.

**Estado atual**: a arquitetura que sustenta essa proposta de valor está **implementada, testada e em produção** desde a Mission Ω-Canonical Rollout (2026-07-25). O pipeline completo — do conector até o Canonical Catalog — está ativo e automático pela primeira vez na história do projeto. Por outro lado, a **operação** que deveria consumir essa arquitetura está, pela própria definição oficial adotada (`CATALOG_OPERATIONS_MANUAL.md §10`), em estado **CRÍTICO**: Canonical Coverage e Brand Coverage abaixo dos limites críticos, Review Throughput em zero desde sempre.

**Principais capacidades** (todas já em produção, exceto onde indicado):
- Pipeline de sincronização multi-loja (7 lojas ativas) com normalização determinística de marca/categoria (Gatekeeper) e recuperação de backlog histórico (Recovery Engine).
- Product Identity Engine determinístico (matching por thresholds fixos — nunca alterado por nenhuma Mission desta sequência).
- Canonical Catalog integrado automaticamente ao Sync Pipeline via `CanonicalLinkStage` + Transactional Outbox (AT LEAST ONCE DELIVERY), com prioridade, retenção, expiração e observabilidade centralizada.
- Continuous Knowledge Engine — ledger de conhecimento versionado e append-only, alimentado por correções humanas confirmadas.
- Shadow Mode em toda a cadeia de decisão de merge — o sistema sugere, nunca decide sozinho.

**Limitações conhecidas** (detalhadas na Seção 8): timeout serverless de 60s em rotas de sincronização/processamento agregado sob backlog real; `PendingReviewResolutionService` sem nenhum ponto de execução em produção; dependência total de revisão humana para qualquer merge; cobertura de marca e especificações ainda baixas; maturidade operacional em Nível 1 (Manual).

---

## 2. Arquitetura Oficial

Domínios existentes hoje em `src/domains/*` (20 domínios):

| Domínio | Responsabilidade |
|---|---|
| `connectors` | Pipeline de sincronização por loja: conectores, stages (`CatalogWriteStage`, `CanonicalLinkStage`), Gatekeeper, Recovery Engine, Outbox (repositório, sweep, retenção, expiração, observabilidade, bootstrap histórico) |
| `canonical-catalog` | Canonical Catalog: produtos canônicos, `merge_candidates`, `MergeExecutorService`, auditoria de merge |
| `product-identity` | Product Identity Engine determinístico — matching, thresholds de confiança, `CanonicalMergeSuggestionService.suggestMergesFor()` (a ponte única para `canonical-catalog`) |
| `taxonomy` | Normalização e hierarquia de categoria (Universal Taxonomy) |
| `learning-engine` | Continuous Knowledge Engine — `knowledge_history` append-only, versionado |
| `market-insights` | Inteligência de mercado agregada (mediana, dispersão, savings, volatilidade de preço) |
| `marketplace-memory` | Memória de identidade de produto, leitura read-through |
| `marketplace-operations` | Snapshot operacional do marketplace |
| `catalog-intelligence` | Score de qualidade por produto (0–100), histórico diário |
| `product-intelligence` | Camada de inteligência de produto (fundação de comparação, ranking de ofertas) |
| `buyer-intelligence` | Composição read-only de inteligência já existente (merchant-side) para o comprador |
| `buyer-identity` | Identidade e autenticação do comprador |
| `merchant-intelligence` | Command Center do merchant |
| `merchant-analytics` | Analytics de merchant (eventos append-only) |
| `merchant-decision` | Motor de decisão declarativo para merchants |
| `merchant-ownership` | Gestão de propriedade de loja por merchant |
| `growth-engine` | Estratégias de crescimento e priorização transparente para merchants |
| `trust` | Sinais de confiança, reviews, timeline, perfil de merchant |
| `exchange` | Taxas de câmbio |
| `realtime-commerce` | Market pulse e alertas de comprador em tempo real |

---

## 3. Fluxo Oficial de Dados

Fluxo verificado por leitura direta do código-fonte (não apenas por documentação anterior):

```
Connector
  ↓
CatalogWriteStage
  ↓
CanonicalLinkStage                          (src/domains/connectors/services/stages/CanonicalLinkStage.ts
  │                                           implementa ISyncStage — bootstrap + link + enqueue,
  │                                           síncrono e barato)
  ↓
canonical_suggestion_outbox                  (ICanonicalSuggestionOutboxRepository — enqueue/claimBatch/
  │                                           markDone/markFailedForRetry/markDeadLetter; AT LEAST ONCE
  │                                           DELIVERY; prioridade, retenção, expiração)
  ↓
cron merge-suggestions                       (CanonicalSuggestionSweepService.sweep() — batch adaptativo)
  ↓
CanonicalMergeSuggestionService
  .suggestMergesFor(canonicalProductId)       (src/domains/product-identity/services/ — a única ponte
  │                                           product-identity → canonical-catalog, documentada como
  │                                           "never the reverse"; usa ProductIdentityEngine, thresholds
  │                                           fixos 95/85/70, intocado por qualquer Mission desta série)
  ↓
merge_candidates                             (status='pending' — Shadow Mode)
  ↓
Revisão humana (/admin/merge-execution)
  ↓
MergeExecutorService                         (approve/reject/preview/execute/executeBatch/rollback)
  ↓
Canonical Catalog                            (offers reatribuídas, merge_executions gravado)
  ↓
Marketplace
```

Cron `outbox-maintenance` (retenção + expiração) roda em paralelo, independente do fluxo principal, mantendo a fila saudável.

---

## 4. Componentes Congelados

### `CanonicalMergeSuggestionService.suggestMergesFor(canonicalProductId: string): Promise<void>`
- **Responsabilidade**: gerar sugestões de merge para um Canonical Product, usando o Product Identity Engine.
- **Interface pública**: um único método, uma entrada (`canonicalProductId`), nenhum retorno de dado (efeito é a escrita em `merge_candidates`).
- **Restrições**: nunca decide um merge sozinho; nunca é chamado na direção inversa (canonical-catalog nunca chama de volta para dentro de si mesmo de forma síncrona bloqueante do Sync Pipeline).
- **Invariantes**: thresholds de confiança (`auto=95`, `probable=85`, `possible=70`) fixos desde a criação do Product Identity Engine; nenhuma Mission desta sequência alterou uma linha deste componente.

### Gatekeeper — `BrandCategoryGatekeeper` (`src/domains/connectors/normalization/`)
- **Responsabilidade**: normalizar `brand`/`category` de forma determinística no momento da escrita, antes de qualquer produto malformado entrar no catálogo.
- **Interface pública**: `resolveBrand(input, deps)`, `resolveCategory(input, deps)` — funções puras, não uma classe.
- **Restrições**: camadas de resolução são determinísticas, nunca probabilísticas/IA.
- **Invariantes**: intocado por Ω-Canonical Integration, Ω-Hardening, Ω-Catalog Quality e Ω-Catalog Operations — confirmado por leitura de diff em cada uma.

### Recovery Engine — `CatalogRecoveryEngine` (`src/domains/connectors/services/`)
- **Responsabilidade**: recuperar `brand_id`/`category_id` de produtos escritos antes do Gatekeeper existir, via 5 camadas determinísticas.
- **Interface pública**: `decideBrand(...)`, `decideCategory(...)`, `evaluateCandidate(candidate, deps)` — funcional, não classe com estado.
- **Restrições**: decisões são aditivas — `catalog_recovery_decisions` nunca é sobrescrita.
- **Invariantes**: idempotente; auditável; intocado por todas as Missions posteriores a Ω-Rehabilitation.

### Outbox — `ICanonicalSuggestionOutboxRepository`
- **Responsabilidade**: desacoplar a geração de sugestões de merge do caminho crítico da sincronização, com contrato de entrega garantida.
- **Interface pública**: `enqueue(canonicalProductId, source, priority?)`, `claimBatch(limit, staleClaimMs)`, `markDone`, `markFailedForRetry`, `markDeadLetter`.
- **Restrições**: contrato **AT LEAST ONCE DELIVERY** — todo consumidor deve ser idempotente; claim é um SELECT + UPDATE condicional de dois passos, sem `FOR UPDATE SKIP LOCKED` nem RPC customizada — a atomicidade vem da garantia própria do UPDATE do Postgres.
- **Invariantes**: item claimado e nunca finalizado é reclamado automaticamente após `staleClaimMs` (padrão 5 minutos, `CanonicalSuggestionSweepService.ts`) — **verificado em produção real na Mission Ω-Canonical Rollout**: 180 itens presos em `processing` por uma requisição morta (timeout 504) foram corretamente reclamados na chamada seguinte.

### `MergeExecutorService` (`src/domains/canonical-catalog/services/`)
- **Responsabilidade**: aplicar ou reverter uma decisão humana já aprovada.
- **Interface pública**: `approve`, `reject`, `preview`, `execute`, `executeBatch`, `rollback(executionId, rolledBackBy)`.
- **Restrições**: só executa candidatos já `approved`; nunca decide por conta própria.
- **Invariantes**: toda execução é permanentemente auditável em `merge_executions`; rollback reverte exatamente as offers movidas por aquela execução específica.

---

## 5. Princípios Arquiteturais

- **Shadow Mode primeiro** — Product Identity e o Merge Engine nunca decidem sozinhos; toda decisão de merge exige aprovação humana. Declarado explicitamente como "teto arquitetural deliberado, não uma lacuna a fechar" (`CATALOG_OPERATIONS_MANUAL.md §11`).
- **Mudanças aditivas** — toda evolução de interface usada nesta sequência (`enqueue(...,priority?)`, `sweep(batchLimit?, staleClaimMs?)`, `StageMetrics.details?`) foi feita por parâmetro opcional com valor padrão, nunca por breaking change.
- **Idempotência** — Recovery Engine, Outbox, Bootstrap Histórico: toda operação repetível sem efeito colateral duplicado.
- **AT LEAST ONCE DELIVERY** — contrato formal do Outbox (Fase 1 da Ω-Canonical Integration), consumidor sempre responsável por ser idempotente.
- **`text + CHECK` em vez de `ENUM` nativo** — convenção de schema deliberada e consistente em todo o projeto; usada até para justificar ordenar prioridade em memória em vez de nativamente.
- **Checkpoint por `run_key` nomeado, nunca uma linha global única** — mesma disciplina de `merge_executions`/`knowledge_history`, estendida ao Bootstrap Histórico.
- **Evidência antes de opinião** — metodologia declarada de toda Mission desta sequência: nenhuma conclusão sem medição real contra produção.
- **KPIs antes de otimizações** — Ω-Catalog Quality precedeu qualquer proposta de melhoria de algoritmo.
- **Observabilidade obrigatória** — `OutboxObservabilityService` como fonte única de métricas operacionais do subsistema Outbox.
- **Rollout incremental** — Fases 1→2→3 na Ω-Canonical Integration, cada uma aprovada explicitamente antes de avançar.
- **Recuperação automática** — reclaim de claims obsoletas, expiração como rede de segurança independente do dead-letter.
- **Falhar de forma segura** — dead-letter nunca é reenfileirado automaticamente; erro é sempre visível, nunca silencioso.

---

## 6. KPIs Oficiais

Fonte: `docs/engineering/CATALOG_QUALITY_GOVERNANCE.md §3-4` (Mission Ω-Catalog Quality).

| KPI | Fórmula | Frequência | Meta 30d | Meta 90d | Meta 180d |
|---|---|---|---|---|---|
| Brand Coverage | produtos com brand não-forbidden / total | Semanal | 50% | 70% | 90% |
| Category Coverage | produtos com category não-forbidden / total | Semanal | 95% | 96% | 97% |
| Specification Coverage | produtos com `specifications` ≠ {} / total | Semanal | 35% | 45% | 60% |
| ProductSignature Depth | produtos com ≥2 campos de `ProductSignature` (excl. `manufacturerCode`) / total | Quinzenal | 10% | 20% | 35% |
| Canonical Coverage | offers com `canonical_product_id` / total de offers | Diária | 90% | 97% | 99% |
| Comparable Product Coverage (CPC) | canonical products ativos com ≥2 lojas distintas / canonical products ativos | Semanal | 1% | 3% | 5% |
| Pending Review Aging | média(now() − created_at) sobre `catalog_pending_reviews.status='pending'` | Semanal | <30d | <14d | <7d |
| Merge Approval Rate | `merge_candidates` em {approved,rejected,merged} / total | Semanal | 10% | 30% | 60% |
| Review Throughput | pending_reviews resolvidos + merge_candidates revisados / semana | Semanal | >100/sem | >500/sem | >1000/sem |
| Recovery Coverage | `catalog_recovery_decisions`(brand) / (decisões + backlog restante) | Mensal | 20% | 50% | 80% |

---

## 7. Operational Health

Fonte: `docs/operations/CATALOG_OPERATIONS_MANUAL.md §8, §10`.

- **Pipeline Health**: Canonical Coverage · offers linkadas por loja · Outbox por status (`pending`/`processing`/`dead_letter`/`expired`) · Merge Candidates por status.
- **Catalog Health**: Brand Coverage · Category Coverage · Specification Coverage · ProductSignature Depth · Image Coverage · Price Coverage.
- **Operational Health**: Pending Review Aging · Review Throughput · Recovery Throughput · Merge Approval Time · Merge Approval Rate.
- **Marketplace Health**: Comparable Product Coverage · número de lojas ativas · distribuição de offers por loja · idade do dado mais antigo não revisado.

**Definição oficial de CATALOG HEALTH**:
- **Saudável**: Brand Coverage ≥70% **e** Canonical Coverage ≥90% **e** Pending Review Aging <14 dias **e** `dead_letter` ~0.
- **Atenção**: qualquer KPI cruza o limite de alerta, nenhum cruza o crítico.
- **Crítico**: Canonical Coverage <70% **ou** Brand Coverage <50% **ou** Recovery Throughput em 0 por >4 semanas **ou** Review Throughput em 0 por >4 semanas.

---

## 8. Limitações Conhecidas

Apenas limitações reais, já comprovadas — nenhuma ideia futura:

1. **Timeout serverless de 60s** (`maxDuration = 60`) em `/api/cron/connectors/sync` e `/api/cron/canonical-catalog/merge-suggestions` sob backlog real — confirmado ao vivo na Mission Ω-Canonical Rollout (504 em toda chamada com fila não-vazia). O trabalho ainda é commitado corretamente (confirmado por diff de banco) e o reclaim de claims obsoletas se autocorrige, mas a rota não retorna uma resposta HTTP graciosa dentro do próprio orçamento de tempo.
2. **Shopping China (59,6% do volume do marketplace) não pode completar um sync agregado** dentro do limite de 60s — precisa do `HistoricalCanonicalBootstrapService` dedicado; ao final da Mission Ω-Canonical Rollout permanecia em 10,7% de linkagem.
3. **`PendingReviewResolutionService` sem nenhum ponto de execução em produção** — chamado apenas em testes unitários. É o único item desta lista que exige código novo para ser resolvido (`CATALOG_QUALITY_GOVERNANCE.md §5`).
4. **Revisão humana é o único gargalo confirmado em escala** — 0 de 24.836 pending reviews resolvidos, 14 de 4.681 merge candidates revisados (0,3%) desde que os sistemas existem.
5. **`HistoricalCanonicalBootstrapService` não tem retry por item** — item que falha é pulado; reprocessamento exige rodar o mesmo `run_key` novamente.
6. **Duas métricas de observabilidade são aproximações, não contagens literais**: "Suggestions Generated/Skipped" e "Canonical Link Success/Failure Rate" — consequência direta e documentada da restrição de não alterar `suggestMergesFor()`/`CanonicalLinkStage`.
7. **Atomicidade do claim (SELECT + UPDATE condicional) nunca testada contra um banco real sob carga concorrente** — garantia de design e teste unitário, não de medição empírica (este projeto não tem testes de integração contra DB em nenhum domínio).
8. **Cobertura de marca**: 40,7% (59,3% do catálogo em "Outros"). **Cobertura de especificações**: 29,7% bruto, single-digit por campo estruturado-chave.
9. **Maturidade operacional em Nível 1 (Manual)**, com bases de Nível 2 já construídas em código — a lacuna é de prática operacional estabelecida, não de ferramenta.
10. **Plataforma não está pronta para crescer 10x sem primeiro estabelecer throughput operacional real** — veredito explícito e justificado em `CATALOG_OPERATIONS_MANUAL.md §12`: **NÃO**.

---

## 9. Decisões Arquiteturais Permanentes

- **Product Identity permanece determinístico** — nenhuma Mission desta sequência introduziu matching probabilístico ou baseado em IA; thresholds fixos (95/85/70).
- **Shadow Mode obrigatório** — em toda a cadeia de merge, permanentemente.
- **Merge automático proibido** — nenhuma linha de código decide um merge sem aprovação humana registrada.
- **Revisão humana obrigatória** para toda transição de `merge_candidates.status` para um estado terminal positivo.
- **Canonical Catalog como fonte de verdade** para comparação entre lojas — offers fora dele nunca são comparáveis, por design.
- **Outbox como mecanismo oficial de integração** entre `connectors`/`canonical-catalog` e `product-identity` — contrato AT LEAST ONCE DELIVERY congelado desde a Fase 1 da Ω-Canonical Integration.
- **`CanonicalMergeSuggestionService` como a única ponte** `product-identity` → `canonical-catalog`, documentada como via de mão única.
- **`text + CHECK` sobre `ENUM` nativo** como convenção permanente de schema.

---

## 10. Missões Históricas

| Mission | Problema resolvido | Impacto | Status |
|---|---|---|---|
| **Ω-Gatekeeper** | Produtos malformados (marca/categoria "forbidden") entravam livremente no catálogo | Normalização determinística no momento da escrita — Catalog Integrity Firewall | Aplicada em produção |
| **Ω-Rehabilitation** | Backlog histórico de produtos escritos antes do Gatekeeper existir, sem `brand_id`/`category_id` válido | Recovery Engine — 830 decisões de marca / 173 de categoria já tomadas | Aplicada em produção |
| **Ω-Learning** | Correções humanas confirmadas se perdiam, nunca viravam conhecimento reutilizável | Continuous Knowledge Engine — ledger versionado e append-only | Aplicada e validada em produção |
| **Ω-Comparison Audit** | Nenhuma medição forense existia sobre a real capacidade de matching da plataforma | Identificou a lacuna raiz: Sync Pipeline nunca linkava offers ao Canonical Catalog | Auditoria read-only, sem escrita — motivou a Ω-Canonical Integration |
| **Ω-Canonical Integration** (Fases 1–3) | A lacuna medida pela auditoria acima | `CanonicalLinkStage` + Transactional Outbox, contrato AT LEAST ONCE DELIVERY, arquitetura congelada e aprovada em 3 fases | Implementada e testada; deploy adiado até Ω-Canonical Rollout |
| **Ω-Hardening** | Outbox sem retenção/prioridade/expiração/observabilidade não sustenta produção em escala | Retenção, prioridade, expiração, observabilidade centralizada, batch adaptativo, Bootstrap Histórico — 42 novos testes, 875 total, 0 regressões | Implementada e testada; deploy adiado até Ω-Canonical Rollout |
| **Ω-Product Discovery** | Não havia consenso, baseado em evidência, sobre o maior limitador de valor ao usuário | Identificou marca "Outros" (59,3%) e ausência de linkagem canônica como os dois maiores limitadores reais | Análise pura, sem código |
| **Ω-Catalog Quality** | Não existia sistema oficial de KPIs para qualidade de catálogo | 10 KPIs oficiais com fórmula/meta/frequência definidos; achado real: `PendingReviewResolutionService` sem entrypoint | Governança oficial estabelecida, sem código |
| **Ω-Catalog Operations** | Não existia modelo operacional formal (RACI, runbooks, SLIs/SLOs, maturidade) | Modelo operacional completo; Catalog Health = CRÍTICO; Maturidade = Nível 1; veredito 10x = NÃO | Modelo oficial estabelecido, sem código |
| **Ω-Execution Roadmap** | Gargalos e prioridades estavam dispersos entre seis Missions anteriores | Plano mestre de 6-12 meses, priorização por Impacto×Esforço, ondas, caminho crítico | Síntese pura, sem código |
| **Ω-Canonical Rollout** | Arquitetura da Ω-Canonical Integration/Hardening pronta havia semanas, nunca deployada | Migrations aplicadas, deploy em produção, `CRON_SECRET` de produção corrigido (estava vazio, bloqueava todo `/api/cron/*`), sync real executado (Atacado Connect: 98,9% linkado), +97 Merge Candidates reais gerados, self-healing de claim verificado ao vivo, timeout de 60s documentado como achado real | **Concluída — em produção** |

> **Nota**: as Missions Ω-Comparison Audit e Ω-Product Discovery não possuem artefatos primários independentes. Seus resultados foram consolidados e preservados em documentos posteriores (`OMEGA_EXECUTION_ROADMAP.md` e `CATALOG_QUALITY_GOVERNANCE.md`), que passam a ser a referência oficial para essas duas Missions.

---

## 11. Estado Atual da Plataforma

**O que já está pronto?** Toda a arquitetura descrita nas Seções 3–4: Gatekeeper, Recovery Engine, Continuous Knowledge Engine, `CanonicalLinkStage`, Transactional Outbox com prioridade/retenção/expiração/observabilidade, Bootstrap Histórico, Shadow Mode, Merge Executor.

**O que já está em produção?** Todos os itens acima, incluindo o rollout do Canonical Catalog (Mission Ω-Canonical Rollout, 2026-07-25) — confirmado por evidência real: 6 de 7 lojas com Canonical Coverage próxima de 100%, Outbox processando eventos reais, novos Merge Candidates gerados a partir de dados de produção.

**O que ainda depende apenas de operação** (nenhum código novo necessário): Catalog Recovery Engine em volume completo (Brand Coverage); cadência real de revisão da Merge Queue (Merge Approval Rate); Bootstrap Histórico do backlog do Shopping China; auditoria semanal contínua como prática estabelecida.

**O que depende de futuras Missions** (a única com código novo identificada em toda a sequência): construir o consumidor mínimo de `PendingReviewResolutionService` — sem ele, Review Throughput permanece em zero e o Learning Engine nunca recebe dado real, independentemente de qualquer outra melhoria operacional. As demais Missions recomendadas (`OMEGA_EXECUTION_ROADMAP.md §8`, itens 2, 4–6) são operacionais ou dependem de ganho prévio de CPC.

---

## 12. Declaração Oficial da Baseline

A presente Baseline Arquitetural v2.0 passa a ser a referência oficial para todas as futuras evoluções do ParaguAI.

Mudanças estruturais somente poderão ocorrer mediante nova Mission arquitetural formalmente aprovada.

Todas as futuras Missions deverão preservar os princípios, invariantes e componentes congelados definidos neste documento.

---

**Fim do documento. Primeiro Ciclo de Engenharia do ParaguAI oficialmente encerrado.**
