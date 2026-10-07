# MISSION 05.5 — P0 RECUPERAÇÃO DE INTEGRIDADE DE DADOS (marketplace_alerts)

**Categoria**: `docs/operations/`
**Natureza**: P0 de integridade de dados. Fase 1 (código) aprovada e concluída; Fase 2 (forense) **para aprovação**; Fase 3 (P1) apenas documentada.
**Produção**: **nenhuma mutação de dados.** Todas as consultas da Fase 2/3 foram `SELECT`/`EXPLAIN` read-only, sem criar arquivo algum no host de produção (SQL enviado por *stdin*, `psql -f -`).
**Branch**: `mission-05-5-alert-pagination`

---

## DoD — BLOCO FINAL

```
P0_CODE_STATUS ............... PRONTO (local). Commit 1299ffa em
                              mission-05-5-alert-pagination. 4 arquivos
                              (+401/-14): repositório + interface + 2 arquivos de teste.
DEPLOYMENT_STATUS ............ BLOQUEADO PELA SESSÃO — `git push` é recusado pelas
                              constraints ativas deste turno ("forbid push/publish/
                              deploy-style actions"). Não contornei. O código está
                              commitado localmente; `main` local == `origin/main`
                              (bf15afd), sem divergência.
TEST_RESULTS ................. lint 0 erros (1 warning pré-existente) · typecheck PASS ·
                              186/186 suítes · 1401/1401 testes PASS (+19) · build PASS.
LISTOPEN_BEFORE_AFTER ........ ANTES: 1 requisição, resposta truncada em 1000 linhas
                              (PostgREST PGRST_DB_MAX_ROWS) ⇒ conjunto incompleto acima
                              de 1000 alertas. DEPOIS: N/1000 requisições paginadas
                              (5 hoje para 4.216), conjunto COMPLETO ou throw.
                              N_PLUS_ONE: mantido — nenhuma query por subject; o custo
                              é ceil(abertos/1000), não o tamanho do backlog em candidatos.
DATA_FORENSICS ............... TOTAL_ROWS 4.216 = LEGITIMATE 626 (todas pré-01/Out) +
                              CONFIRMED_SPURIOUS 2.680 + AMBIGUOUS 910.
                              DISTINCT_KEYS 1.536 · keys_with_dups 532 ·
                              1.004 chaves sem nenhuma duplicata.
                              Janela de criação das linhas suspeitas: 2026-10-01
                              07:54:04 → 2026-10-07 07:55:02 UTC (recriação diária).
CONFIRMED_SPURIOUS_COUNT ..... 2.680
AMBIGUOUS_COUNT .............. 910  (NÃO deletar: primeira aparição durante a janela)
DELETE_PREDICATE ............. proposto e provado (não executado) — §2.4.
                              Prova: seleciona exatamente 2.680 e **nunca** a linha mais
                              antiga de uma chave (verificação "hits_earliest" = 0).
BACKUP_PLAN .................. §2.5 — export CSV integral para a máquina local
                              (sem escrita no host de produção) + contagem/hash pré e pós.
ROLLBACK_PLAN ................ §2.6 — (a) DELETE dentro de transação com verificação
                              antes do COMMIT; (b) restauração por id a partir do CSV
                              exportado (ids originais preservados).
P1_PREPARATION_STATUS ........ DOCUMENTADO (não implementado). Mudança mapeada em 2
                              arquivos + checklist de equivalência semântica — §3.
P1_BEFORE_AFTER .............. Reproduzido em produção em 07/Out:
                              canonical 651 ms / 207.233 buffers → 0,329 ms / 10 buffers
                              (~1.980×); produto 1.040 ms / 207.235 buffers → 0,351 ms /
                              9 buffers (~2.960×).
SEARCH_RPC_FINDING ........... PROBLEMA INDEPENDENTE — §3.3. A RPC filtra por
                              categoria/marca/loja/busca e NÃO tem predicado em
                              `recorded_at`, logo não compartilha a otimização offers-first.
PRODUCTION_ERRORS_AFTER_DEPLOY N/A — deploy bloqueado. Nenhum erro novo introduzido
                              (nada foi publicado; produção segue em bf15afd).
APPROVAL_REQUIRED ............ (1) DELETE de 2.680 linhas (§2.4) + backup; (2) push/deploy
                              do P0 (bloqueado pela sessão — decisão do CTO).
```

