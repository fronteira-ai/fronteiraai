# MISSION 05.4 — ENCERRAMENTO DO INCIDENTE + TRIAGEM DE RISCO RESIDUAL

**Categoria**: `docs/operations/`
**Janela de evidência**: 2026-09-30 (incidente + correção) → **2026-10-07 14:27 UTC** (7 dias de ciclos reais)
**Natureza**: **OBSERVE + VERIFY + DESIGN.** Nenhuma alteração de produção nesta missão — apenas `docker logs/stats/inspect`, `psql` SELECT/`EXPLAIN` e leitura de código.

---

## DoD — BLOCO FINAL

```
MISSION_05 FINAL STATUS
  INCIDENT_RECURRENCE ................ YES
  PGRST003_AFTER_FIX ................. 23 → 55 total (+32 em 7 dias). Bursts com 504 em
                                       01/Oct 13:14 · 02/Oct 15:59 · 03/Oct 20:42 ·
                                       04/Oct 06:51 · 05/Oct 03:56/09:33/21:24. Última
                                       ocorrência: 05/Oct. 07/Oct = reboot do host, não
                                       incidente de pool (ver §1).
  57014_AFTER_FIX .................... 124 → 426 total (+302 em 7 dias). Picos 02/Oct
                                       (15:59–16:00, 70) · 05/Oct (281 5xx no dia) ·
                                       03/Oct (20:42, 50) · 01/Oct (13:14, 10).
  KONG_5XX_AFTER_FIX ................. 467 respostas 5xx em outubro (194×500 de timeouts
                                       `anon` + 254×504 de pool + 19 outros). Baseline do
                                       incidente original: 141 no total.
  MARKETPLACE_ALERT_FIX .............. REGRESSÃO (parcial): leitura 402 → 1 CONFIRMADA
                                       (alert_type=in. = 1/dia; subject_id=eq. = 0 em
                                       outubro), MAS o lote é truncado por
                                       PGRST_DB_MAX_ROWS=1000 ⇒ +3.590 alertas espúrios
                                       em 7 dias (626 → 4.216; ~500 INSERTs/dia) e o
                                       volume de requisições do ciclo NÃO caiu. Ver §2 —
                                       correção P0 preparada.
  PRICE_HISTORY_INDEX ................ HEALTHY (existe · indisvalid=t · indisready=t ·
                                       145.152 scans · 0 novas sessões o ignoraram)
  PRICE_HISTORY_CURRENT_PERFORMANCE .. Range por `recorded_at`: 0,21–0,36 ms (antes:
                                       88–139 ms) — GANHO PERSISTIU. Embed `!inner`+order:
                                       526–558 ms (antes 444 ms) — REGRESSÃO de ~20–25%.
  FULL_INDEX_SCAN_ROOT_CAUSE ......... PostgREST `!inner` embed + `order=recorded_at.asc`:
                                       o plano ALTERNADO percorre 72.651 linhas de
                                       `price_history` e executa 72.651 sondas LATERAL
                                       (Memoize) para devolver 1 linha = 207.233 buffers,
                                       588 ms por chamada. Não é o índice de `recorded_at`
                                       que causa a patologia (era 158.881 buffers/call antes),
                                       mas ele torna o plano ~30% pior ao evitar o sort.
  KONG_OPERATIONAL_RISK .............. Log sem rotação em 3,55 GiB (+107 MB/dia); 69 GB
                                       livres ⇒ ~645 dias até encher. Memória 370/512 MiB
                                       (72%); 0 restarts, 0 OOM. Risco: custo de scan +
                                       crescimento; não é emergência.
  EXCHANGE_RATES_ROOT_CAUSE .......... BROKEN — 194/194 provider runs em `failure`
                                       (EXCHANGE_RATE_API_KEY e OPEN_EXCHANGE_RATES_APP_ID
                                       não configuradas); INSERT em `exchange_rates` = 0
                                       desde sempre.
  DREAMY_HODGKIN_CLASSIFICATION ...... RESOLVIDO / NÃO APLICÁVEL — container E volume não
                                       existem mais (removidos entre 30/Set e 07/Out).
  PREVIEW_STAGING_ARCHITECTURE ....... Projetada (§8): matriz de env/secrets por ambiente,
                                       riscos de Preview→Supabase de produção, pipeline alvo.
  RESIDUAL_RISKS ..................... §9 (7 riscos, priorizados)
  CHANGES_PREPARED ................... §10 (5 mudanças preparadas/documentadas, 0 aplicadas)
  APPROVALS_REQUIRED ................. §10 (lista por item)
  MISSION_05_CLOSE_RECOMMENDATION .... KEEP_OPEN
  NEXT_MISSION_RECOMMENDATION ........ Mission 06 — eliminar a patologia de embed+order
                                       (2 arquivos, ganho medido 200–630×) e investigar a
                                       RPC `search_products_catalog` (981 ms/131k buffers)
```

