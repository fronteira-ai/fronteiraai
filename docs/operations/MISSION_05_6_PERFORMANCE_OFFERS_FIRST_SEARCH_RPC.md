# MISSION 05.6 — OFFERS-FIRST + SEARCH RPC (preparação, sem deploy)

**Categoria**: `docs/operations/`
**Branch**: `mission-05-6-performance` (a partir de `origin/main` = `1efb447`)
**Natureza**: investigação + implementação LOCAL + benchmarks read-only. **Nada publicado em produção.** Merge em `main` e deploy são proibidos nesta missão.
**Medições de produção**: read-only (`EXPLAIN (ANALYZE, BUFFERS)`, `psql` SELECT, `docker logs`), sem criar arquivo algum no host.
**Missão 05.5 preservada**: o código P0 de paginação não foi tocado (`git diff --stat origin/main -- src/domains/marketplace-operations/` = vazio).

---

## 1. ROOT_CAUSE_OFFERS_FIRST

A consulta de histórico de preço era **uma só**, com embeds aninhados e `order` na tabela pai:

```sql
-- shape A (/product/[slug]) e shape B (canonical-catalog)
SELECT price_history..., offers!inner(product_id|canonical_product_id, stores!inner(active))
FROM price_history
WHERE offers.product_id = $1 (ou offers.canonical_product_id = $1)
ORDER BY price_history.recorded_at ASC
```

O PostgREST renderiza isso como **`INNER JOIN LATERAL (…) ON true` + `ORDER BY price_history.recorded_at`**. Como o filtro vive **dentro** do LATERAL, o planner **não consegue empurrá-lo para baixo**: para satisfazer a ordenação sem `sort`, ele percorre as **72.651 linhas** de `price_history` em ordem e executa **uma sondagem lateral por linha** — medido:

```
Nested Loop  (actual time=649.487..649.575 rows=1 loops=1)
  -> Index Scan Backward using price_history_recorded_at_idx (rows=72651, Buffers: 49184)
  -> Memoize (loops=72651)  Hits: 19968  Misses: 52683  Buffers: 158049
       -> Index Scan using idx_offers_canonical_product … Rows Removed by Filter: 1
Total: Buffers: shared hit=207233 · Execution Time ~651 ms   (para devolver 1 linha)
```

**72.651 sondagens para achar 1 linha**; em cada uma o índice de `offers` descarta 1 linha pelo filtro `id = ph.offer_id`. O problema **não** é o índice de `recorded_at` (que é saudável): antes dele o mesmo shape fazia `Seq Scan + Sort +` as mesmas 72.651 sondagens (158.881 buffers/call). O índice apenas trocou *como* a caminhada ordenada acontece e a tornou ~30% pior em buffers.

**Custo agregado (7 dias, `pg_stat_statements`)**: 277.495 chamadas a 468,5 ms + 116.579 a 526,6 ms = **53,2 h de tempo de banco** — o maior consumidor do banco, e a causa direta das requisições `anon` cruzarem o `statement_timeout` de 3 s nos picos de crawl (Mission 05.4).

---

## 2. PERFORMANCE_BEFORE_AFTER

Implementado em **dois passos** (ambos filtrando primeiro) em:
`services/price-intelligence.service.ts` (shape A) e `src/domains/canonical-catalog/infrastructure/SupabaseCanonicalPriceHistoryRepository.ts` (shape B).

| Consulta | BEFORE (embed + order) | AFTER (offers-first, 2 passos) | Ganho |
|---|---|---|---|
| **canonical** — passo 1 (`offers` por `canonical_product_id`) | — | **0,648 ms** · 3 buffers | — |
| **canonical** — passo 2 (`price_history` por `offer_id IN`) | — | **0,751 ms** · 10 buffers | — |
| **canonical — total** | **651,4 ms** · **207.233 buffers** | **≈1,40 ms** · ~13 buffers | **≈465×** |
| **produto** — passo 1 (`offers` + `stores.active`) | — | **0,247 ms** · 5 buffers | — |
| **produto** — passo 2 (`price_history`, `LIMIT 3000`) | — | **0,570 ms** · 9 buffers | — |
| **produto — total** | **1.039,8 ms** · **207.235 buffers** | **≈0,82 ms** · 14 buffers | **≈1.270×** |

Ambos os passos usam **Index Scan** (`idx_offers_canonical_product` / `offers_product_id_idx` / `stores_pkey` / `price_history_offer_recorded_idx`); nenhum `Seq Scan`, nenhum `LATERAL`, nenhuma ordenação de 72.651 linhas.

Variante de referência (subconsulta única, mede o custo sem a segunda ida-e-volta): **0,329 ms** (canonical) e **0,351 ms** (produto). A implementação escolhida usa dois passos por ser a forma natural via PostgREST/supabase-js (sem SQL cru): custa ~1 ms a mais e continua **três ordens de grandeza** abaixo do original.