---

## 1. FASE 1 — P0 CODE (concluída localmente)

### 1.1 O defeito

`SupabaseMarketplaceAlertRepository.listOpen()` fazia `select("*")` **sem `limit`**.
O PostgREST trunca toda resposta em `PGRST_DB_MAX_ROWS` (**1000** neste deployment), então
acima de 1000 alertas abertos o conjunto voltava incompleto. O `Set` de chaves do dedupe em
`MarketplaceAlertService.sync` também ficava incompleto e a varredura diária **recriava**
~500 alertas por dia.

### 1.2 A correção

- `PAGE_SIZE = 1000` (= `PGRST_DB_MAX_ROWS`) e `MAX_PAGES = 10.000`: a terminação **não**
  depende do `count` informado pelo servidor.
- **Ordem total pela PK** (`.order("id", { ascending: true })`): sem ordem determinística a
  paginação por `range()` pode repetir ou pular linhas entre páginas.
- **Terminação dupla**: página curta (`rows.length < PAGE_SIZE`) **ou** `all.length >= count`.
- **Falha em qualquer página ⇒ `throw` (fail-closed).** Conjunto parcial vira INSERT duplicado;
  uma falha visível e retentável da varredura é o desfecho mais barato.
- **Custo preservado**: `ceil(abertos/1000)` requisições (5 hoje) — contra 1 truncada antes e
  ~400 do N+1 original. Nenhuma query por `subject_id` é emitida.

### 1.3 Testes (+19)

`SupabaseMarketplaceAlertRepository.pagination.test.ts` (17 casos) usa um fake de cliente que
**modela o cap do PostgREST** (`slice(from, from + min(range, 1000))` + `count` real):
0 alertas · <1000 (626) · exatamente 1000 · >1000 (1001) · escala de produção **4.216 = 5
páginas** · fronteiras 1/999/1000/1001/1999/2000/2001/4500 · unicidade e completude do
conjunto · ordem determinística · preservação do ganho N+1 (5 requisições, nunca por subject)
· falha na página intermediária (**rejects**, não parcial) · falha na primeira página.

`MarketplaceAlertService.test.ts` (+2): conjunto existente **completo** em escala de produção
(4.216) cobrindo todos os candidatos ⇒ **ZERO INSERTs**; e cria **apenas** para candidato
genuinamente ausente (`brand-new`).

---

## 2. FASE 2 — FORENSE DE DADOS (para aprovação; nada foi apagado)

### 2.1 Classificação

| Classe | Definição | Contagem |
|---|---|---|
| **LEGITIMATE** | linhas pré-regressão (`created_at < 2026-10-01`), criadas pelo dedupe que funcionava | **626** |
| **CONFIRMED_SPURIOUS** | linhas da janela que **duplicam** uma chave `(alert_type, subject_type, subject_id)` já existente antes | **2.680** |
| **AMBIGUOUS** | linhas da janela **sem** equivalente anterior — primeira aparição da chave; **não são provadamente espúrias** | **910** |
| **TOTAL_ROWS** | | **4.216** |

Verificações de consistência (todas read-only):