---

## 1. VALIDAÇÃO DOS CICLOS REAIS (7 dias pós-correção)

### 1.1 O que aconteceu depois da correção (30/Set 20:49 → 07/Out 14:27)

| Dia (UTC) | Erros PostgREST | Janelas | Natureza |
|---|---|---|---|
| 01/Oct | 11 | 13:14:22–13:14:46 | PGRST003 + 57014 (burst de ~25 s) |
| 02/Oct | 79 | 09:50:04; **15:59:29–16:00:03** | burst grande: ~70 × 57014 + 5 × PGRST003 |
| 03/Oct | 58 | 14:51:15; **20:42:59–20:43:57** | burst de ~58 s |
| 04/Oct | 5 | 06:51:09–06:51:20 | burst curto |
| 05/Oct | **87** | 03:56:46; 09:33:26–09:34:07; 14:01:25; 21:24:22–21:24:39; 22:07:22 | **4 bursts no mesmo dia** |
| 06/Oct | 0 | — | dia limpo |
| 07/Oct | 54 | 13:06:* | **PGRST000 "connection refused" — reboot do host**, não incidente de pool |

Comparação com o histórico anterior (vida do container): 24/Ago, 27/Ago, 28/Ago, 04/Set, 14/Set, 19–20/Set, 26/Set, 29/Set e 30/Set — ou seja, bursts desse tipo já existiam **antes** da correção (o incidente investigado foi o de 30/Set 07:53). **A frequência aumentou** (6 dias com erro em 7 dias, contra ~1–2 bursts/semana antes).

### 1.2 O que os 5xx de outubro são (linhas de 5xx do PostgREST, agregadas)

| Dimensão | Resultado |
|---|---|
| Total em outubro | **467** (194 × `500` = `57014` timeout; 254 × `504` = `PGRST003`; 19 linhas não normalizadas pelo parser) |
| Por papel | **anon 339** / **service_role 109** |
| Principais caminhos | `/price_history` **227** · `/offers` 86 · `/products` 67 · `/canonical_products` 35 · `/marketplace_memory_facts` 13 · `/market_changes` 9 · `/merchant_stores` 7 · `/exchange_rates` 4 |
| **Forma dominante entre os 500** | **`POST /rpc/search_products_catalog`** — a busca do catálogo estourando o `statement_timeout` de 3 s do papel `anon` |

Ou seja: a classe do incidente **não** foi fechada pela correção do índice — ela se repete sempre que um pico de crawl encontra as consultas mais caras do sistema, que hoje são (a) a RPC de busca e (b) os embeds `!inner` de `price_history`.

### 1.3 Infraestrutura no período

- **O host reiniciou 3 vezes em 07/Out** (`reboot … 5.15.0-187 Aug 12 17:45 → Oct 7 10:33`, `5.15.0-198 Oct 7 10:46 → 12:40`, `5.15.0-198 Oct 7 13:06 → agora`). O kernel mudou de **5.15.0-187 para 5.15.0-198** ⇒ **manutenção de SO com atualização de kernel**, não relacionada às Missões 05.x. Os 54 erros de 07/Out são os `PGRST000` (conexão recusada) dessa subida — e nada mais.
- Containers: `RestartCount = 0`, `OOMKilled = false` nos três serviços principais; `StartedAt = 2026-10-07T13:06:12` (o reboot).
- Conexões PostgreSQL: **13/100** (1 ativa, 12 idle). Pool do PostgREST: **10** (inalterado, confirmado no log de boot: "Connection Pool initialized with a maximum size of 10 connections"). `anon` 3 s / `authenticated` 8 s: inalterados.
- Disco: 22 G de 91 G (25%).

### 1.4 Veredito

**INCIDENT_RECURRED = YES.** Mesma assinatura (timeout de statement no `anon` + esgotamento do pool de 10 conexões), em 5 dias distintos, com a causa dominante **deslocada** para consultas que a correção do índice não tocava.

---

## 2. VALIDAÇÃO DO FIX 1 EM PRODUÇÃO (marketplace_alerts) — **REGRESSÃO ENCONTRADA**

**Classificação: PARCIAL / COM REGRESSÃO.** A redução de leitura foi atingida; a contrapartida não foi prevista e é um defeito real introduzido pela Mission 05.

### 2.1 O que funcionou (medido no log do Kong, 3,55 GiB, todas as requisições desde o início do container)