---

## 3. FUNCTIONAL_EQUIVALENCE

Contrato preservado, ponto a ponto:

| Dimensão | Antes | Depois | Prova |
|---|---|---|---|
| **Mesmos produtos/ofertas** | embed `offers!inner` com `offers.product_id` / `offers.canonical_product_id` | passo 1 filtra `offers` pelos mesmos campos e devolve **todos** os `id` → `in("offer_id", ids)` | testes "todas as ofertas públicas entram no IN" e "resolves the canonical product's offers first" |
| **Visibilidade pública (P2)** | `stores!inner(active)` + `eq("offers.stores.active")` | mesmo predicado, agora no passo 1 (`select("id, stores!inner(active)")` + `eq("stores.active", true)`) | teste de contrato reescrito (sem filtro em JS) |
| **Mesma seleção de preços** | `price_usd, recorded_at` (shape A) · `offer_id, price_usd, recorded_at` (shape B) | idêntica projeção; `null` preservado (não coagido) | teste "equivalence: same rows, same order, same projection" (`priceUSD: [5, 7, null]`) |
| **Mesma ordenação** | `order("recorded_at", { ascending: true })` no banco | idêntica, no banco | asserts `["order", ["recorded_at", { ascending: true }]]` nos dois módulos |
| **Teto de payload** | shape A `limit(3000)`; shape B cap do PostgREST (1000) | inalterado (`limit(3000)` / mesmo cap) | assert `["limit", [3000]]` |
| **Semântica de `available` (ADR-008)** | **não** filtra `offers.available` | **não** filtra (o comentário normativo segue no código) | revisão + testes que não checam `available` |
| **Dados ausentes** | INNER join sem linha ativa ⇒ 0 linhas ⇒ série `[]` | passo 1 vazio ⇒ retorno imediato `[]`/série vazia, **sem consultar `price_history`** | testes "sem oferta pública a leitura para em offers" e "a canonical product without offers returns [] and never touches price_history" (`chainsFor("price_history")` vazio) |
| **Erro de query** | log + `[]` (nunca lança) | log + `[]` em **ambos** os passos (dois caminhos testados) | testes de erro em offers e em price_history, nos dois módulos |
| **Sem filtro em JavaScript** | agregação só recebe o que o banco devolveu | inalterado | asserts sobre `series`/`points` iguais ao payload do banco |

---

## 4. SEARCH_RPC_ROOT_CAUSE

`search_products_catalog(p_category_id, p_brand_id, p_store_id, p_search, p_only_in_stock, p_min_price, p_max_price, p_sort, p_limit, p_offset)` — `LANGUAGE sql`, `STABLE`, `RETURNS TABLE(product_id, lowest_price_usd, has_stock, total_count)`. Estrutura: `filtered_offers` (offers `available = true` JOIN `stores.active = true` + filtros de oferta) → `product_price` (`min(price_usd)`, `bool_or(in_stock)` **GROUP BY product_id**) → `candidates` (JOIN `products` + filtros de produto) → `WindowAgg count(*) OVER ()` → `ORDER BY` + `LIMIT/OFFSET`.

**Plano medido (read-only, produção):**

| Cenário | Tempo | Buffers | Nós dominantes |
|---|---|---|---|
| **Sem filtro** (`NULL,NULL,NULL,NULL,false,NULL,NULL,'newest',24,0`) | **504,99 ms** | **5.463** | `Seq Scan offers` (43.441 linhas, 1.504 buffers) → `HashAggregate` (43.436 → 43.407) → `Seq Scan products` (52.674 linhas, 3.952 buffers) → **`WindowAgg` (43.407 linhas)** → `Sort` top-N |
| **`p_search='perfume'`** | **524,80 ms** | **5.457** | **o mesmo `HashAggregate` sobre 43.436 linhas** + o mesmo `Seq Scan products`; só o resultado final cai (5.692 → 20 linhas) |

**Causa raiz**: (1) a agregação `product_price` percorre **todo** o catálogo elegível (43.436 ofertas de lojas ativas) em **toda** chamada, **independentemente dos filtros** — `p_category_id`/`p_brand_id`/`p_search` são aplicados **depois**, sobre `products`, então **não reduzem o trabalho da agregação** (a busca de 524 ms prova: mesmo agregado, mesmo custo); (2) `total_count` via `count(*) OVER ()` obriga as 43.407 linhas candidatas a passar por um `WindowAgg` mesmo quando a página devolve 24; (3) o padrão `(p_x IS NULL OR col = p_x)` impede uso de índice para os filtros (e `ILIKE '%…%'` é inindexável sem `pg_trgm`); (4) `Seq Scan products` (3.952 buffers) não tem índice que sirva a ordenação `created_at DESC, id`.

