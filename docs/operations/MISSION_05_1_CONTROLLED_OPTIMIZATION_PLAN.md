# MISSION 05.1 — PLANO OPERACIONAL DE OTIMIZAÇÃO CONTROLADA

**Categoria**: `docs/operations/`
**Pré-requisito**: Mission 05 (`fea765f`, branch `mission-05-performance-recovery`)
**Estado**: **PLANO — NADA FOI APLICADO EM PRODUÇÃO.** Todas as medições desta página são **read-only** (`docker logs`, `docker inspect`, `psql` SELECT/`EXPLAIN`).
**Aprovação necessária para**: (A) `CREATE INDEX`, (B) deploy do código da Mission 05, (C) qualquer alteração de pool/infra.

Escopo do incidente e causa raiz: `docs/operations/INCIDENT_2026-09-30_POSTGREST_POOL_EXHAUSTION.md`.

---

## 0. Baseline medido (a ser replicado no passo BEFORE)

| Métrica | Valor medido | Como foi medido |
|---|---|---|
| `price_history` — linhas / tamanho | 72.651 linhas / heap 6.400 kB / total 13 MB / 800 páginas | `pg_class`, `pg_relation_size` |
| `price_history` — tempo de execução acumulado | **501.263 chamadas / 50,54 h** | `pg_stat_statements`, desde `stats_reset = 2026-08-15 21:06:13+00` |
| Shape B (range em `recorded_at`) | 214.597 chamadas / **444,4 ms** de média | `pg_stat_statements` |
| Shape A (histórico por produto) | 133.998 chamadas / 444,6 ms de média — plano isolado = **0,28–4,46 ms** | `pg_stat_statements` + `EXPLAIN (ANALYZE)` |
| Shape B — plano atual | **Seq Scan** de 72.651 linhas, `Rows Removed by Filter: 72.651`, 800 buffers, 72,9 ms (variante `LIMIT 1000`) / 123,3 ms (variante completa: scan 39,0 ms + quicksort 84,1 ms, 3.073 kB em memória) | `EXPLAIN (ANALYZE, BUFFERS)` |
| Linhas dentro das janelas | **0 nos últimos 7 dias**, **8 nos últimos 30 dias** | `count(*) FILTER (...)` |
| Correção / bloat | `n_dead_tup = 0`, 72.651 INSERTs, 0 UPDATE/DELETE, `n_mod_since_analyze = 238`, último autovacuum 2026-08-21 | `pg_stat_user_tables` |
| Correlação física de `recorded_at` | **0,9855** (heap quase ordenado pelo tempo) | `pg_stats.correlation` |
| Índices existentes em `price_history` | 2: `price_history_pkey` (2.688 kB) e `price_history_offer_recorded_idx (offer_id, recorded_at DESC)` (**3.920 kB**) | `pg_indexes` + `pg_relation_size` |
| Índices em `public` (contador para validação) | **235** | `pg_indexes` |
| Conexões | 13 em uso / `max_connections` = 100; nenhuma transação > 0 s; nenhum DDL/autovacuum concorrente em `price_history` | `pg_stat_activity` |
| GUCs relevantes | `maintenance_work_mem` 64 MB · `max_parallel_maintenance_workers` 2 · `shared_buffers` 128 MB · `work_mem` 4 MB · `statement_timeout` **0** · `lock_timeout` **0** | `pg_settings` |
| Owner da tabela / papel da sessão | `price_history` owner = **postgres**; sessão = `postgres` (superuser) no PostgreSQL **17.6** | `pg_class` / `current_user` |
| Nome do índice alvo já existe? | **não** (0) | `pg_class` |

---

## 1. Migration proposta — `price_history_recorded_at_idx`

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS price_history_recorded_at_idx
  ON public.price_history (recorded_at DESC);