| Dia (UTC) | Janela do cron | Forma em lote `alert_type=in.(...)` | Forma por candidato `subject_id=eq.` |
|---|---|---|---|
| 01/Oct | 07:5x | **1** | **0** |
| 02/Oct | 07:5x | **1** | **0** |
| 03/Oct | 07:5x | **1** | **0** |
| 04/Oct | 07:5x | **1** | **0** |
| **Total no log** | — | **7** (todas pós-deploy) | **20.466** (todas pré-deploy) |

Ou seja: o N+1 de **leitura** foi eliminado (402 leituras por ciclo → **1**), exatamente como projetado.

### 2.2 O que quebrou (e é mais grave)

A varredura passou a **CRIAR** alertas em massa. `marketplace_alerts` saiu de **626 linhas (30/Set)** para **4.216 linhas (07/Out)**:

| Dia | Alertas criados |
|---|---|
| 01/Oct | **530** |
| 02/Oct | 536 |
| 03/Oct | 476 |
| 04/Oct | 532 |
| 05/Oct | 521 |
| 06/Oct | 509 |
| 07/Oct | 486 |
| **Total** | **+3.590 em 7 dias** (0 no período anterior: os dados param em 08/Set) |

Composição: `low_coverage/brand` = **2.926**, `low_coverage/category` = 1.283, `store_not_syncing/store` = 7 — todos `pending`.
Forma das requisições na janela: **`POST /rest/v1/marketplace_alerts?select=*` ≈ 500/dia** + `GET …alert_type=in.(…)` = 1/dia.

### 2.3 Causa raiz da regressão (defeito meu, em `listOpen`)

`SupabaseMarketplaceAlertRepository.listOpen()` faz `select("*")` **sem `limit` explícito**. O PostgREST aplica `PGRST_DB_MAX_ROWS = 1000` como teto — então, a partir do momento em que existem **mais de 1.000 alertas abertos**, a leitura em lote devolve apenas os primeiros 1.000 e o `Set` de chaves em memória fica **incompleto**. Todo candidato cuja chave não caiu nos 1.000 é tratado como novo ⇒ INSERT. Como cada varredura insere ~500 linhas, a tabela ultrapassa o teto de forma permanente e o defeito se realimenta diariamente (3.590 linhas depois, o problema só cresce).

A implementação anterior (`findOpenByKey` com `maybeSingle()`, `limit 1`) não tinha esse defeito porque nunca dependia de ler o conjunto inteiro.

**Impacto**: (a) integridade de dados — a fila de alertas deixou de ser deduplicada; (b) ~500 round trips sequenciais **de escrita** por ciclo, na mesma janela de pico (07:54) que a Mission 05 investigou — o volume de requisições da varredura **não diminuiu** (402 leituras → 1 leitura + ~500 escritas); (c) 3.590 linhas espúrias acumuladas.

### 2.4 Correção preparada (não aplicada — precisa de aprovação)

**Código** — paginar a leitura em lote até esgotar (mantém o ganho de leitura e remove o teto):

```ts
async listOpen(alertTypes: MarketplaceAlertType[]): Promise<MarketplaceAlert[]> {
  if (alertTypes.length === 0) return [];
  const PAGE = 1000;               // = PGRST_DB_MAX_ROWS
  const all: MarketplaceAlert[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error, count } = await this.client
      .from("marketplace_alerts")
      .select("*", { count: "exact" })
      .in("alert_type", alertTypes)
      .in("status", [MarketplaceAlertStatus.Pending, MarketplaceAlertStatus.Acknowledged])
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return all;
    all.push(...((data ?? []) as AlertRow[]).map(toDomain));
    if (!count || all.length >= count) return all;
  }
}
```
Custo: `ceil(abertos/1000)` requisições por varredura (4 hoje) — ainda **~100× menos** que as 402 originais, e correto. Alternativa: consultar por `subject_id IN (ids candidatos)` (URL grande, mas 1 requisição).

**Dados** — os 3.590 alertas criados entre 01/Oct e 07/Oct são espúrios (a varredura não criava nada antes de 08/Set e passou a criar 500/dia apenas depois do deploy). Limpeza **precisa de aprovação** (é mutação de produção) e de um critério auditável, por exemplo:

```sql
-- NÃO EXECUTADO. Aprovação + backup antes.
-- Deletar apenas duplicatas: mesma (alert_type, subject_type, subject_id) com created_at posterior
-- ao primeiro registro, mantendo a linha mais antiga de cada chave.
```
Critério sugerido: manter a linha mais antiga por chave `(alert_type, subject_type, subject_id)` e deletar as repetidas com `created_at >= '2026-10-01'`. Requer `SELECT count(*)` prévio por chave e revisão manual do lote antes do DELETE.


---

## 3. O ÍNDICE AO LONGO DO TEMPO