É a **forma dominante entre os 500 de outubro** (`POST /rpc/search_products_catalog`) e a segunda maior consumidora de tempo de banco (7.706 chamadas a 688,8 ms de média histórica; 981 ms/131.745 buffers numa chamada sob carga na Mission 05.4).

---

## 5. SEARCH_RPC_OPTIMIZATION_PLAN (preparado, NÃO aplicado)

| # | Ação | Ganho esperado | Risco / observação |
|---|---|---|---|
| **P-A** | **Empurrar os filtros de produto para dentro da agregação**: `filtered_offers` passa a `JOIN products p ON p.id = o.product_id` com os mesmos predicados, de modo que o `GROUP BY` só agregue o subconjunto filtrado | grande para chamadas **filtradas** (categoria/marca/busca deixam de agregar 43k linhas) | caminho **sem filtro** não melhora (não há o que filtrar) |
| **P-B** | **Caminho sem filtro** (entrada do crawl/SEO e `/products`): (i) `MATERIALIZED VIEW product_lowest_price(product_id, lowest_price_usd, has_stock)` atualizada pelo sync → agregação vira leitura indexada de tabela pequena; (ii) ou **abandonar `total_count` exato** (estimativa/paginção "sem total") — decisão de produto; (iii) ou pré-computar a coluna de ordenação para o top-N usar índice | o maior ganho do item (elimina o `WindowAgg`/`Seq Scan` de 43k linhas por chamada) | (i) exige refresh no write-path e migration; (ii) muda UX de paginação; (iii) muda modelo |
| **P-C** | **Índices** (migration preparada abaixo) | reduz `offers`/`products` para index-only scan | `pg_trgm` é **extensão** — exige ADR + aprovação explícita (regra do projeto) |
| **P-D** | **Cache de aplicação** para a primeira página sem filtro (a mais atingida por crawl) | corta a maior parte das chamadas repetidas | frescor do catálogo (mesma classe de trade-off do câmbio) |

### Migration PREPARADA (para revisão — NÃO executada)

```sql
-- NÃO APLICADA. Não foi colocada em supabase/migrations/ de propósito: o histórico
-- remoto está dessincronizado e um `supabase db push` futuro a varreria junto com
-- outras Sprints (mesmo critério da Mission 05.1).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_available_product_price
  ON public.offers (product_id) INCLUDE (price_usd, in_stock)
  WHERE available = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_created
  ON public.products (category_id, created_at DESC, id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand_created
  ON public.products (brand_id, created_at DESC, id);

-- Para `ILIKE '%…%'` (só se a estratégia de busca textual for mantida).
-- Extensão = mudança de schema/extensão: exige ADR + aprovação explícita.
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
--   ON public.products USING gin (name gin_trgm_ops);
```
Rollback de cada índice: `DROP INDEX CONCURRENTLY IF EXISTS <nome>;`

---

## 6. KONG_5XX_ANALYSIS (read-only)

Janela analisada: últimos 200 MB do access log (~2,2 dias: 07/Out 09h → 09/Out 14h).

| Dimensão | Resultado |
|---|---|
| Total | **1.052** respostas 5xx |
| Por status | 500 = 359 · 502 = 232 · 503 = 243 · 504 = 218 |
| Por endpoint | **`GET /rest/v1/offers` = 911 (87%)** · `canonical_products` 100 · `price_history` 29 · `POST /rpc/*` 17 · `marketplace_memory_facts` 2 |
| Serviço upstream | **exclusivamente `rest` (PostgREST)** — nenhum envolvimento de GoTrue/Storage |
| Distribuição temporal | **crônica e uniforme: 10–27 por hora**, ao longo de 08/Out e 09/Out — **não** concentrada no ciclo das 07:54 nem no reboot |
| Relação com reinicialização | **não**: apenas **10 de 483** `502/503` caem nas janelas de restart do host (07/Out 10:33–13:10) |
| Relação com consultas lentas | **sim**: 480 dos 911 são respostas do próprio PostgREST (500 = `57014` statement timeout; 504 = `PGRST003` pool timeout). Os 431 restantes são de gateway (não aparecem no log do PostgREST) |
| Mecanismo dos 502/503 (evidência primária) | **289 × `Connection reset by peer`** + **130 × `upstream prematurely closed`** ⇒ o **PostgREST está abortando/fechando conexões sob carga sustentada**, não é má configuração do Kong |
| Hipótese testada e **descartada** | URLs gigantes com `id=in.(…)` (1.000 UUIDs do analytics de câmbio): apenas **57** dos 911 5xx de `/offers` contêm `id=in.` |