```

### 1.1 Tamanho estimado: **≈ 2–3 MB** (faixa conservadora: < 4 MB)

Derivação a partir dos índices **reais** da mesma tabela (não de regra de bolso):

| Índice | Chave | Entradas | Tamanho medido | Bytes/entrada | Overhead/entrada |
|---|---|---|---|---|---|
| `price_history_pkey` | uuid (16 B) | 72.651 | 2.688 kB | 37,0 | 21,0 |
| `price_history_offer_recorded_idx` | uuid + timestamptz (24 B) | 72.651 | 3.920 kB | 55,3 | 31,3 |

Para 1 coluna `timestamptz` (8 B de chave): `8 + 21,0` a `8 + 31,3` = **29,0 a 39,3 B/entrada**
⇒ 72.651 × 29,0 B ≈ **2,11 MB** · 72.651 × 39,3 B ≈ **2,86 MB**.
Representa **~0,3%** do total da relação (13 MB). Deduplicação de btree (PG 13+) não ajuda aqui: `n_distinct = -1` (todos os valores distintos).

### 1.2 Impacto esperado

**Efeito direto (Shape B)** — o acesso passa de varredura completa + sort para **Index Scan**:

- Hoje: 800 buffers, 72.651 linhas lidas e descartadas, sort de 72.651 linhas → **72,9–123,3 ms medidos em cache quente e container ocioso**;
- Depois: `recorded_at >= X AND <= Y ORDER BY recorded_at ASC LIMIT 1000` é um *range scan* que **para após 1000 linhas** e, com janela vazia (caso atual: 0 linhas em 7 dias, 8 em 30 dias), é uma sondagem O(log n) que **não toca o heap**;
- A **correlação de 0,9855** é o multiplicador decisivo: o heap já está fisicamente ordenado por `recorded_at`, então o Index Scan lê quase sequencialmente (sem *random I/O*), e o planner passa a preferir o índice sem ambiguidade de custo.

**Efeito agregado** — `price_history` concentra **50,54 h** de 57,7 h de tempo de execução do banco. A Shape B sozinha responde por ≈ 26,5 h (214.597 × 444 ms). Colapsando para a ordem de milissegundos, o tempo de banco total cai ≈ **45%** — e, principalmente, **desaparece a saturação crônica** que hoje infla a Shape A de 0,6 ms (plano isolado) para 444 ms de média. É essa saturação que fez as requisições `anon` cruzarem o `statement_timeout` de 3 s durante o burst.

**Efeito na capacidade do pool** (por requisição, tempo de retenção de conexão ≈ tempo da query):
`capacidade ≈ pool / tempo_médio` → antes `10 / 0,444 s ≈ 22 consultas/s` · depois `10 / ~0,002 s ≈ 5.000 consultas/s`.

### 1.3 Lock behavior

| Aspecto | Comportamento |
|---|---|
| Lock tomado | **`SHARE UPDATE EXCLUSIVE`** em `public.price_history` |
| Bloqueia SELECT/INSERT/UPDATE/DELETE? | **Não.** Leitura e escrita continuam normalmente |
| Bloqueia? | outro **DDL** na mesma tabela e **`VACUUM`/`ANALYZE`** (inclui autovacuum) na mesma tabela |
| Transação | **não pode** rodar dentro de bloco de transação (`BEGIN`/`psql -1`). Enviar como statement único |
| Interrupção | se for **morto no meio**, deixa um índice **`INVALID`** (ignorado pelo planner, mas ainda mantido em cada escrita). Limpeza obrigatória: `DROP INDEX CONCURRENTLY` |
| Fases | 2 varreduras do heap + build + espera por transações concorrentes que possam ver o snapshot |
| Situação atual | 0 transações longas (`max_tx_age = 0s`), 0 `idle in transaction`, nenhum DDL/autovacuum concorrente, 0 tuplas mortas ⇒ **sem concorrência de bloqueio esperada** |
| Alternativa | `CREATE INDEX` (não-concurrente) tomaria `SHARE` (bloqueia escrita, não leitura), faria o mesmo trabalho em tempo parecido — **descartada**: não há motivo para bloquear escrita |

### 1.4 Tempo esperado: **1–5 s** (limite prático: poucas dezenas de segundos)

Componentes **medidos**, não estimados:

| Componente | Medido |
|---|---|
| Varredura completa do heap | 39,0 ms (800 buffers) |
| Ordenação das 72.651 chaves | 84,1 ms (quicksort, 3.073 kB em memória) |
| Leitura + sort (proxy do build) | **123,3 ms** |
| Memória necessária | 3 MB com `maintenance_work_mem` = 64 MB ⇒ sort **em memória** (sem spill) |

O build concorrente soma: 2ª varredura do heap + escrita de ~2–3 MB + fase de espera por transações. Com o container ocioso e a tabela inteira em cache, **1–5 s**. Acima disso só se: (a) a tabela crescer (a coleta de preço está parada hoje), (b) o disco/CPU estiver ocupado por crawl, ou (c) houver transação longa para esperar.

### 1.5 Rollback

```sql
DROP INDEX CONCURRENTLY IF EXISTS public.price_history_recorded_at_idx;
```
Mesmo lock (`SHARE UPDATE EXCLUSIVE`), também não bloqueia escrita; devolve os ~2–3 MB. **Sem perda de dado** — o índice não é fonte de verdade.
**Verificação prévia obrigatória** (detectar sobra `INVALID` de uma tentativa anterior):
```sql
SELECT indexrelid::regclass AS idx, indisvalid, indisready
FROM pg_index WHERE indrelid = 'public.price_history'::regclass;
```

### 1.6 Como aplicar (quando aprovado)

Rodar **fora** do PostgREST (via `psql` no container), como `postgres`, com arquivo (não `-c` inline, para não arriscar bloco de transação implícito):

```bash
# no VPS
cat > /tmp/ph_idx.sql <<'SQL'
CREATE INDEX CONCURRENTLY IF NOT EXISTS price_history_recorded_at_idx
  ON public.price_history (recorded_at DESC);