| Verificação | Resultado |
|---|---|
| Existe | sim — `price_history_recorded_at_idx` |
| `indisvalid` / `indisready` | **`t` / `t`** |
| Está sendo usado | **sim — 145.152 scans** desde a criação; o plano `Index Scan Backward` reconfirmado (0,21–0,36 ms) |
| Tamanho | 1.608 kB (inalterado) |
| `public_indexes` | 236 |

**Performance atual vs. baseline da Mission 05.2**

| Forma | BEFORE (30/Set 20:47) | AFTER inicial (30/Set 21:0x) | AGORA (07/Out 14:30) | Veredito |
|---|---|---|---|---|
| Range por `recorded_at` (7 dias) | Seq Scan, 800 buffers, **88,4 / 139,1 / 74,3 ms** | Index Scan, 2 buffers, 0,262 / 0,929 / 0,457 ms | Index Scan, **0,327 / 0,214 / 0,359 ms** | **ganho persistiu (≈300×)** |
| Embed `!inner` + `order=recorded_at.asc` | 158.881 buffers/call, 444,6 ms | 169.838 buffers/call, 468,5 ms | **169.838 → 185.399 buffers/call, 468–527 ms** | **regressão ~20–25%** |

Contabilidade de tempo de banco (desde 2026-08-15, `pg_stat_statements`): `price_history` saiu de 501.283 chamadas/50,55 h (30/Set) para **658.426 chamadas/70,71 h** (07/Out) — **+20,2 h em 7 dias**, das quais **53,2 h acumuladas** vêm só das duas formas com embed (36,1 h + 17,1 h). É o item #1 de custo do banco.

---

## 4. FULL INDEX SCAN RESIDUAL — CAUSA, CUSTO, GANHO ESPERADO

### 4.1 Reprodução exata da SQL que o PostgREST gera

`price_history?select=offer_id,price_usd,recorded_at,offers!inner(canonical_product_id)&offers.canonical_product_id=eq.<X>&order=recorded_at.asc` vira (verificado em `pg_stat_statements`, queryid `-442452169596071612`):

```sql
SELECT ph.offer_id, ph.price_usd, ph.recorded_at, row_to_json(o.*)::jsonb
FROM price_history ph
INNER JOIN LATERAL (
  SELECT offers_1.canonical_product_id FROM offers AS offers_1
  WHERE offers_1.canonical_product_id = $1 AND offers_1.id = ph.offer_id
  LIMIT 1000 OFFSET 0
) AS o ON true
ORDER BY ph.recorded_at ASC LIMIT 1000;
```

`EXPLAIN (ANALYZE, BUFFERS)` executado em produção com os parâmetros reais:

```
Limit (actual time=588.152..588.223 rows=1 loops=1)
  Nested Loop (actual time=588.147..588.217 rows=1 loops=1)          <-- 1 linha de resultado
    -> Index Scan Backward using price_history_recorded_at_idx
         on price_history ph (rows=72651 ...)  Buffers: shared hit=49184
    -> Memoize (actual time=0.006..0.006 rows=0 loops=72651)          <-- 72.651 sondas laterais
         Buffers: shared hit=158049
Total: Buffers: shared hit=207233 · Execution Time ~588 ms
```

**CAUSE**: o filtro (`canonical_product_id`) vive dentro de um `LATERAL` que o planner não consegue empurrar para baixo. Para satisfazer `ORDER BY price_history.recorded_at ASC` **sem sort**, ele percorre as 72.651 linhas em ordem e, para **cada** uma, executa a subconsulta lateral (Memoize) — 72.651 sondas para achar 1 linha. Não é um "full scan do índice novo": é **N sondas laterais** onde N = tamanho da tabela; o índice de `recorded_at` só decide *como* a caminhada ordenada acontece.

**COST** (medido): 207.233 buffers e **588 ms por chamada**, para as duas formas com embed: 277.495 chamadas (36,1 h) + 116.579 chamadas (17,1 h) = **53,2 h de tempo de banco acumulado**, além de ~185.000 buffers/chamada ≈ **60 GB de tráfego de buffer por semana**. É este custo que faz as requisições `anon` cruzarem o `statement_timeout` de 3 s durante um pico de crawl — a causa direta da recorrência de §1.

**Antes da correção**: 158.881 buffers/chamada (Seq Scan + Sort + as mesmas 72.651 sondas). Ou seja, a patologia **já existia**; o índice de `recorded_at` a tornou ~30% pior porque o planner deixou de pagar o sort e passou a caminhar pelo índice (49.184 buffers só na caminhada).

### 4.2 Correção candidata — medida, não estimada

Trocar a forma com embed por **dois passos** (offers primeiro, depois `price_history` por `offer_id`):

```sql
SELECT ph.offer_id, ph.price_usd, ph.recorded_at
FROM price_history ph
WHERE ph.offer_id IN (SELECT o.id FROM offers o WHERE o.canonical_product_id = $1)
ORDER BY ph.recorded_at ASC;
```

