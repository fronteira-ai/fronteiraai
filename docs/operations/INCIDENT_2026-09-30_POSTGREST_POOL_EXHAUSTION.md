# INCIDENT 2026-09-30 — PostgREST pool exhaustion / Kong upstream errors

**Data do incidente**: 2026-09-30, 07:53:10–07:54:14 UTC (janela de ~64 s)
**Categoria**: `docs/operations/`
**Missão**: Mission 05 — Autonomous Performance Recovery (continuação da Mission 04)
**Branch**: `mission-05-performance-recovery`
**Produção durante a investigação**: somente leitura (nenhuma migration, nenhum restart, nenhuma alteração de pool/timeout/secret/config)
**Status**: causa raiz identificada com evidência; correções de código aplicadas; mudanças de banco/infra **preparadas, não aplicadas** (exigem aprovação)

---

## 1. Resumo

Entre 07:53:10 e 07:54:14 UTC, dois fluxos independentes coincidiram sobre a mesma
infraestrutura de dados:

1. **Um cron diário** (`marketplace-operations/snapshot`) disparou às 07:53:54 e executou
   ~400 leituras **sequenciais** em `marketplace_alerts` (N+1 de deduplicação — 1 query por
   candidato de alerta).
2. **Um crawl anônimo** de ~440 páginas de produto distintas (07:51–07:55), cada render
   disparando 5–8 leituras de SSR (`price_history`, `products`, `offers`,
   `canonical_products`, `marketplace_memory_facts`, `market_changes`, `exchange_rates`).

Ambos consomem o **mesmo pool fixo do PostgREST** (não configurado ⇒ default de **10**
conexões) contra um PostgreSQL onde a tabela `price_history` é, de longe, o maior
consumidor de tempo de banco (**50,5 h acumuladas**, contra 7,2 h de **todas** as outras
tabelas somadas).

Resultado medido: 47 × `57014` (statement timeout do papel `anon`, 3 s), 9 × `PGRST003`
(timeout de aquisição de conexão no pool ⇒ HTTP 504), 141 respostas 5xx no Kong,
29 erros de upstream no Kong, Kong em ~444/512 MiB.

---

## 2. Evidência (tudo medido, read-only)

| # | Fato | Fonte |
|---|---|---|
| E1 | Erros do PostgREST concentrados em **07:53:10–07:54:14** (52 no minuto 07:53, 4 em 07:54) | `docker logs supabase-rest` |
| E2 | 47 × `57014` + 9 × `PGRST003` na janela; 29/Sep 14:12:54–14:13:35 tem o **mesmo assinatura** (6+50 erros) | `docker logs supabase-rest` |
| E3 | Volume no Kong: 07:51 = 281 req/min · 07:52 = 423 · **07:53 = 1631** · 07:54 = 1161 · 07:55 = 330 (baseline 24–160) | access log do Kong (`supabase-kong`) |
| E4 | **441 slugs / 421 ids de produto distintos** em 11 min — e não era um id repetido | access log do Kong |
| E5 | 402 requisições a `marketplace_alerts` **em um único ciclo de cron** (07:54), com `subject_id` distintos, tipo `low_coverage`/`store_not_syncing` | access log do Kong |
| E6 | Todas as requisições do lado da aplicação chegam com `User-Agent: node` e IP de cliente `172.18.0.1` (= Caddy). UA/identidade do cliente original **não é visível** nessa camada: o app está na Vercel e o Vercel não proxiu UA/`X-Forwarded-For` para o Kong | access log do Kong |
| E7 | `PGRST_DB_POOL` **não está definido** no serviço `rest` ⇒ pool default = 10 conexões; `PGRST_DB_URI` usa o papel `authenticator` | `docker inspect supabase-rest` + `docker-compose.yml` do stack |
| E8 | `anon` tem `statement_timeout = 3s`; `authenticated` 8 s; `service_role` **sem** timeout | `pg_roles.rolconfig` |
| E9 | `price_history`: **501.173 chamadas / 50,5 h** de tempo de execução; todas as outras tabelas somadas: 7,2 h. `products` 2,4 h, `offers` 1,2 h, `market_changes` 0,1 h | `pg_stat_statements` (reset em 2026-08-15) |
| E10 | Duas formas dominantes: `price_history` por range de `recorded_at` (214.597 chamadas, **444,4 ms de média**) e por produto via `offers.product_id` (133.998 chamadas, 444,6 ms de média) | `pg_stat_statements` |
| E11 | A forma por range **não tem índice de apoio**: único índice é `(offer_id, recorded_at DESC)` ⇒ **Seq Scan de 72.651 linhas, 72.651 linhas removidas pelo filtro, 800 buffers**, para uma janela de 7 dias que contém **0 linhas** | `EXPLAIN (ANALYZE, BUFFERS)` em produção |
| E12 | A forma por produto, isolada e com cache quente, executa em **0,6 ms** (Index Scan) — ou seja, o plano dela **não** é o problema; a média de 444 ms vem da saturação de CPU/IO causada por E9–E11 | `EXPLAIN (ANALYZE, BUFFERS)` em produção |
| E13 | `price_history` tem 72.651 linhas mas apenas **8 nos últimos 30 dias** e **0 nos últimos 7 dias** (coleta de preço parada) — o range scan caro varre a tabela inteira para devolver nada | `SELECT count(*) FILTER (...)` |
| E14 | `/product/[slug]` era o **único** leitor de `price_history` que não passava pelo `_cache.ts` do próprio diretório — chamava `getProductPriceIntelligence()` direto **antes** do `Promise.all`, serializando o render | `app/product/[slug]/page.tsx` (antes da correção) |
| E15 | O dedupe de alertas fazia **1 leitura por candidato** (`findOpenByKey`), e `lowCoverageRule` emite 1 candidato **por gap de cobertura**; há 971 marcas e 1.184 categorias ⇒ teto de milhares de candidatos por varredura | `MarketplaceAlertService.sync` + `AlertRules.ts` (antes da correção) |
| E16 | `marketplace_alerts`: 626 alertas, **todos abertos**, apenas 2 tipos — a varredura diária gasta ~400 leituras para concluir "nada a criar" | `SELECT count(*) ...` em produção |
| E17 | Kong: único container perto do teto de memória (limite 512 M do override) e o log sem rotação já tem **2,9 GB** em disco (`json-file`, sem `max-size`) | `docker inspect supabase-kong` |
| E18 | Existe um container órfão `dreamy_hodgkin` (`postgres:17.6`, criado 2026-08-26, sem `--name`, porta **não** publicada no host) ainda rodando | `docker ps -a` / `docker inspect` |

