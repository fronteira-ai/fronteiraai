# MISSION 05.2 — RELATÓRIO DE EXECUÇÃO EM PRODUÇÃO

**Categoria**: `docs/operations/`
**Executado em**: 2026-09-30 (baseline 20:47:53 UTC · CHANGE 20:49:* UTC · deploy Ready 20:56 UTC · validação até 21:0x UTC)
**Autorizações**: (A) deploy do branch `mission-05-performance-recovery` — **aprovado pelo owner** (merge em `main`); (B) aplicação do índice `price_history_recorded_at_idx` — **aprovada pelo owner**.
**Escopo da execução**: **somente** `CREATE INDEX CONCURRENTLY` + merge/deploy. `PGRST_DB_POOL` **não** alterado, timeouts **não** alterados, containers **não** reiniciados.
**Resultado**: mudança aplicada e validada. **Zero erros novos.** Nenhum rollback necessário.

---

## BEFORE — baseline capturado (2026-09-30 20:47:53 UTC)

Comandos em `MISSION_05_1_CONTROLLED_OPTIMIZATION_PLAN.md` §4 (BEFORE). Saída:

| Métrica | Valor |
|---|---|
| `public_indexes` | **235** |
| Índices em `price_history` | `price_history_pkey` (`indisvalid = t`), `price_history_offer_recorded_idx` (`t`) |
| **Shape B (janela 7 dias) — plano** | **`Seq Scan on price_history`**, 800 buffers, `Rows Removed by Filter: 72.651`, `Sort Method: quicksort` |
| **Shape B (7 dias) — tempo, 3 execuções** | **88,352 ms · 139,092 ms · 74,326 ms** |
| Shape B (janela 30 dias) | `Seq Scan`, 8 linhas, 72.643 removidas · **170,630 ms** |
| Shape A (histórico por produto), 3 execuções | 0,725 ms · 3,139 ms · 0,635 ms |
| `pg_stat_statements` (price_history) | 45 statements · **501.283 chamadas · 50,55 h** |
| Shape B acumulada | 214.638 chamadas · **444,5 ms de média** |
| `stats_reset` | 2026-08-15 21:06:13+00 |
| PGRST003 total (vida do container) | **23** |
| 57014 total (vida do container) | **124** |
| PGRST003 / 57014 nas últimas 24 h | **9 / 47** (exatamente o incidente de 07:53–07:54) |
| Transações longas / DDL concorrente | 0 / 0 |
| Nome do índice alvo já em uso | 0 |

---

## CHANGE — o que foi executado (20:49 UTC)

### 1. Índice (única mudança de banco)

Statement único — **exatamente** o aprovado, nada mais:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS price_history_recorded_at_idx
  ON public.price_history (recorded_at DESC);
