# MISSION 05.7 — SEARCH RPC PERFORMANCE

**Categoria**: `docs/operations/`
**Branch**: `mission-05-7-search-rpc` (a partir de `origin/main` = `1efb447`; Mission 05.6 **não** incorporada)
**Produção**: **READ-ONLY** — nenhum `CREATE`, `ALTER`, `DROP`, `DELETE`, `UPDATE`, `INSERT`, `REFRESH`, migration, RLS, secret, cron, Docker, Kong, Vercel, restart, pool, timeout ou memória. Medições por `EXPLAIN (ANALYZE, BUFFERS)` e `SELECT`.
**Entrega**: migration versionada **preparada e não aplicada** + relatório. Sem merge, sem deploy.

---

## ROOT_CAUSE_SEARCH_RPC

A função agregava **todo** o catálogo elegível **antes** de qualquer filtro de produto:

```sql
filtered_offers (offers available=true JOIN stores.active=true + filtros de OFERTA)
  -> product_price (GROUP BY product_id: min(preço), bool_or(estoque))   -- 43.436 ofertas
  -> JOIN products (aqui, e só aqui, entram p_category_id / p_brand_id / p_search)
```

Como os filtros de **produto** só entravam no JOIN final, o `HashAggregate` processava
**43.436 ofertas → 43.407 produtos** em **toda** chamada. Medido (Mission 05.6, reproduzido aqui):
sem filtro ~502 ms / 5.463 buffers; `p_search='perfume'` ~651 ms / 5.457 buffers — **o mesmo
HashAggregate** (a busca só reduz o resultado final, não o trabalho). `count(*) OVER ()`
(`total_count` exato) obriga as 43.407 linhas a passar por `WindowAgg` mesmo quando a página
devolve 24. Padrões `(col IS NULL OR col = p)` não permitem índice nos filtros; `ILIKE '%…%'`
é inindexável sem `pg_trgm`. Consequência: 480 dos 911 5xx de `/rest/v1/offers`+`/rpc/*` na
análise do Kong (05.6) são timeouts do próprio PostgREST sob essa carga.

## QUERY_PLAN_BEFORE

`search_products_catalog(NULL,NULL,NULL,NULL,false,NULL,NULL,'newest',24,0)` — **504,99 ms**, **5.463 buffers**, 24 linhas devolvidas:

```
Limit -> Sort (top-N, 21.730 linhas)            actual 502 ms
  -> WindowAgg (43.407 loops)                   actual 446→472 ms   <-- count(*) OVER ()
    -> Hash Join (43.407)
      -> Seq Scan products p (52.674 linhas, 3.952 buffers)  35,5 ms
      -> Hash -> Subquery Scan pp -> HashAggregate (43.436→43.407, 1.505 buffers)  158→194 ms
        -> Hash Join -> Seq Scan offers o (43.441 linhas, 1.504 buffers)  87 ms
                     -> Seq Scan stores s (9 linhas, 1 buffer)
```
Cardinalidade estimada × real: `products` estimado 52.589 × real 52.674 (bom); `offers` 43.460 × 43.441 (bom) — **o problema não é estimativa ruim, é escopo**: não há filtro a empurrar no plano original.

## OPTIMIZATION_SELECTED

**Estratégia A — Filter Pushdown** (a prioridade definida na missão), implementada de forma que
`products` seja lido **uma única vez**:

```sql
filtered AS (offers JOIN stores.active JOIN products      -- filtros de OFERTA **e** de PRODUTO aqui
             WHERE available AND (categoria) AND (marca) AND (name ILIKE) AND (loja/estoque/preço))
agg AS (SELECT product_id, created_at, min(price_usd) lowest, bool_or(in_stock) has_stock
        FROM filtered GROUP BY product_id, created_at)
```

**Por que A**: maior redução comprovada (ver BEFORE/AFTER), menor risco (mesma assinatura, mesma
semântica, mesmo `total_count` exato), menor complexidade operacional (nenhuma infra nova) e
compatibilidade integral com a interface (as colunas e a ordem não mudam) — exatamente os cinco
critérios da missão.