| Forma | Atual (embed + order) | Candidata (offers-first) | Ganho |
|---|---|---|---|
| canonical-catalog | 588 ms · 207.233 buffers · 1 linha | **0,937 ms · ~10 buffers** | **≈630×** |
| por produto + loja ativa (`/product/[slug]`) | ~558 ms · 185.399 buffers | **2,604 ms · 527 buffers** | **≈215×** |

Semântica preservada: o filtro de loja ativa (`stores!inner(active)`) apenas muda de lugar, entrando na subconsulta de `offers` em vez do embed. O `ORDER BY recorded_at` continua no banco (a subconsulta devolve poucos `id`s).

**Onde ficaria**: `services/price-intelligence.service.ts` (forma por produto) e o repositório/serviço de histórico do canonical-catalog (`src/domains/canonical-catalog/…SupabaseCanonicalPriceHistoryRepository.ts` + o serviço que monta a consulta com embed). **Nenhum branch foi criado nesta missão** — §9 do enunciado define 05.4 como OBSERVE+VERIFY+DESIGN e a mudança toca caminhos de leitura de páginas públicas (risco MEDIUM, precisa de regressão de visibilidade). A especificação + medição estão prontas para a Mission 06.

### 4.3 Achado adicional: a RPC de busca

`POST /rpc/search_products_catalog` é a **forma dominante entre os 500 de outubro** e aparece no delta de 120 s com **131.745 buffers e 981 ms em uma única chamada** (queryid `-287528669433973418`). Histórico: 7.706 chamadas a **688,8 ms** de média. É o segundo item de custo e o candidato natural à próxima investigação (não é afetado pelo índice desta missão).

---

## 5. KONG — RISCO OPERACIONAL

| Métrica | Valor | Observação |
|---|---|---|
| Memória atual | **370,1 MiB / 512 MiB (72,3%)** | caiu após o reboot; no incidente estava 444 MiB (87%) |
| Limite configurado | 512 MiB (`docker-compose.override.yml`) | o único serviço no teto |
| Log atual | **3.813.581.841 bytes = 3,55 GiB** | era 2,8 GiB em 30/Set |
| Crescimento | **≈107 MB/dia** (0,75 GiB em 7 dias) | tráfego atual |
| Política de rotação | **NENHUMA** — `LogConfig: {"Type":"json-file","Config":{}}`; sem `max-size`/`max-file`, e `/etc/docker/daemon.json` não define default |
| Disco | 22 G usados / 69 G livres (25%) | a 107 MB/dia ⇒ **~645 dias** para encher |
| OOM / restart | **0 restarts, `OOMKilled=false`**; nenhuma linha de OOM no `dmesg` | nenhuma evidência de OOM até hoje |

**Risco real**: não é exaustão de disco iminente — é (a) o custo operacional de escanear 3,55 GiB para qualquer diagnóstico (é o que tornou caro extrair a evidência desta missão), (b) crescimento monotônico sem limite superior, e (c) um pico de tráfego 10× encurtaria o prazo de ~645 para ~65 dias.

**Mudança preparada (NÃO aplicar)** — em `infra/selfhosted/docker-compose.override.yml`, serviço `kong`:

```yaml
  kong:
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
```
Efeito: teto de ~250 MB no log (em vez de crescimento infinito). **Aplicação exige recriar o container `kong`** (`docker compose up -d kong`), com indisponibilidade de segundos — por isso não foi feita.
**Rollback**: remover o bloco `logging:` e recriar o container; o log antigo permanece em disco (5 arquivos rotacionados) e pode ser apagado manualmente quando aprovado.
**Alternativa sem downtime**: `logrotate` no host com `copytruncate` (não exige recriar o container), mas sai do compose e precisa de cron/timer próprio.

---

## 6. `exchange_rates` VAZIA — CAUSA RAIZ

**Classificação: BROKEN.**

Trace completo (scheduler → route → service → provider → persistência):

1. **Scheduler**: `/api/cron/exchange/refresh` não está mais em `vercel.json` (foi movido para `.github/workflows/high-frequency-crons.yml`, `*/5`), e esse workflow é **dormant sem `CRON_SECRET` + `CRON_APP_URL`**. Ainda assim houve 194 execuções registradas — vindas de chamadas pontuais (admin/rotas `/api/exchange/*`).
2. **Route** (`app/api/cron/exchange/refresh/route.ts`): `requireCronSecret` → `rateService.refresh()`.
3. **Service** (`ExchangeRateService.refresh`): para cada provider → `fetchRates()`; em sucesso, grava `exchange_provider_runs` (status=success) e chama `persistAndTriangulate()` → `rateRepo.insert()` → **INSERT em `exchange_rates`**. Em exceção: grava `run` com `failure` e cai para o próximo provider; se **todos** falharem → `degradeToLastKnownGood()`, que **não insere nada por design** (Anti-Pattern 5, INSERT-only).
4. **Provider** (`ExchangeRateApiProvider.fetchRates`): lança `EXCHANGE_RATE_API_KEY não configurada…` quando a env var não existe. `OpenExchangeRatesProvider`: lança `OPEN_EXCHANGE_RATES_APP_ID não configurada…`.
5. **Persistência**: `exchange_rates` com `n_tup_ins = 0` — **nenhum INSERT jamais ocorreu**.