| Checagem | Resultado |
|---|---|
| `DISTINCT_KEYS` | **1.536** |
| `LEGIT_EARLIEST_OF_KEY` (linhas mais antigas por chave) | **1.536** — exatamente 1 por chave ✔ |
| `626 + 910` | **1.536** = chaves pré-regressão + chaves que surgiram na janela ✔ |
| `626 + 2.680 + 910` | **4.216** = TOTAL ✔ |
| Janela de criação | 2026-10-01 07:54:04 → 2026-10-07 07:55:02 UTC (7 ciclos diários) |
| Chaves sem duplicata | **1.004** (não afetadas por qualquer remoção) |
| Chaves com duplicata | **532** — histograma: 2×→9, 3×→14, 4×→23, 5×→10, 6×→**322**, 7×→**154** |
| `subject_id IS NULL` | **0** (nenhum alerta marketplace-level envolvido) |
| Tipos afetados | `low_coverage/brand` 2.926 · `low_coverage/category` 1.283 · `store_not_syncing/store` 7 · todos `pending` |

O histograma confirma o mecanismo: chaves recorrentes foram recriadas **todos os dias**
(322 chaves com 6 linhas e 154 com 7), enquanto 1.004 chaves nunca duplicaram.

### 2.2 Amostra auditável (para revisão do CTO)

Comando de exportação da candidata a ser revisada antes do DELETE (read-only, saída em stdout):

```sql
SELECT a.id, a.alert_type, a.subject_type, a.subject_id, a.created_at, a.status, a.title,
       e.created_at AS earlier_same_key_created_at,
       (SELECT count(*) FROM marketplace_alerts c
          WHERE c.alert_type = a.alert_type
            AND c.subject_type IS NOT DISTINCT FROM a.subject_type
            AND c.subject_id IS NOT DISTINCT FROM a.subject_id) AS rows_for_key
FROM marketplace_alerts a
JOIN LATERAL (
  SELECT min(b.created_at) AS created_at FROM marketplace_alerts b
   WHERE b.alert_type = a.alert_type
     AND b.subject_type IS NOT DISTINCT FROM a.subject_type
     AND b.subject_id IS NOT DISTINCT FROM a.subject_id
     AND b.created_at < a.created_at
) e ON true
WHERE a.created_at >= TIMESTAMPTZ '2026-10-01 00:00:00+00'
ORDER BY a.subject_id, a.created_at;   -- 2.680 linhas
```

Cada linha traz: **id**, `alert_type`, `subject_id`, `created_at` (da linha candidata), a
`created_at` da **linha legítima equivalente que permanece** e quantas linhas a chave tem —
ou seja, o motivo da classificação é verificável linha a linha.

### 2.3 Por que 910 linhas NÃO entram

As 910 linhas "primeira aparição na janela" não têm duplicata anterior para comparar. Elas
podem ser alertas **legítimos** que surgiram naquele dia (ex.: uma marca que cruzou o limiar
de cobertura em 02/Out) ou resíduo da varredura defeituosa — **o dado não permite distinguir**.
Aplicar a regra do "mais antigo por chave" a elas significaria apagar o único registro de um
alerta possivelmente real. Portanto: **preservadas**.

### 2.4 DELETE_PREDICATE proposto (NÃO executado)

```sql
-- NÃO EXECUTADO. Prefixo de aprovação + backup obrigatórios.
DELETE FROM marketplace_alerts a
WHERE a.created_at >= TIMESTAMPTZ '2026-10-01 00:00:00+00'
  AND EXISTS (
    SELECT 1 FROM marketplace_alerts b
     WHERE b.alert_type = a.alert_type
       AND b.subject_type IS NOT DISTINCT FROM a.subject_type
       AND b.subject_id   IS NOT DISTINCT FROM a.subject_id
       AND b.created_at < a.created_at
  );
-- Esperado: 2.680 linhas.
```

**Provas de que não seleciona alerta legítimo** (todas verificadas em produção, read-only):

1. **Seleciona exatamente a classe CONFIRMED_SPURIOUS**: o predicado é idêntico à consulta de
   classificação que retornou **2.680**.
2. **Nunca seleciona a linha mais antiga de uma chave**: a checagem
   `SAFETY_predicate_hits_earliest` (`created_at` na janela **E** existe anterior **E** *não*
   existe anterior — contraditório por construção) retornou **0**. Logo, nenhuma chave perde
   seu único registro.