**Por que `GROUP BY product_id, created_at`**: `created_at` é funcionalmente dependente de
`products.id`, então a cardinalidade continua **uma linha por produto**; carregar `created_at`
no agregado elimina a **segunda** passagem por `products` que a variante de dois JOINs exigia —
foi essa segunda passagem que causou a regressão de +23–29% no caminho sem filtro (medida e
descartada; ver PERFORMANCE_BEFORE_AFTER).

**Bônus de segurança semântica**: filtros de **oferta** (loja, estoque, preço) permanecem aplicados **antes** da agregação — nenhum empurramento altera o conjunto agregado. Filtros de **produto** só restringem *quais* produtos são considerados, e não afetam preço/estoque de nenhum produto (a agregação é por produto) ⇒ pushdown seguro.

## IMPLEMENTATION_DETAILS

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/20261009170000_search_products_catalog_filter_pushdown.sql` (novo) | `CREATE OR REPLACE FUNCTION public.search_products_catalog(...)` com o corpo do pushdown; assinatura, tipos de retorno, `LANGUAGE sql`, `STABLE`, `SECURITY INVOKER`, ausência de `SET search_path` e `GRANT EXECUTE` (anon/authenticated/service_role) **preservados**; `COMMENT ON FUNCTION` atualizado |
| `docs/operations/MISSION_05_7_SEARCH_RPC_PERFORMANCE.md` (novo) | este relatório |

**Nenhum arquivo TypeScript foi alterado** — a RPC tem assinatura idêntica, devolve as mesmas
colunas na mesma ordem, com a mesma ordenação e o mesmo `total_count` exato, então
`services/product.service.ts` (único caller, `/products`) funciona sem mudanças.

## PERFORMANCE_BEFORE_AFTER

Medições read-only em produção, `EXPLAIN (ANALYZE, BUFFERS)`, **3 execuções por cenário**
(mediana). Workload real, sem dados sintéticos.

| # | Cenário | OLD (RPC atual) mediana | Pushdown 2-JOIN mediana | **Pushdown 1-JOIN (implementado)** mediana | Variação final |
|---|---|---|---|---|---|
| 01 | sem filtro (`newest`, p1) | 501,8 ms | 649,9 ms (**+29%**) | **528,6 ms** | **+5% (faixas sobrepostas: 495–524 vs 525–551)** |
| 02 | `p_search='perfume'` (5.692 produtos) | 651,1 ms | 655,0 ms | não medido (estrutura idêntica) | ~0% |
| 03 | `p_search` sem resultado | 519,9 ms | 372,1 ms | não medido | −28% |
| 04 | categoria (Perfume masculino, 1.391) | 195,98 ms | 90,97 ms | **76,4 ms (75,1 ms no corpo exato)** | **−61%** |
| 05 | marca (XIAOMI, 723) | 218,7 ms | 91,5 ms | não medido | −58% |
| 06 | categoria + `only_in_stock` | 224,6 ms | 76,8 ms | não medido | −66% |
| 07 | página 2 (`offset 24`) | 469,4 ms | 579,2 ms (**+23%**) | **511,4 ms** | **+9% (faixas sobrepostas: 418–520 vs 411–519)** |
| 08 | página profunda (`offset 4800`) | 661,2 ms | 646,4 ms | não medido | ~0% |
| 09 | filtro impossível (sem resultados) | 0,36 ms | 0,44 ms | não medido | ~0 (curto-circuito por índice) |
| 10 | categoria + `sort=price_asc` | 198,2 ms | 74,5 ms | não medido | −62% |

Como interpretar sem maquiagem:
- **Filtros seletivos (categoria/marca/combinação/ordenação) melhoram 54–66%** e os buffers caem
  de **5.463 → 2.309** (categoria): o `Bitmap Index Scan on products_category_id_idx` passa a
  dirigir o plano e o `GroupAggregate`/`WindowAgg` processam **1.391 linhas** em vez de 43.407.
- **Fluxo comum com busca textual (`perfume`, 5.692 produtos) não melhora** — a agregação
  continua grande porque o conjunto de produtos elegíveis continua grande. É uma limitação
  real, não um número escondido.
- **Caminho sem filtro: ~500 ms, praticamente inalterado** (+5%/+9% com faixas sobrepostas =
  indistinguível dentro da dispersão de ±12% observada nestas execuções; a variante de dois
  JOINs, essa sim, piorava de forma consistente e foi **descartada** por isso).

**Separação de camadas (para não vender ganho de SQL como ganho de UX)**: os números acima são
**tempo de SQL**. Não medi latência HTTP nem latência de página nesta missão (exigiria tráfego
sintético em produção, fora da autoridade read-only). O ganho de SQL é condição necessária, não
suficiente, para o ganho percebido: `/products` ainda faz uma segunda consulta por página e, em
página vazia, **duas** chamadas à RPC (`product.service.ts:417-423`).

### Metas da missão × resultado

| Meta | Resultado |
|---|---|
| Busca filtrada comum < 100 ms | **Parcial**: categoria **76 ms** ✅ · busca textual comum (~650 ms) ❌ |
| Busca seletiva < 50 ms | ❌ **não atingida** (76 ms; o piso é o custo de agregar ~1.4k ofertas + `count`) |
| Redução significativa de buffers | ✅ 5.463 → 2.309 (−58%) nos cenários filtrados |
| Nenhuma regressão funcional | ✅ equivalência exata (abaixo) |
| Nenhuma piora relevante sem filtros | ✅ (indistinguível dentro da dispersão) |

**Próxima alternativa técnica (documentada, não implementada)**: para o caminho **sem filtro** e
para a **busca textual comum**, a agregação é inevitável enquanto `lowest_price_usd`/`has_stock`
forem calculados a cada chamada e `total_count` for exato. Caminhos: **B** (contagem separada ou
aproximada — exige aprovação, muda contrato) e **D** (pré-computação: tabela/view materializada
`product_lowest_price` atualizada pelo sync, com política explícita de frescor). Não implementados
aqui por exigirem decisão de produto/infra — classificados como mission posterior.

## FUNCTIONAL_EQUIVALENCE

Prova por **diferença de conjunto** (`EXCEPT ALL` nas duas direções) entre a RPC viva e a query
candidata, com dados reais: **`only_old=0 only_new=0` em todos os cenários testados** — nenhum
produto a mais, nenhum a menos, nenhuma linha divergente.

Verificação **do texto exato que a migration aplica** (não de uma variante parecida):

```
CAT_equiv only_old=0 only_new=0 rows=24 new_total=1391 old_total=1391
```
— mesmo conjunto de 24 linhas **e** mesmo `total_count` (1.391) — mais `only_old=0 only_new=0`
para BASE e PAGE2 e para os 10 cenários na variante de pushdown.

Contratos preservados (por inspeção do corpo + testes existentes):
mesmos produtos elegíveis (PUBLIC PRODUCT = ≥1 PUBLIC OFFER), mesmas regras de visibilidade
(`stores.active`), mesma disponibilidade, mesmos filtros, mesma ordenação (incl. `price_asc`/
`price_desc` e o fallback `created_at DESC, id`), mesmos desempates (`c.id`/`product_id`),
mesma paginação (`LIMIT/OFFSET`), **`total_count` exato** (sem aproximação), mesma lógica de
preço/estoque, mesmo tratamento de nulos (`COALESCE(has_stock,false)`; `created_at` nulo →
`DESC NULLS LAST`), mesmo comportamento sem resultados.

**O que NÃO pude validar nesta missão** (declarado explicitamente):
- **Ambiente local/isolado**: não existe (Docker engine indisponível na máquina; não há banco de
  staging — lacuna já registrada em `.github/workflows/database.yml`). Portanto a migration **não
  foi aplicada em nenhum ambiente**; a validação é por execução do **corpo exato** como `SELECT`
  read-only em produção + equivalência de conjunto.
- Testes que dependam de um Postgres vivo (verificação de `total_count` por RLS e por papel):
  cobertos indiretamente (`SECURITY INVOKER` + políticas `SELECT true` em `offers`/`products`/
  `stores`, inalteradas) e pelos testes de serviço existentes.
- Casos de **acentos** e **maiúsculas/minúsculas** dependem de `ILIKE` + collation do banco e
  **não mudaram** (a expressão é literalmente a mesma), mas não há teste automatizado de
  acentuação no repositório — fica como cobertura a adicionar na mission de testes.
- **Latência HTTP/página**: não medida (ver acima).

## SECURITY_AND_RLS

| Item | Antes | Depois | Impacto |
|---|---|---|---|
| `LANGUAGE` / volatilidade | `sql` / `STABLE` | `sql` / `STABLE` | nenhum |
| `SECURITY DEFINER` | `false` (**INVOKER**) | `false` (**INVOKER**) | nenhum — continua rodando como o chamador (anon/authenticated) |
| `SET search_path` | ausente | ausente | nenhum |
| `GRANT EXECUTE` | anon, authenticated, service_role, postgres | **re-aplicado explicitamente e idêntico** | nenhum |
| Tabelas lidas | `offers`, `stores`, `products` | `offers`, `stores`, `products` | **mesmo conjunto** |
| RLS | `offers`/`products`/`stores` com RLS habilitada e política `SELECT USING (true)` | inalterado | nenhuma política alterada; nenhum `BYPASSRLS`; o pushdown **não** move RLS nem usa service role |
| Colunas/tabelas novas expostas | — | — | nenhuma |
| Superfície de injeção | parâmetros tipados + `ILIKE '%' || p_search || '%'` (inalterado, e o caller escapa `%`/`_` com `escapeLikePattern`) | idêntico | nenhum |

Risco de segurança residual: **nenhum identificado**; a mudança é de *ordem de operações dentro da
própria consulta*, não de privilégio ou de visibilidade.

## MIGRATION_PLAN

**Artefato**: `supabase/migrations/20261009170000_search_products_catalog_filter_pushdown.sql`
(forward-only, `CREATE OR REPLACE`, com `COMMENT ON FUNCTION` e `GRANT EXECUTE`).

**Dependências**: nenhuma nova — nem extensão, nem índice, nem tabela. Roda em PostgreSQL 17.6 do
stack atual. `pg_trgm` **não** é necessário para esta mudança.

**Aplicação (quando aprovada)** — fora do PostgREST, como `postgres`:
```bash
sudo -n docker cp <arquivo>.sql supabase-db:/tmp/x.sql
sudo -n docker exec supabase-db psql -U postgres -v ON_ERROR_STOP=1 -f /tmp/x.sql
sudo -n docker exec supabase-db psql -U postgres -c "SELECT proname, prosecdef, provolatile FROM pg_proc WHERE proname='search_products_catalog';"
```
`CREATE OR REPLACE FUNCTION` em SQL puro é rápido (sem varredura de tabela) e não bloqueia escrita;
não há `CONCURRENTLY` envolvido. Risco de lock: apenas o lock de catálogo do `CREATE OR REPLACE`
(instantâneo).

**Rollback** (reversível, sem perda de dado): reaplicar o corpo anterior, preservado integralmente
em `supabase/migrations/20260916120000_public_catalog_visibility.sql` (a migration histórica **não**
foi alterada, conforme a política do projeto). Alternativa: `\i` daquele arquivo, que contém o
`CREATE OR REPLACE` original.

**Validação pós-aplicação** (read-only):
1. `only_old=0 only_new=0` com o harness desta missão (re-executar após aplicar, agora contra a
   função viva);
2. `EXPLAIN (ANALYZE, BUFFERS)` de categoria e de sem-filtro — esperado: `Bitmap Index Scan on
   products_category_id_idx` + agregação sobre ~1.4k linhas no filtrado, e ~500 ms no sem-filtro
   (sem piora);
3. `pg_stat_statements` da nova `queryid` por 24 h (média < 100 ms nos filtrados);
4. `/products?category=…` e `/products` renderizando com contagem correta (comparar `total_count`
   com o valor anterior).

## TEST_RESULTS

| Gate | Resultado |
|---|---|
| ESLint | **0 erros** (1 warning **pré-existente** em `scripts/comparison-forensics-audit.ts:19`) |
| `tsc --noEmit` | **PASS** |
| `npm test` | **186/186 suítes · 1401/1401 testes PASS** (baseline do `origin/main`; nenhum teste alterado) |
| `npm run build` | **PASS** (Next.js 16.2.9) |
| `npm run db:lint` | **FAILED por motivo PRÉ-EXISTENTE** — `20260829100000_merchant_authorization_records.sql` (commit `6622431`, 2026-08-28) tem um `SELECT table_name FROM information_schema.tables`. **Provado que não é meu**: a saída do `db:lint` é **idêntica** com e sem o meu arquivo de migration (executei nos dois estados). Registrado separadamente, conforme a missão. |
| Comparação de planos SQL | ✅ §QUERY_PLAN_BEFORE + planos AFTER (Bitmap Index Scan dirigindo; 1.391 linhas no `GroupAggregate`/`WindowAgg`) |
| Testes de equivalência de resultados | ✅ `EXCEPT ALL` bidirecional, 10 cenários + corpo exato da migration |

## BRANCH_AND_COMMITS

- Branch **`mission-05-7-search-rpc`**, criada de `origin/main` `1efb447`. **Mission 05.6 não incorporada** (verificado: `c43538b` não é ancestral).
- Commit (local): `perf(search): filter pushdown for search_products_catalog (migration prepared, not applied)`.
- Arquivos: `supabase/migrations/20261009170000_search_products_catalog_filter_pushdown.sql` (novo) + este relatório. **Nenhum arquivo TypeScript alterado.**
- Mission 04 preservada (arquivos não commitados intactos); P0 da 05.5 intocado; `main` **não** modificada.

## RISKS_AND_LIMITATIONS

| Risco | Materialidade | Mitigação |
|---|---|---|
| Caminho **sem filtro** não melhora (~500 ms) | Média — é a carga do crawl/SEO em `/products` | documentado; próximo passo = Estratégia B/D (decisão de produto/infra) |
| **Busca textual comum** (~650 ms) não melhora | Média — afeta `/search` via outra RPC (`search_products_global`) e `/products?q=` | idem acima; `pg_trgm` não resolve a agregação, só o matching |
| Meta de <50 ms não atingida | Baixa (é meta aspiracional) | piso estrutural: agregar ~1.4k ofertas + `count` exato |
| Migration altera `COMMENT` da função | Nenhuma | revertido junto no rollback |
| `GROUP BY product_id, created_at` | Baixa | `created_at` é funcionalmente dependente; cardinalidade provada igual (equivalência 0/0 e `total_count` idêntico) |
| **Não aplicada em ambiente algum** (sem staging/local) | Média — é a principal lacuna de validação | validada pelo corpo exato em produção read-only; plano de validação pós-aplicação acima |
| Regressão invisível em casos raros (acentos, `%`/`_` literais) | Baixa | expressão `ILIKE` **inalterada**; teste de acentuação a adicionar |

## APPROVALS_REQUIRED

1. **Aplicar a migration** `20261009170000_search_products_catalog_filter_pushdown.sql` (DDL em produção) — **não aplicada**.
2. **Deploy** — nada a deployar em app (sem mudança de TypeScript); a aprovação é a da migration.
3. **Estratégia B** (contagem separada/aproximada) — decisão de **produto** sobre `total_count`; **Estratégia D** (pré-computação/refresh) — decisão de arquitetura + política de frescor.
4. `pg_trgm` (se a busca textual for otimizada por outro caminho) — **extensão** ⇒ ADR + aprovação explícita.

## DEPLOYMENT_RECOMMENDATION

**CONDITIONAL GO.**

- **GO** para o pushdown como está: ganho comprovado e relevante nos caminhos filtrados (54–66%,
  buffers −58%), **equivalência exata** demonstrada em dados reais (`only_old=0 only_new=0`,
  `total_count` idêntico), mudança isolada em uma função, assinatura/segurança/RLS preservadas e
  rollback de uma linha (reaplicar o arquivo anterior).
- **CONDIÇÕES**: (a) aplicar em janela de baixo tráfego (o `CREATE OR REPLACE` é instantâneo, mas
  a primeira execução readquire o plano); (b) executar o harness de equivalência **depois** de
  aplicar, contra a função viva; (c) acompanhar `pg_stat_statements` por 24 h; (d) **não** empilhar
  com o deploy do offers-first (Mission 05.6) nem com a validação do P0 (05.5) — uma mudança por
  janela de observação, como nas missões anteriores.
- **NO-GO** para as metas de <50 ms e para o caminho sem filtro: exigem Estratégia B/D, que
  dependem de decisão do proprietário e não estão nesta entrega.