**Evidência**:

| Fato | Valor |
|---|---|
| `exchange_provider_runs` | **194 linhas, 100% `failure`** |
| Por provider | `exchangerate-api` 98 falhas · `open-exchange-rates` 96 falhas |
| Mensagem de erro (amostra) | `EXCHANGE_RATE_API_KEY não configurada…` / `OPEN_EXCHANGE_RATES_APP_ID não configurada…` |
| `exchange_rates.n_tup_ins` | **0** (e 0 linhas na tabela) |
| Env vars no Vercel | apenas 5: `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `CRON_SECRET` — **nenhuma chave de provider de câmbio** |
| Consequência funcional | todo preço em BRL/USD/PYG exibido ao consumidor opera em modo fallback **sem dado algum** desde sempre; as 309k + 280k leituras de `exchange_rates` retornam vazio |

**Correção (não aplicada, precisa de aprovação — são segredos)**: definir `EXCHANGE_RATE_API_KEY` (provider primário) e opcionalmente `OPEN_EXCHANGE_RATES_APP_ID` (failover) no escopo **Production** do Vercel, e garantir o gatilho `*/5` (configurar `CRON_SECRET` + `CRON_APP_URL` no repositório para o workflow deixar de ser dormant). Depois, um único ciclo bem-sucedido popula a tabela e o `ExchangeRateCache` passa a servir valores reais.

---

## 7. `dreamy_hodgkin`

**Classificação: RESOLVIDO / NÃO APLICÁVEL.** O container **não existe mais** (`docker inspect` → `no such container`, `docker logs` → `No such container`), e o volume dele também não está mais em `docker volume ls` (só resta `supabase_db-config`). Foi removido entre 30/Set e 07/Out (provavelmente durante a manutenção do host de 07/Out).

Nenhuma ação pendente. Registro histórico do que ele era (Mission 05.3): `postgres:17.6`, criado em 2026-08-26 10:51 UTC, rede `bridge`, porta **não** publicada no host (só o `docker-proxy` do `supabase-db` em 127.0.0.1:5432), volume próprio, ~31 MiB em execução, sem portas expostas.

---

## 8. PREVIEW / STAGING — ARQUITETURA PROPOSTA (nada alterado na Vercel)

### 8.1 O risco real de "Preview → Supabase de produção" (reavaliado)

A Mission 05.3 sugeriu que URL e anon key são "públicas por definição" e que isso bastaria. **Não basta.** A `anon key` é pública, mas o que ela *pode fazer* é definido pelas políticas de RLS — e o ParaguAI tem superfícies de **escrita** para `anon` (ex.: `/api/analytics/events`, `buyer_events`/`buyer_sessions`, favoritos, e rotas de merchant com sessão). Consequências de ligar Preview ao banco de produção:

1. **Escrita real no catálogo de produção** a partir de código não revisado (um Preview é, por definição, código em teste). Ex.: um bug no tracker de analytics polui métricas de produção; um teste de import de merchant escreve ofertas reais.
2. **`SUPABASE_SERVICE_ROLE_KEY` em Preview** ignora RLS integralmente — qualquer URL de preview acessível publicamente se torna uma porta de escrita total (leituras de tabelas internas, mutações). Isso só é aceitável com **Deployment Protection (Vercel Authentication)** ativa, e ainda assim expõe o *dado de produção* a qualquer pessoa com acesso ao time.
3. **Estado não deterministico**: seeds/migrations de teste passariam a ter efeito em produção; um `db reset` de Preview não existe (não há banco de staging).
4. **Custo de trilha**: sem staging, um PR não tem onde ser validado "com banco real" antes de produção — o que hoje é feito *em produção* (foi exatamente o padrão das Missões 05.x).

### 8.2 Desenho alvo (PR → CI → Preview → checks → aprovação → produção)

| Camada | Banco | Escopo Vercel | Segredos permitidos | O que roda |
|---|---|---|---|---|
| **Development** | Supabase **local** (`npm run db:local:rebuild`, já existente) | — | `.env.local` (nunca versionado); service role permitido | dev, testes locais |
| **Preview** (por PR) | **staging** (novo) — *nunca produção* | Preview | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (**apontando para staging**), `SUPABASE_SERVICE_ROLE_KEY` **de staging**; `CRON_SECRET` opcional | build + smoke/visual + Playwright; **sem** escrita em produção |
| **Staging** | Supabase **staging** dedicado (ou schema/`project` separado no mesmo host) | — | mesmos do Preview + `EXCHANGE_RATE_API_KEY` de teste | migrações validadas, seeds, E2E de ponta a ponta |
| **Production** | Supabase self-hosted atual | Production | todos, incluindo `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `EXCHANGE_RATE_API_KEY` | tráfego real |