---

## 3. Gatilho — os dois disparos, identificados

### 3.1 O cron diário "sem gatilho identificado" era o `vercel.json`, com drift da Vercel

`vercel.json` declara `{ "path": "/api/cron/marketplace-operations/snapshot", "schedule": "0 7 * * *" }`.
O horário observado (07:53–07:54) parecia não bater — até se olhar o padrão histórico real:

| Evidência | Valor | Leitura |
|---|---|---|
| `connector_sync_runs.started_at` (últimos 10 dias) | `06:53:41` **todos os dias** | é o cron `0 6 * * *` do `vercel.json`, com **+53 min de drift** consistente |
| `marketplace_alerts.created_at` | 07:13 e 07:59 em dias distintos (23/Aug, 26/Aug, 30/Aug, 01/Set, 08/Set) | é o cron `0 7 * * *`, com drift de 13–59 min |

Ou seja: **o gatilho das 07:53–07:54 é o próprio `0 7 * * *` do `vercel.json`**, entregue com
o atraso característico do plano Hobby (que não garante horário exato). Não há scheduler
externo desconhecido. O padrão `06:53:41` repetido ao segundo é a prova: nenhuma outra
origem produziria esse alinhamento diário.

### 3.2 O crawl anônimo

441 slugs distintos em ~4 min, todos anônimos, todos renderizando `/product/[slug]`
(E4 + a forma das queries em E14). O **sitemap de produtos** (`app/product/sitemap.ts`,
chunks `0.xml/1.xml/2.xml`) é o caminho de descoberta pública dessas URLs — o crawl é o
comportamento esperado de um buscador sobre ~52 mil produtos.

**Identidade do cliente: não atribuída.** O PostgREST/Kong só veem o Caddy
(`172.18.0.1`) e o UA `node` do SSR da Vercel (E6). Os logs de runtime da Vercel não
estavam acessíveis nesta sessão (não há token). O que está provado é a **forma** do
tráfego (crawl anônimo de centenas de páginas de produto), não quem o originou.

---

## 4. Causa raiz (em ordem de contribuição)

**C1 — `price_history` sem índice em `recorded_at` (dominante).**
Toda leitura por janela de `recorded_at` (a base do "reaction lag"/analytics de câmbio e do
histórico de volatilidade) faz **Seq Scan das 72.651 linhas + sort**, mesmo quando a janela
contém 0–8 linhas (E11, E13). Média medida: **444 ms por chamada, 214.597 chamadas** (E10).
Isso mantém o banco cronicamente ocupado — e é o que explica por que consultas cujo plano
isolado custa 0,6 ms (E12) apareçam com média de 444 ms.