```

Método: arquivo único enviado por `docker cp` e executado por `psql -f` como `postgres` (**fora** de bloco de transação, **fora** do PostgREST — `anon`/`authenticated` têm timeout de 3 s/8 s e teriam matado o build).

```
$ sudo -n docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/ph_idx.sql
CREATE INDEX
exit_code=0 elapsed_seconds=2.35
```

Pre-flight verificado antes de executar: `idle_in_tx = 0`, `target_taken = 0`, `concurrent_ph = 0`.

**Conformidade com a autorização** (checklist):

| Restrição | Estado |
|---|---|
| Aplicar **somente** `CREATE INDEX CONCURRENTLY` | ✅ uma única instrução; **`ANALYZE` deliberadamente não executado** (as estatísticas de `recorded_at` não são afetadas pelo índice e já registram `correlation = 0,9855`; autoanalyze atualiza quando precisar) |
| **Não** alterar `PGRST_DB_POOL` | ✅ ausente antes e depois (`grep -c` = 0) |
| **Não** alterar timeout | ✅ `anon {statement_timeout=3s}` e `authenticated {statement_timeout=8s}` inalterados |
| **Não** reiniciar containers | ✅ `rest`/`kong`/`db` com `RestartCount = 0` e o mesmo `StartedAt` de 2026-08-15 |

### 2. Deploy do código (aprovado como merge em `main`)

```
git switch main && git merge --ff-only mission-05-performance-recovery   # 327d19a -> 277b44b
git push origin main                                                      # 327d19a..277b44b
```

Vercel: deployment **`dpl_6nm2RmFGigcATTwUfaBpTjUjGcnk`** (target `production`), status **● Ready**, aliases `www.fronteiraai.com`, `fronteiraai.com`, `fronteiraai.vercel.app`. Build ~2 min. Nenhum merge commit (fast-forward), `main` e produção em sincronia (`ahead/behind = 0/0`).

---

## AFTER — validação

### A1. Índice criado e válido

| Item | Resultado |
|---|---|
| `indisvalid` / `indisready` | **`t` / `t`** |
| `public_indexes` | **236** (era 235) |
| Tamanho | **1.608 kB (1,57 MB)** — dentro da estimativa de 2–3 MB (limite superior do plano: 4 MB) |
| Tamanho da tabela | 14 MB (era 13 MB) |
| Restrição de unicidade | nenhuma (commutativo com o uso previsto) |

### A2. O plano mudou para Index Scan (a prova direta)

| Query | BEFORE | AFTER |
|---|---|---|
| Shape B, janela 7 dias | `Seq Scan`, 800 buffers, 72.651 linhas descartadas, **88,4 / 139,1 / 74,3 ms** | **`Index Scan Backward using price_history_recorded_at_idx`**, **2 buffers**, **0,262 / 0,929 / 0,457 ms** |
| Shape B, janela 30 dias | `Seq Scan`, 170,6 ms | **`Index Scan Backward …`**, 8 linhas, **0,868 ms** |
| Shape A (por produto) | 0,63–3,14 ms | 0,671 / 0,681 / 0,690 ms (inalterado, como esperado — o plano dela já era por índice) |
| Sort de 72.651 linhas | sim | **eliminado** |
| Re-checagem sob tráfego pós-deploy | — | `Index Scan Backward …` · **0,594 ms** |

Ganho medido na query crítica: **≈ 150–300×** (88–139 ms → 0,26–0,93 ms) e **400× menos buffers** (800 → 2).

### A3. Aplicação funcionando — smoke test na produção real

Todos via `https://www.fronteiraai.com` (Vercel SSR → Caddy → Kong → PostgREST → PostgreSQL, ou seja, o caminho que o incidente derrubou):

| Superfície | HTTP | Tempo | Bytes |
|---|---|---|---|
| `/` | 200 | 0,19 s | 192.492 |
| `/categorias` | 200 | 1,10 s | 142.771 |
| `/products` | 200 | 2,45 s | 568.641 |
| `/search?q=perfume` | 200 | 2,54 s | 127.928 |
| `/lojas` | 200 | 1,12 s | 122.149 |
| `/product/12in-2-color` | 200 | — | 123.213 (card de Price Intelligence presente) |
| `/product/38in-triple-layer-3-color` | 200 | — | 123.025 (card presente) |
| `/sitemap/static.xml` · `/sitemap/lojas.xml` | 200 · 200 | 0,34 s · 0,64 s | 1.231 · 1.647 |
| `/product/sitemap/0.xml` · `1.xml` · `2.xml` | 200 · 200 · 200 | 0,22 / 0,66 / 0,76 s | ~428 kB cada |
| `api.fronteiraai.com/rest/v1/` | 401 (esperado, sem chave) | 2,63 s | gateway no ar |

Nenhuma página de produto apresentou marcador de erro (`NEXT_HTTP_ERROR_FALLBACK`, `Application error`, `Internal Server Error`); JSON-LD e o card de Price Intelligence presentes.

**Qual deployment está no ar**: o HTML de `/` embute `data-dpl-id="dpl_6nm2RmFGigcATTwUfaBpTjUjGcnk"` — exatamente o deployment Production criado a partir do merge. O código corrigido está servindo `www.fronteiraai.com`.

### A4. Monitoramento de erros

| Indicador | Antes | Depois |
|---|---|---|
| `PGRST003` (total, vida do container) | 23 | **23** (nenhum novo) |
| `57014` (total, vida do container) | 124 | **124** (nenhum novo) |
| `PGRST003` / `57014` nos últimos 15 min | — | **0 / 0** |
| Erros no PostgREST nas últimas 24 h | 52 × 07:53 + 4 × 07:54 | **os mesmos** — nenhum timestamp novo |
| Kong 5xx depois de 20:49 UTC | — | **0** (com **3.769 requisições** processadas depois de 20:45 — o tráfego existe e não gera erro) |
| Containers | — | todos `Up`, `RestartCount = 0` |