**Pré-requisitos técnicos** (nenhum existe hoje):
1. **Banco de staging.** A lacuna já está registrada em `.github/workflows/database.yml` ("one Supabase project, not a separate staging + production pair"). Opções: (a) segundo checkout do stack self-hosted no mesmo VPS com portas/diretórios distintos — **custo de RAM no host sem swap, não recomendado**; (b) projeto Supabase Cloud (gratuito) só para staging — mais barato e isolado; (c) schema dedicado + `search_path` no mesmo banco — mais barato, porém **não isola recursos** (mesmo pool/conexões/CPU: um Preview pesado derruba produção, exatamente o risco desta investigação).
2. **Deployment Protection** ligada para Preview/Staging (Vercel Authentication ou senha) — pré-requisito para qualquer service-role key fora de produção.
3. **Separação de gatilhos**: `CRON_APP_URL` deve apontar para **produção** apenas; Preview/Staging não devem disparar crons reais (`*/5` no workflow é global — hoje o workflow é dormant, e isso deve continuar valendo para não-produção).
4. **Checks automatizados no CI** antes de promover: `lint`/`typecheck`/`test`/`build` (já existem) + smoke E2E contra o Preview.

**Regra de ouro proposta** (para virar convenção): *nenhuma credencial que ignore RLS (`service_role`) e nenhuma URL de banco de produção pode existir fora do escopo Production*; Preview e Staging apontam para o banco de staging, com credenciais próprias.

**Nada disso foi alterado nesta missão** (nem `vercel env`, nem o compose, nem o CI).

---

## 9. RESIDUAL RISKS (priorizados)

| # | Risco | Materialidade | Evidência | Recomendação |
|---|---|---|---|---|
| **R0** | **REGRESSÃO INTRODUZIDA PELA MISSION 05**: `listOpen` truncado em 1.000 linhas ⇒ a varredura diária recria ~500 alertas (`marketplace_alerts` 626 → 4.216 em 7 dias) | **Alta — integridade de dados** | §2.2/§2.3 | **P0**: aplicar a correção paginada (§2.4) + limpeza aprovada das 3.590 linhas espúrias |
| R1 | **Embed `!inner` + `order` custa 207.233 buffers/588 ms por chamada e é a causa direta da recorrência** | **Alta** — 53,2 h de tempo de banco em 7 dias; é o que estoura o `anon` de 3 s nos picos | §4.1 (reprodução) | Mission 06: aplicar a forma offers-first (2 arquivos, ganho medido 215–630×) |
| R2 | **RPC `search_products_catalog` lenta** | **Alta** — forma dominante entre os 500 de outubro; 981 ms e 131.745 buffers em uma chamada; 688,8 ms de média histórica | §4.3, §1.2 | Mission 06: `EXPLAIN` da RPC com parâmetros reais + revisão do plano/índices (não afetada pelo índice de `recorded_at`) |
| R3 | **`exchange_rates` vazio → todo preço em BRL opera em fallback sem dado** | **Alta (funcional)** — 100% das execuções do provider falharam desde sempre | §6 | Configurar `EXCHANGE_RATE_API_KEY` (+ failover) — **precisa de aprovação (segredo)** |
| R4 | **Kong no teto de memória (72–87%) + log sem rotação (3,55 GiB, +107 MB/dia)** | Média — nenhum OOM até hoje; crescimento lento | §5 | Aplicar `max-size=50m`/`max-file=5` (recria o container) — preparado, aguardando aprovação |
| R5 | **Deploys de Preview quebrados** (env de Preview ausente) | Média — sem revisão visual por PR; hoje o que se valida é produção | §8.1 | Só faz sentido junto com staging (§8.2): a solução "adicionar as 3 públicas no Preview" foi **reavaliada como insuficiente e arriscada** |
| R6 | **Gatilhos de cron parcialmente dormentes/indeterminados** (`*/5` de câmbio no GitHub Actions; o cron diário de marketplace-ops dispara com drift de ~53 min) | Média — o câmbio nunca roda; o diário rodou com atraso mas rodou | §6.1, Mission 05 §3.1 | Documentar a matriz de gatilhos e configurar `CRON_SECRET`/`CRON_APP_URL` (ou migrar para `pg_cron` — ADR futuro) |
| R7 | **Nome do alvo do índice não é o gargalo**: o índice de `recorded_at` é saudável, mas não pode ser "vendido" como a correção do incidente | Baixa (expectativa) | §3 | Registrar no fechamento: o ganho real foi no range (300×); a recorrência é R1/R2 |