3. **Não toca nada fora da janela**: o filtro `created_at >= 2026-10-01` exclui as 626 linhas
   pré-regressão.
4. **NULL-safe**: `IS NOT DISTINCT FROM` em `subject_type`/`subject_id`; e não há
   `subject_id IS NULL` na tabela, então o caso NULL não participa de nenhum grupo.
5. **Nenhum critério de conteúdo**: o predicado não depende de `title`, `details` ou
   `severity` — só de identidade (chave) + tempo, ambos verificáveis na amostra de §2.2.
6. **Idempotência**: reexecutar a mesma sentença após a limpeza seleciona 0 linhas (as
   sobreviventes são, por definição, as mais antigas de cada chave).

### 2.5 BACKUP_PLAN (sem escrita no host de produção)

1. **Contagem e hash pré** (read-only):
   `SELECT count(*) FROM marketplace_alerts;` → 4.216
   `SELECT count(*) FROM marketplace_alerts WHERE created_at >= TIMESTAMPTZ '2026-10-01';` → 3.590
2. **Export integral para fora do VPS** (streaming para a máquina local; nada é criado no host):
   ```bash
   ssh -i ~/.ssh/paraguai-prod-01-v2 ubuntu@94.103.168.244 \
     'sudo -n docker exec -i supabase-db psql -U postgres -c "\copy (SELECT * FROM marketplace_alerts ORDER BY created_at, id) TO stdout WITH CSV HEADER"' \
     > marketplace_alerts_backup_2026-10-07.csv
   ```
   `\copy` (client-side) escreve **na minha máquina**; o VPS só lê.
3. **Export da candidata** (2.680 linhas) com o mesmo método, para revisão linha a linha.
4. **Verificação do backup**: `wc -l` (4.217 com header) + sha256 local; conferir que os
   `id` do backup cobrem os `id` da candidata (`comm`/`join` local).
5. Guardar os dois CSVs **fora do repositório** (não versionar).

### 2.6 ROLLBACK_PLAN

- **Antes do COMMIT (preferido)**: executar o DELETE dentro de transação, conferir
  `rowcount = 2.680` e a contagem pós (`4.216 - 2.680 = 1.536` = `DISTINCT_KEYS`), e só então
  `COMMIT`; qualquer divergência → `ROLLBACK` (nada aconteceu).
- **Após o COMMIT (recuperação)**: as linhas apagadas têm **id original** no CSV; a
  restauração é um `INSERT` explícito com esses ids (sem `ALTER`/criação de tabela — respeita
  o guardrail de "no schema changes"):
  ```sql
  INSERT INTO marketplace_alerts (id, alert_type, severity, status, subject_type, subject_id, title, details, created_at, resolved_at)
  VALUES (...), (...);  -- gerado a partir do CSV
  ```
- **Verificação pós-restauração**: contagem volta a 4.216 e a checagem de chaves
  (`DISTINCT_KEYS` = 1.536) é idêntica.
- **Risco residual assumido**: se entre o backup e o DELETE a varredura diária rodar
  (07:53–07:55 UTC) ela pode inserir ~500 linhas novas **após** a correção P0 estar no ar —
  nesse caso elas são legítimas e não entram no DELETE (a janela do predicado termina em
  07/Out 07:55; uma execução futura não é atingida). Recomendação: aplicar o DELETE **depois**
  do push/deploy do P0, para que a varredura seguinte não recrie nada.

---

## 3. FASE 3 — P1 (apenas documentação)

### 3.1 P1_BEFORE_AFTER (reproduzido em produção, 2026-10-07)

| Forma | ANTES (embed `!inner` + `order`, produção hoje) | DEPOIS (offers-first) | Ganho |
|---|---|---|---|
| canonical-catalog | **651,4 ms** · **207.233 buffers** | **0,329 ms** · 10 buffers | **~1.980×** |
| `/product/[slug]` (produto + loja ativa) | **1.039,8 ms** · **207.235 buffers** | **0,351 ms** · 9 buffers | **~2.960×** |