**C2 — Pool do PostgREST fixo em 10, compartilhado entre tráfego público e operacional.**
`PGRST_DB_POOL` não configurado (E7). Não existe isolamento: um pico de crawl anônimo
esgota as mesmas 10 conexões que o cron usa. Com 3 s de timeout no `anon` (E8), cada
requisição segura uma conexão até o timeout, e a fila estoura em `PGRST003` → **HTTP 504**
para requisições sem relação nenhuma com o crawl (E5: `merchant_stores`, `canonical_products`,
`exchange_rates`, `stores`, `offers`, `marketplace_memory_facts`).

**C3 — N+1 na varredura de alertas (contribuição auto-infligida).**
~400 leituras sequenciais em um único ciclo (E5, E15, E16) exatamente dentro da janela do
incidente.

**C4 — `/product/[slug]` fazia a leitura mais cara do site sem cache e fora do batch** (E14),
multiplicando C1 por cada página crawleada.

**C5 — Restrições de recursos** (E17): Kong no teto de 512 M, sem rotação de log (2,9 GB).

---

## 5. Correções aplicadas nesta missão (código, baixo risco)

### Fix 1 — dedupe de alertas deixa de ser N+1 (`C3`)

- `src/domains/marketplace-operations/repositories/IMarketplaceAlertRepository.ts`:
  `findOpenByKey(type, subjectType, subjectId)` → **`listOpen(alertTypes[])`** (uma leitura).
- `.../infrastructure/SupabaseMarketplaceAlertRepository.ts`: implementação com um único
  `select * ... .in("alert_type", types) .in("status", [pending, acknowledged])`.
- `.../services/MarketplaceAlertService.ts`: monta um `Set` de chaves
  (`type|subjectType|subjectId`, null-safe — a mesma identidade que a query antiga usava) e
  decide em memória. Também protege contra candidatos idênticos repetidos na mesma varredura.
- Efeito: **~400 leituras/dia → 1 leitura/dia** nessa rota (E5/E16).

### Fix 2 — `/product/[slug]`: leitura de histórico de preço cacheada e paralela (`C4`)

- `app/product/[slug]/_cache.ts`: novo `getCachedPriceIntelligence = cache(getProductPriceIntelligence)`
  — a única leitura da página que não passava por esse módulo.
- `app/product/[slug]/page.tsx`: a leitura entra no `Promise.all` existente em vez de um
  `await` isolado antes dele. **Mesmos 4 valores, mesma árvore renderizada** (a Home e
  `/categorias` não foram tocadas; o congelamento de UI de ADR-050 não é afetado).

### Testes de regressão

`src/domains/marketplace-operations/__tests__/MarketplaceAlertService.test.ts` — 4 casos novos:
varredura de 200 candidatos ⇒ **1** leitura (`listOpenCalls` length 1); varredura mista ⇒ 1
leitura para todos os tipos; candidato idêntico repetido ⇒ não duplica; varredura vazia ⇒
nenhuma leitura nem escrita.

---

## 6. Mudanças de banco/infra — PREPARADAS, NÃO APLICADAS

> **ATUALIZAÇÃO (2026-09-30 20:49 UTC)**: o item **6.1 (índice)** foi **APLICADO E VALIDADO** com autorização do owner — ver `docs/operations/MISSION_05_2_EXECUTION_REPORT.md` (medido: Shape B de 88–139 ms para 0,26–0,93 ms; 800 → 2 buffers). O item **6.2 (`PGRST_DB_POOL`)** **continua NÃO aplicado** — recomendação mantida. O item 6.3 (rotação de log do Kong) segue pendente de aprovação.

> Todas exigem aprovação explícita. Nada aqui foi executado. **Não** foram colocadas em
> `supabase/migrations/` de propósito: o histórico remoto está dessincronizado (ver
> `database/migrations/README.md`) e um `supabase db push` futuro varreria o arquivo junto
> com migrações de outras Sprints. O SQL vive aqui, para aplicação deliberada e revisada.

### 6.1 ÍNDICE em `price_history(recorded_at)` — **C1, o de maior impacto**

```sql
-- Aplicar FORA de transação (CONCURRENTLY). Verificar com:
--   SELECT indexname FROM pg_indexes WHERE tablename = 'price_history';
-- Evidência: Seq Scan de 72.651 linhas para janelas com 0–8 linhas; 214.597 chamadas a
-- 444 ms de média (Mission 05, E10/E11/E13).
CREATE INDEX CONCURRENTLY IF NOT EXISTS price_history_recorded_at_idx
  ON public.price_history (recorded_at DESC);

ANALYZE public.price_history;
```