---

## 10. CHANGES PREPARED / APPROVALS REQUIRED

| # | Mudança preparada | Onde | Aplicada? | Aprovação necessária |
|---|---|---|---|---|
| **P0** | **Correção da regressão do Fix 1** — `listOpen` com paginação (`range()` + `count`) até esgotar, em vez de `select("*")` sem limite (código completo em §2.4) | `src/domains/marketplace-operations/infrastructure/SupabaseMarketplaceAlertRepository.ts` | **não** (nenhum branch criado) | Sim — **prioridade máxima**; leva junto a limpeza das 3.590 linhas espúrias (DELETE em produção, exige backup) |
| P1 | **Forma offers-first** para as duas consultas de `price_history` (spec + medição prontas: 0,937 ms vs 588 ms; 2,604 ms vs 558 ms) | `services/price-intelligence.service.ts` + repositório de histórico do canonical-catalog | **não** (nenhum branch criado) | Sim — implementar na Mission 06 (código, MEDIUM) |
| P2 | Rotação de log do Kong (`max-size=50m`, `max-file=5`) + rollback | `infra/selfhosted/docker-compose.override.yml` | **não** | Sim — recria o container `kong` (segundos de indisponibilidade) |
| P3 | `EXCHANGE_RATE_API_KEY` (+ `OPEN_EXCHANGE_RATES_APP_ID`) no escopo Production | Vercel → Settings → Environment Variables | **não** | Sim — segredos |
| P4 | Gatilho real do cron de câmbio: `CRON_SECRET` + `CRON_APP_URL` no repositório (hoje dormant) | GitHub → Settings → Secrets and variables → Actions | **não** | Sim |
| P5 | Arquitetura Preview/Staging (§8.2) + banco de staging | Vercel + infra | **não** | Sim — decisão de arquitetura/contratação |

**Não alterado nesta missão** (conforme §9 do enunciado): `PGRST_DB_POOL` (segue 10, ausente), `statement_timeout` (anon 3 s / authenticated 8 s), configuração do PostgreSQL, recursos do Docker, segredos, DNS, firewall, env da Vercel, produção.

---

## 11. Recomendação de fechamento

**MISSION_05_CLOSE_RECOMMENDATION = KEEP_OPEN.**

Nada aqui autoriza fechar: (a) a **classe** do incidente — pico de crawl + consulta pesada + `anon` 3 s + pool de 10 ⇒ 57014 + PGRST003 + 5xx — **se repetiu em 5 dos 7 dias observados**, agora puxada por duas consultas que a Mission 05 não tocou (R1, causa medida e correção especificada; R2, ainda não investigada); (b) há uma **regressão de integridade de dados introduzida pela própria Mission 05** (R0 — 3.590 alertas espúrios, ~500 INSERTs/dia na janela de pico), cuja correção está pronta mas não aplicada; (c) a correção de maior valor que a Mission 05 entregou (o índice) permanece **saudável e é permanente** (300× na forma que visava), mas não pode ser apresentada como o fechamento do incidente.

**NEXT_MISSION_RECOMMENDATION = Mission 06 — "Embed & Search Cost Elimination + Fix 1 Correction"**:

| Prioridade | Item | Ganho esperado |
|---|---|---|
| **P0** | Correção da regressão do Fix 1: `listOpen` paginado (§2.4) + limpeza aprovada das 3.590 linhas espúrias | elimina ~500 INSERTs/dia e a perda de deduplicação |
| **P1** | Forma offers-first nas duas consultas de embed de `price_history` (§4.2) — branch isolado, com regressão de visibilidade pública | **215–630×** nessas consultas (207.233 buffers/588 ms → ~10 buffers/0,9 ms) |
| **P2** | `EXPLAIN (ANALYZE, BUFFERS)` da RPC `search_products_catalog` com parâmetros reais e redução de custo (981 ms; 131.745 buffers; forma dominante entre os 500 de outubro) | a medir |
| **P3** | Revalidar 7 dias dos picos diários (07:53–07:54) após P0–P2 | critério objetivo: **0** `PGRST003`, **0** `57014`, **0** 5xx no Kong em todos os picos |
| Paralelo (aprovações) | P3 (credencial de câmbio), P2 (rotação do log do Kong), P5 (staging/Preview) | independentes entre si |