Anatomia confirmada no plano (Memoize): **52.683 misses + 19.968 hits = 72.651 sondas** — uma
por linha de `price_history` — e em cada sonda o índice de `offers` **descarta 1 linha por
filtro** (`Rows Removed by Filter: 1`). Ou seja: 72.650 das 72.651 sondas são trabalho inútil,
por chamada.

### 3.2 Mudança mapeada (não implementada, não deployada)

| Arquivo | Mudança |
|---|---|
| `services/price-intelligence.service.ts` | trocar o `select("price_usd, recorded_at, offers!inner(product_id, stores!inner(active))")` + `order("recorded_at")` por: subconsulta em `offers` (produto + `stores.active`) → `price_history` com `.in("offer_id", ids)` + `order("recorded_at")`. Mesma semântica de visibilidade pública (o filtro de loja ativa muda de lugar, continua no SQL). |
| `src/domains/canonical-catalog/…SupabaseCanonicalPriceHistoryRepository.ts` (+ serviço que monta a consulta) | idem para o filtro `offers.canonical_product_id`. |

**Checklist de equivalência semântica para a Mission 06** (verificar, não assumir): mesmos
produtos e mesmas ofertas retornadas; mesma ordenação (`recorded_at` ASC, com desempate
determinístico pelo caminho antigo vs. novo); `available`/`in_stock` com a mesma semântica
(ADR-008: histórico inclui oferta arquivada de loja ativa); mesmo comportamento para produto
sem oferta pública (sempre `[]`, nunca erro); mesmo `limit`/downsampling do gráfico; contrato
de visibilidade pública coberto por `services/__tests__/public-catalog-visibility.test.ts`.

**Por que não implementei aqui**: (a) a fase diz explicitamente "Document only" e "Do not deploy
P1 in this mission"; (b) o `push` está bloqueado nesta sessão, então um branch com código não
verificado não chegaria a lugar nenhum; (c) a mudança toca caminhos de leitura de páginas
públicas (risco MEDIUM) e merece implementação + gates dedicados na Mission 06.

### 3.3 SEARCH_RPC_FINDING — problema independente

`search_products_catalog(p_category_id, p_brand_id, p_store_id, p_search, p_only_in_stock,
p_min_price, p_max_price, p_sort, p_limit, p_offset) RETURNS TABLE(product_id,
lowest_price_usd, has_stock, total_count) LANGUAGE sql` (verificado via `pg_get_functiondef`).

**Não compartilha a otimização offers-first**: seus filtros são categoria/marca/loja/busca e
**não há predicado em `price_history.recorded_at`** — logo não existe o `LATERAL` sobre
`price_history` que causa o custo de §3.1. Seu perfil medido (Mission 05.4) é outro: **981 ms e
131.745 buffers em uma única chamada**, 688,8 ms de média histórica em 7.706 chamadas, e é a
**forma dominante entre os 500 de outubro** (`POST /rpc/search_products_catalog`).

Hipótese a testar na Mission 06 (não confirmada nesta missão): o custo vem do `total_count`
calculado sobre o conjunto elegível **completo** + ordenação/paginação sobre `products`/
`offers` a cada chamada, sem predicado seletivo quando não há filtro. Próximo passo: `EXPLAIN
(ANALYZE, BUFFERS)` da RPC com parâmetros reais (inclusive o caso sem filtro, o caminho que o
crawl/SEO percorre) e revisão dos índices de `offers`/`products` para ordenação e contagem.

---

## 4. O que NÃO foi feito (conforme guardrails)

Não houve: DELETE · alteração de schema · `PGRST_DB_POOL` · `statement_timeout` · restart de
container · alteração de Docker/Kong/secrets/env da Vercel/DNS/firewall · deploy de P1 ·
alteração de exchange-rates · Preview/Staging. **Nenhum arquivo temporário foi criado no host
de produção** (SQL sempre por *stdin* com `psql -f -`). Mission 04 permanece intacta e fora de
todos os commits.