**Causa provável**: saturação sustentada (não um burst) do pool/CPU do PostgREST pelos caminhos de leitura do catálogo — com `/offers` respondendo por 87% — produzindo timeouts de statement/pool (480) e resets de conexão vistos pelo gateway (431). É a mesma classe do incidente de 30/Set, porém em regime **contínuo** (~250-400/dia), e é o que o offers-first (§2) e a RPC (§4-5) atacam pelas duas pontas mais caras. **Não** há relação com restarts nem com o cron diário.

---

## 7. TEST_RESULTS

| Gate | Resultado |
|---|---|
| ESLint | **0 erros** (1 warning pré-existente em `scripts/comparison-forensics-audit.ts:19`) |
| `tsc --noEmit` | **PASS** |
| Testes | **187/187 suítes · 1409/1409 testes PASS** (+1 suíte, +8 testes: 5 reescritos/novos em `public-catalog-visibility.test.ts` + 6 em `SupabaseCanonicalPriceHistoryRepository.offersFirst.test.ts`) |
| `npm run build` | **PASS** (Next.js 16.2.9) |
| Testes de equivalência | 11 casos cobrindo produtos/ofertas, ordenação, projeção (incl. `null`), dados ausentes, erros, teto de payload e ausência de embed |
| Benchmarks antes/depois | §2 — `EXPLAIN (ANALYZE, BUFFERS)` em produção, read-only, para os 4 passos novos + os 2 shapes antigos |

---

## 8. BRANCH_AND_COMMITS

- Branch **`mission-05-6-performance`**, criada de `origin/main` `1efb447`.
- Commit (local): `perf(price-history): offers-first for product and canonical history + search RPC plan`.
- Arquivos alterados: `services/price-intelligence.service.ts`, `src/domains/canonical-catalog/infrastructure/SupabaseCanonicalPriceHistoryRepository.ts`, `services/__tests__/public-catalog-visibility.test.ts`, `src/domains/canonical-catalog/__tests__/SupabaseCanonicalPriceHistoryRepository.offersFirst.test.ts` (novo), este documento.
- **Sem merge na `main`, sem deploy.**
- Mission 04 permanece intacta (arquivos não commitados preservados); P0 da 05.5 intocado.

---

## 9. RISKS

| Risco | Materialidade | Mitigação |
|---|---|---|
| Duas idas-e-voltas em vez de uma | Baixa — total ≈0,8–1,4 ms vs ≈0,33–0,35 ms da variante de subconsulta única (ambas ≫1000× melhores que o original) | avaliar a variante de subconsulta única quando o domínio migrar para RPC/SQL |
| URL de `in("offer_id", ids)` cresce com o nº de ofertas do produto/canonical | Baixa hoje (produtos têm 1-N ofertas; canonical medido com 1) | se um canonical passar de centenas de ofertas, dividir em chunks de ~200 ids |
| Teto de 1000 linhas do PostgREST na shape canonical | Nenhuma mudança (paridade com o comportamento anterior) | — |
| Segunda consulta depende do resultado da primeira (falha parcial) | Já tratado | ambos os passos degradam para `[]`/série vazia com log, sem lançar (testado) |
| RLS/permissões | Nenhuma mudança de papel ou de predicado (mesma condição de visibilidade, apenas no passo 1) | contrato coberto por teste |
| Migration de índices da RPC | Não aplicada | revisão + `CONCURRENTLY` + rollback por `DROP INDEX` |

---

## 10. APPROVALS_REQUIRED

1. **Deploy do offers-first** (merge da branch `mission-05-6-performance`) — aprovação explícita, **e recomendo depois** de fechada a validação do P0 da 05.5 (não empilhar duas mudanças na mesma janela de observação).
2. **`search_products_catalog`**: escolher entre P-A/P-B/P-C/P-D antes de qualquer migration; **P-B(ii)** (abandonar `total_count` exato) é decisão de **produto**; **`pg_trgm`** exige **ADR + aprovação** (mudança de extensão).
3. Nada de `PGRST_DB_POOL`, timeouts, Kong, Docker, secrets ou Vercel — permanece intocado.

---

## 11. DEPLOYMENT_RECOMMENDATION

- **Offers-first**: **SIM**, com risco baixo e ganho medido de ~465× (canonical) e ~1.270× (produto) — mas **em sequência**, após a confirmação de runtime do P0 (05.5C/05.5D). Dois deploys simultâneos tornariam qualquer regressão ambígua.
- **Search RPC**: **ainda não**. Primeiro P-A (mudança de função, sem schema) como menor risco e ganho imediato para chamadas filtradas; depois reavaliar P-B/P-C com medição. Sem migration antes da decisão de produto sobre `total_count`.
- **Kong**: nenhuma ação de configuração; a causa é o custo das consultas (medido). Reavaliar após os dois itens acima — a expectativa é queda dos 480 timeouts de PostgREST e, por consequência, dos 431 resets vistos pelo gateway.