SQL
sudo -n docker cp /tmp/ph_idx.sql supabase-db:/tmp/ph_idx.sql
sudo -n docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/ph_idx.sql
sudo -n docker exec supabase-db psql -U postgres -c "ANALYZE public.price_history;"
```
Notas de segurança: `statement_timeout` da sessão `postgres` é **0** (o build não é morto); `lock_timeout` = 0. **Não** disparar por RPC/PostgREST — `anon` tem 3 s e `authenticated` 8 s e matariam o build, deixando um índice `INVALID`.

---

## 2. `PGRST_DB_POOL=20` — **análise apenas, não aplicar**

### 2.1 Benefício esperado

- Pool atual: `PGRST_DB_POOL` **não definido** ⇒ default **10**; `PGRST_DB_POOL_ACQUISITION_TIMEOUT` default 10 s (é a origem do `PGRST003` → HTTP 504).
- Dobrar para 20 dobra o teto de contenção **apenas enquanto as queries forem lentas**: com as 444 ms atuais, `10/0,444 ≈ 22` → `20/0,444 ≈ 45` consultas/s. Isso **atrasa** a saturação, não a remove.
- O pico do incidente foi 1.631 req/min (27 req/s) com páginas de ~5 queries ⇒ ~135 consultas/s de demanda. Ou seja: 20 conexões **ainda seriam insuficientes** com queries de 444 ms, e **sobrariam** com queries de ms.

### 2.2 Risco

| Risco | Detalhe |
|---|---|
| Memória no PostgreSQL | cada backend ~5–10 MB; `work_mem` = 4 MB por sort em paralelo. Pior caso com +10 sorts simultâneos: **+40 MB** dentro do limite de 3 GB do container (host sem swap) |
| CPU | host de 2 vCPU; mais conexões simultâneas ⇒ mais `parallel worker` competindo (`max_parallel_workers_per_gather` = 2) |
| Muda o modo de falha | com pool grande e query lenta, o sistema deixa de falhar rápido (504 em 10 s, visível) e passa a **ficar lento para todos** (invisível, mais difícil de detectar) |
| Mascara a causa | trataria o sintoma (`PGRST003`) sem tocar na causa (custo da query) — exatamente o que a Mission 05 provou |
| Limite superior | `max_connections` = 100; 20 é seguro do ponto de vista de conexões (pico PG observado: 20), mas não há isolamento entre público e operacional |

### 2.3 Necessidade **após** o índice: **não é necessário**

Com a Shape B na ordem de milissegundos, a capacidade do pool passa a ~5.000 consultas/s: o pico de 135 consultas/s usa **~3%** do pool. Recomendação: **não alterar agora**. Só revisitar se `PGRST003` voltar a ocorrer *depois* do índice — e, nesse cenário, a correção estruturalmente correta é **isolar** o tráfego operacional do público (instância/rota PostgREST dedicada, ou pool por papel), não apenas aumentar um pool compartilhado.

---

## 3. Validação da correção de código da Mission 05

Pergunta: as correções reduzem **round trips**, **chamadas ao PostgREST** e **tempo de retenção de conexão**?

### 3.1 Fix 1 — dedupe de alertas (`MarketplaceAlertService.sync`) — **reduz os três**

| Métrica | Antes | Depois | Evidência |
|---|---|---|---|
| Chamadas ao PostgREST por varredura | **402** | **1** | antes: medido no incidente (Kong access log, 07:54, `subject_id` distintos); depois: teste de regressão (`listOpenCalls.length === 1` para 200 candidatos) |
| Round trips sequenciais | **402** | **1** | mesma origem; −99,75% |
| Trabalho no banco | 402 × **0,469 ms** ≈ **188 ms** | **1,71 ms** | `EXPLAIN (ANALYZE)`: lookup pontual pelo índice `idx_marketplace_alerts_open_key` = 0,469 ms; leitura em lote = 1,71 ms (Seq Scan de 626 linhas / 504 kB) |
| Retenção de conexão | a varredura **segurava uma conexão do pool durante todo o seu tempo** (eram round trips **sequenciais**, não paralelos): ~402 × (query + latência do hop) | 1 × (query + hop) | a tabela tem 626 linhas; o custo era a **serialização**, não o volume de dados |

Escala do N+1 (para o teto): `lowCoverageRule` emite 1 candidato por gap; hoje há **971 marcas + 1.184 categorias = 2.155 sujeitos possíveis**. O custo crescia com o **catálogo**, não com um limite — por isso 402 hoje poderia ser ~2.000 amanhã. O `create` (1 por alerta **novo**) não mudou; hoje cria 0, porque os 626 alertas existentes seguem abertos.

### 3.2 Fix 2 — `/product/[slug]` (`getCachedPriceIntelligence` + `Promise.all`) — **reduz latência, NÃO reduz volume**

| Métrica | Antes | Depois | Leitura honesta |
|---|---|---|---|
| Chamadas ao PostgREST por render | 1 (`price_history`) | **1** | **inalterado** — a query continua acontecendo 1× por render |
| Round trips no caminho crítico | `price_history` **serial** + lote de 3 | os 4 em paralelo | −1 espera sequencial: o render deixa de pagar a duração da query isolada (0,28–4,46 ms com plano quente; **444 ms** de média sob saturação; até **3 s** quando ela bate no `statement_timeout` do `anon`) |
| Deduplicação intra-render | nenhuma | `cache()` | proteção contra leitura duplicada no mesmo render — hoje essa página não duplica, então é defesa estrutural, não ganho medido |
| Retenção de conexão | 1 conexão pela duração da query | **igual** | não muda por render |

**Conclusão sem maquiagem**: o Fix 1 **corta chamadas e round trips** (402 → 1). O Fix 2 **não corta volume de chamadas** — corta a espera serial do render e o risco de estourar o timeout de 3 s. A redução do **custo por chamada** vem do item 1 (o índice). É exatamente por isso que o índice é a alavanca principal e o deploy do código é a segunda etapa, não a primeira.

---

## 4. Plano de execução — BEFORE / CHANGE / VALIDATION / ROLLBACK

> Executar em janela de baixo tráfego (o pico diário medido é ~07:53 UTC, por causa do drift do cron diário da Vercel — ver Mission 05 §3.1). **Ordem recomendada: (A) índice primeiro, (B) deploy do código depois.**

### BEFORE — coletar e arquivar (5 min, read-only)

```bash
K=~/.ssh/paraguai-prod-01-v2; H=ubuntu@94.103.168.244
P() { ssh -i $K $H "sudo -n docker exec supabase-db psql -U postgres -X -q -P pager=off -c \"$1\""; }