**Ganho esperado**: a leitura por janela passa de Seq Scan + sort (800 buffers, 72.651 linhas
removidas pelo filtro) para Index Scan/Index Only Scan com parada antecipada — para janelas
com poucas linhas, de ~444 ms para ordem de grandeza de milissegundos. **Não medido ainda**:
o Docker local não estava disponível nesta sessão para reproduzir a tabela fora de produção,
então o "depois" é deduzido do plano (E11 vs. E12) e **precisa ser medido após a aplicação**
(eu não aplico DDL em produção sem aprovação).

**Rollback** (reversível, sem perda de dado):
```sql
DROP INDEX CONCURRENTLY IF EXISTS public.price_history_recorded_at_idx;
```
Custo: ~2 MB de índice e uma escrita a mais por INSERT em `price_history` (volume atual: a
coleta está parada). Risco do `CONCURRENTLY`: não bloqueia escrita, mas não pode rodar dentro
de transação e pode deixar um índice `INVALID` se falhar — conferir `pg_index.indisvalid`
depois.

### 6.2 Pool do PostgREST — **C2**

```yaml
# infra/selfhosted/docker-compose.override.yml, serviço `rest`
environment:
  PGRST_DB_POOL: "20"            # default atual: 10 (não configurado)
  PGRST_DB_POOL_ACQUISITION_TIMEOUT: "10"
```
Requer **restart do container `rest`** (indisponibilidade de segundos) ⇒ não feito.
Limite superior: `max_connections = 100`; hoje o pico observado foi 20 conexões PG.
Isto **não** corrige C1 — apenas dá folga; se C1 permanecer, o efeito é empurrar a saturação
para frente.

### 6.3 Rotação de log do Kong — **C5/E17**

2,9 GB em um único arquivo `json-file` sem `max-size`, em host sem swap. Correção:
`--log-opt max-size=50m --log-opt max-file=5` no serviço `kong` do override (exige recriação
do container ⇒ não feito).

### 6.4 Follow-up de produto recomendado (com trade-off explícito)

Cache entre requisições (ISR/`unstable_cache`) para `price_history` por produto e para o
câmbio corrente (hoje 1 leitura por render; E3/E4 multiplicam isso por página crawleada).
**Não implementado de propósito**: muda a semântica de frescor de preço/câmbio exibida ao
consumidor — é uma decisão de produto, não um bugfix. Alternativa sem mudar frescor: limitar
concorrência/timeout no cliente Supabase para falhar rápido em vez de esperar 60 s.

---

## 7. Verificação

| Gate | Resultado |
|---|---|
| `npm run lint` | **0 erros** (1 warning pré-existente em `scripts/comparison-forensics-audit.ts:19`, não relacionado) |
| `npm run typecheck` | PASS (`tsc --noEmit` limpo) |
| `npm test` | **185/185 suítes, 1382/1382 testes** PASS |
| `npm run build` | PASS (Next.js 16.2.9) |
| Testes de regressão novos | 4 casos, incluindo o que reproduz o N+1 (200 candidatos ⇒ 1 leitura) |
| Produção | **nenhuma mutação** — apenas leitura (`docker logs`, `docker inspect`, `psql` SELECT/EXPLAIN) |

Antes/depois medidos: **antes** = 402 leituras em `marketplace_alerts` por ciclo de cron, 444 ms
de média por leitura de `price_history`, 72.651 linhas varridas por janela. **Depois** =
1 leitura por varredura (verificado em teste); o "depois" de C1/C2/C5 depende de aprovação e
**ainda não foi medido** — declarado aqui em vez de estimado como se fosse medido.

---

## 8. Perguntas abertas / follow-ups

1. `exchange_rates` está **vazia** (0 linhas, 0 nos últimos 30 dias) e mesmo assim há 391
   requisições no período do incidente. O cron `*/5` roda (`exchange_rates` recebe leituras),
   mas não há dado persistido — vale investigar se o refresh está falhando/degradando para
   fallback silenciosamente (fora do escopo desta missão, não investigado).
2. Container órfão `dreamy_hodgkin` (postgres:17.6, 2026-08-26) rodando há 5 semanas, com
   volume próprio. Não publica porta no host (verificado: `ss -ltnp` só mostra o
   `docker-proxy` do `supabase-db` em 127.0.0.1:5432), logo **não** é exposição de rede — mas
   é recurso desperdiçado e ambiguidade operacional. Remoção exige aprovação.
3. Alerta de cron: 626 alertas **todos abertos** e nenhum novo desde 08/Set — a varredura
   diária não fecha nada e o board só cresce. Falta uma regra de resolução automática.
4. Identidade do crawl (E6): para atribuir a origem, é preciso log de runtime da Vercel
   (não acessível nesta sessão).