---

## ROLLBACK — disponível, não necessário

```sql
DROP INDEX CONCURRENTLY IF EXISTS public.price_history_recorded_at_idx;
```
Mesmo lock (`SHARE UPDATE EXCLUSIVE`), não bloqueia escrita, devolve ~1,6 MB, sem perda de dado. **Não foi acionado**: V1–V10 do plano foram satisfeitos e nenhum gatilho de rollback ocorreu (sem índice `INVALID`, sem regressão de latência, sem novo erro).

Rollback do código, se necessário: `git revert <sha>` em `main` + push (Vercel redeploya). Nenhuma implicação de dado.

Risco residual aceito: +1,6 MB e uma escrita de índice por INSERT em `price_history` (hoje a coleta está parada, então o custo é nulo na prática).

---

## EVIDENCE — como reproduzir cada afirmação

```bash
K=~/.ssh/paraguai-prod-01-v2; H=ubuntu@94.103.168.244
# índice válido + contagem
ssh -i $K $H 'sudo -n docker exec supabase-db psql -U postgres -c "SELECT indexrelid::regclass, indisvalid, indisready FROM pg_index WHERE indrelid='"'"'public.price_history'"'"'::regclass ORDER BY 1;"'
ssh -i $K $H 'sudo -n docker exec supabase-db psql -U postgres -c "SELECT count(*) FROM pg_indexes WHERE schemaname='"'"'public'"'"';"'   # 236
# plano da query crítica (deve conter Index Scan e NÃO conter Seq Scan)
ssh -i $K $H 'sudo -n docker exec supabase-db psql -U postgres -c "EXPLAIN (ANALYZE, BUFFERS) SELECT offer_id, price_usd, recorded_at FROM public.price_history WHERE recorded_at >= now() - interval '"'"'7 days'"'"' AND recorded_at <= now() ORDER BY recorded_at ASC LIMIT 1000;"'
# erros (nenhum novo desde o incidente de 07:53-07:54)
ssh -i $K $H 'sudo -n docker logs supabase-rest 2>&1 | grep -c PGRST003'   # 23
ssh -i $K $H 'sudo -n docker logs --since 15m supabase-rest 2>&1 | grep -c PGRST003'  # 0
# o que está no ar
npx vercel inspect https://fronteiraai-g80c5hkb8-fronteiraai.vercel.app   # Ready, production, alias www
curl -s https://www.fronteiraai.com/ | grep -o 'data-dpl-id="[^"]*"'
```

---

## Observações e pendências

1. **Verificação pendente da correção de código (Fix 1)** — o efeito observável (402 → 1 requisição a `marketplace_alerts` por ciclo) só aparece no próximo ciclo do cron diário `marketplace-operations/snapshot`, que roda por volta de **07:53–07:54 UTC** (drift da Vercel). Comando para conferir depois:
   ```bash
   ssh -i $K $H 'sudo -n docker logs --since 24h supabase-rest 2>&1 | grep -c marketplace_alerts'
   ```
   Esperado: **1** (era 402). O Fix 2 (`/product/[slug]`) é verificado pelo smoke test acima (página renderiza igual) + `pg_stat_statements` após 24 h.
2. **Deploys de Preview estão quebrados (pré-existente, não causado por esta mudança)** — os dois builds de Preview do branch falharam com `Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL` (escopo **Preview** sem as variáveis; Production tem). Consequência: **PR previews e o alias por branch não constroem**. Correção exige copiar variáveis/segredos para o escopo Preview → fora do escopo autorizado deste relatório.
3. **Caminho de descoberta do crawl, agora verificado**: `/product/sitemap/0.xml` tem **2.000 `<loc>`** (3 chunks ≈ 6.000 URLs de produto publicadas para buscadores). Isso fecha a explicação do volume anônimo da Mission 05: os buscadores leem esses sitemaps e renderizam as páginas, cada uma com várias leituras de banco — que agora custam milissegundos.
4. Nada além do aprovado foi mutado nesta execução (nenhum `ALTER`, nenhum restart, nenhum ajuste de pool/timeout/secret/config).