P "SELECT now(), (SELECT count(*) FROM pg_indexes WHERE schemaname='public') AS public_indexes;"
P "SELECT count(*) AS rows, pg_size_pretty(pg_total_relation_size('public.price_history')) AS size FROM price_history;"
P "SELECT count(*) FILTER (WHERE recorded_at >= now()-interval '30 days') AS last30d FROM price_history;"
P "SELECT sum(calls), round(sum(total_exec_time)::numeric/1000/3600,2) AS hours FROM pg_stat_statements WHERE query ILIKE '%price_history%';"
P "SELECT stats_reset FROM pg_stat_statements_info;"
P "SELECT indexrelid::regclass, indisvalid FROM pg_index WHERE indrelid='public.price_history'::regclass;"
P "SELECT count(*) AS pgrst003_or_timeout FROM pg_stat_statements WHERE query ILIKE '%marketplace_alerts%';"
# contadores de erro na fonte (janela atual, para comparação depois)
ssh -i $K $H 'sudo -n docker logs --since 24h supabase-rest 2>&1 | grep -c "PGRST003"; sudo -n docker logs --since 24h supabase-rest 2>&1 | grep -c "57014"'
ssh -i $K $H 'sudo -n docker logs --since 24h supabase-kong 2>&1 | grep -cE " (500|502|503|504) "'
```
**Arquivar a saída** — é o "antes" contra o qual o "depois" será comparado. Baseline de referência já conhecido: `public_indexes = 235`, `price_history` = 72.651 linhas / 13 MB, 501.263 chamadas / 50,54 h, Shape B = 444,4 ms de média.

### CHANGE — uma única mudança por vez (≈ 1–5 s de trabalho)

```bash
# 1) confirma que nada concorrente toca a tabela
P "SELECT count(*) FROM pg_stat_activity WHERE query ILIKE '%price_history%' AND pid <> pg_backend_pid();"
# 2) cria o índice (arquivo, fora de transação, fora do PostgREST)
printf '%s\n' "CREATE INDEX CONCURRENTLY IF NOT EXISTS price_history_recorded_at_idx ON public.price_history (recorded_at DESC);" > /tmp/ph_idx.sql
scp -i $K /tmp/ph_idx.sql $H:/tmp/ph_idx.sql
ssh -i $K $H 'sudo -n docker cp /tmp/ph_idx.sql supabase-db:/tmp/ph_idx.sql && time sudo -n docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/ph_idx.sql'
# 3) estatísticas para o planner
ssh -i $K $H 'sudo -n docker exec supabase-db psql -U postgres -c "ANALYZE public.price_history;"'
```
**Não** alterar `PGRST_DB_POOL` no mesmo passo (uma variável por vez — ver §2).

### VALIDATION — o que precisa ser verdade

| # | Checagem | Critério de sucesso |
|---|---|---|
| V1 | `pg_index` | `indisvalid = true` e `indisready = true` para `price_history_recorded_at_idx` |
| V2 | Tamanho | `pg_relation_size('price_history_recorded_at_idx')` **≤ 4 MB** (esperado 2–3 MB) |
| V3 | Contadores | `public_indexes` = **236** (era 235) |
| V4 | Plano (a prova direta) | `EXPLAIN (ANALYZE, BUFFERS)` da Shape B mostra **Index Scan/Index Only Scan** em `price_history_recorded_at_idx`, **sem** `Seq Scan`, e **sem** `Sort` sobre 72.651 linhas |
| V5 | Latência | 3 execuções da Shape B: **< 5 ms** (baseline 72,9–123,3 ms), janela de 7 dias |
| V6 | Shape A impactada | 3 execuções da Shape A (por produto): **< 5 ms** (baseline 0,28–4,46 ms com plano quente, mas 444 ms de média sob saturação — o número que importa é a média no `pg_stat_statements` após 24 h) |
| V7 | 24 h depois | `pg_stat_statements`: média da Shape B em ms de um dígito; tempo total de `price_history` caindo de 50,54 h → projeção ≈ 26–30 h acumuladas **sem** novos picos |
| V8 | 7 dias depois (sem mutação) | `docker logs supabase-rest \| grep -c PGRST003` = **0** em novas janelas e `grep -c 57014` sem bursts; Kong 5xx sem picos (baseline do incidente: 47/9/141) |
| V9 | Código (após deploy do branch) | durante um ciclo do cron `marketplace-operations/snapshot`, o access log do Kong mostra **1** requisição a `marketplace_alerts` (era 402): `grep -c 'marketplace_alerts' <janela>` — e `EXPLAIN` confirma 1 leitura em lote |
| V10 | Regressão funcional | `/product/[slug]` renderiza idêntico (o card de Price Intelligence inalterado); `/` e `/categorias` intocados; suíte de testes verde no deploy |

### ROLLBACK — quando e como

| Gatilho | Ação |
|---|---|
| Índice `INVALID` (build interrompido) | `DROP INDEX CONCURRENTLY IF EXISTS public.price_history_recorded_at_idx;` e reexecutar a 1ª fase em janela mais calma |
| V4 falha (planner continua com Seq Scan) | **Não** é motivo de drop imediato: rodar `ANALYZE` e reconferir; se persistir, manter o índice é inofensivo (2–3 MB) e investigar estatísticas antes de decidir |
| Regressão de latência de escrita (INSERTs ficando mais lentos) | `DROP INDEX CONCURRENTLY` — reversível em segundos, sem perda de dado |
| Incidente piora durante o build | **não matar o build** (`pg_cancel_backend`/`pg_terminate_backend` deixam índice `INVALID`): aguardar a conclusão e então dropar se necessário |
| Rollback do código (Fix 1/Fix 2) | `git revert fea765f` no branch + redeploy; nenhuma implicação de dado |

---

## 5. Aprovação — checklist para o owner

1. **Aprovar (A) o índice?** É a mudança de maior impacto e menor risco: +2–3 MB, sem bloqueio de escrita, 1–5 s de trabalho, rollback de 1 comando.
2. **Aprovar (B) o deploy do branch `mission-05-performance-recovery`?** Independente do banco; efeito imediato = 402 → 1 chamada por varredura de alertas.
3. **`PGRST_DB_POOL`**: recomendação é **não aplicar**. Se ainda assim quiser aplicar, faça **depois** de medir (A) por 7 dias.
4. **Não incluído neste plano** (por não ser otimização, e sim segurança/operação): remoção do container órfão `dreamy_hodgkin`, rotação do log do Kong (2,9 GB sem `max-size`), investigação da tabela `exchange_rates` vazia, regra de resolução automática dos 626 alertas abertos.

**Nenhuma dessas ações foi executada. Mission 05.1 é plano, não aplicação.**
