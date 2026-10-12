# MISSION 05.8 — SEARCH EXPERIENCE & QUERY EFFICIENCY

**Categoria**: `docs/operations/`
**Branch**: `mission-05-8-search-efficiency` (a partir de `origin/main` = `1efb447`; Missions 05.6 e 05.7 **não** incorporadas)
**Produção**: **READ-ONLY** — nenhum DDL/DML, migration, RLS, secret, cron, Docker, Kong, Vercel, restart, pool, timeout ou memória alterados.
**⚠️ Briefing truncado**: a mensagem recebida termina em "Verificar o estado atual" (§0). As seções §1–§12 (isolamento, entregáveis, DoD, proibições) **não chegaram**. Trabalhei sob os guardrails idênticos das Missões 05.5–05.7 (produção read-only, branch isolada, nenhuma publicação) e a missão declarada: *eliminar consultas redundantes, investigar e otimizar a busca global, preparar melhorias mensuráveis*.

---

## 1. VERIFICAÇÃO DO ESTADO ATUAL (primeira ação do briefing)

**Data/hora**: 2026-10-12 15:09 UTC.

| Item | Estado verificado |
|---|---|
| `origin/main` | **`1efb447`** (inalterado) |
| Branches publicadas | `mission-05-performance-recovery` `277b44b` · `mission-05-5-alert-pagination` `5308237` · `mission-05-6-performance` `c43538b` · `mission-05-7-search-rpc` `e08aa5b` |
| Branch local de trabalho | `mission-05-8-search-efficiency` @ `1efb447` (05.6/05.7 **não** incorporadas — verificado por ancestralidade) |
| Mission 04 | **preservada**: `app/sitemap.ts` e `components/compare/CompareOfferCard.tsx` **byte-idênticos** ao snapshot da sessão; 3 arquivos não rastreados presentes |
| `main` local | não modificada (nenhum merge) |

### 1.1 P0 da Mission 05.5 — **validação de runtime CONFIRMADA** (item que estava pendente)

| Métrica | 09/Out (pós-DELETE) | **12/Out (agora)** | Leitura |
|---|---|---|---|
| `marketplace_alerts` total | 2.039 | **2.991** | +952 |
| `DISTINCT_KEYS` | 1.536 | **1.967** | **+431 = exatamente o crescimento de linhas** |
| `last_alert_created_at` | 2026-10-09 07:55 | **2026-10-10 07:54:52** | última criação há **2 dias** |
| linhas criadas nas últimas 36 h | — | **0** | cobre **dois** ciclos diários (11/10 e 12/10) |

**Conclusão**: no primeiro ciclo pós-deploy (10/10 07:54) a varredura inseriu **431 linhas com chaves NOVAS** (`DISTINCT_KEYS` cresceu exatamente 431 — **nenhuma duplicata**), e nos **dois ciclos seguintes não inseriu nada**. A paginação de `listOpen()` está funcionando: o conjunto lido é completo, o dedupe enxerga todas as chaves abertas e o acúmulo diário de duplicatas **parou**. As 431 chaves novas são alertas legítimos que a leitura truncada nunca via (o teste de regressão da 05.5 cobria exatamente esse caso). **P0 = VALIDADO em runtime.**

### 1.2 Degradação de performance em curso (motiva esta missão)

| Contador | 09/Out | **12/Out** | Δ |
|---|---|---|---|
| `PGRST003` (pool timeout) | 55 | **67** | +12 |
| `57014` (**statement timeout**) | 462 | **724** | **+262 em 3 dias** |

Bursts de erro: 10/Out 23:48–49 (53), 11/Out 16:15 (7), 12/Out 02:48 (22) e uma **faixa sustentada em 12/Out 11:56–12:44** (~100 erros em ~50 min, de 1 a 8 por minuto). Por endpoint desde 10/Out: **`search_products_catalog` 21** ocorrências de erro; `search_products_global` 2. Ou seja: o problema é **contínuo**, não um pico único.

---

## 2. CONSULTAS REDUNDANTES (objetivo 1)

### 2.1 Confirmada: **duas agregações completas por página vazia** em `/products`

`services/product.service.ts:417-423` — quando a página volta sem linhas, o caller chama a RPC **de novo** (`p_limit: 1, p_offset: 0`) só para obter `total_count`:

```ts
if (rankedRows.length === 0) {
  const { data: probe } = await supabase.rpc("search_products_catalog", { ...rpcArgs, p_limit: 1, p_offset: 0 });
  const total = ((probe ?? []) as { total_count: number }[])[0]?.total_count ?? 0;
  ...
}
```

Com o plano atual da RPC, **cada chamada agrega o catálogo inteiro** — então uma página além do fim (ou um filtro sem resultado) custa **duas** agregações (~500 ms cada ≈ **1 s** de banco por page view). O comentário no código diz "segunda chamada barata (1 linha)" — a intenção era correta (o PostgREST antigo devolvia o `count` com 0 linhas), mas **com `count(*) OVER ()` a chamada não é barata: o custo está na agregação, não nas linhas devolvidas**.

**Correção preparada (não aplicada)**: eliminar a segunda chamada. Opções, em ordem de preferência:
- **(a)** a RPC devolver `total_count` mesmo com página vazia (é o comportamento "original") — hoje ela não devolve linha nenhuma, e é *por isso* que o caller repete a chamada. Alteração pequena de SQL: emitir uma linha com `total_count` e `product_id = NULL` quando `p_offset >= total`… porém isso muda o contrato de retorno (o caller teria de aceitar uma linha sintética) → **decisão de produto/contrato**.
- **(b)** mover a contagem para uma consulta **separada e barata** (Estratégia B da Mission 05.7) usada **apenas** no caminho de página vazia.
- **(c)** cachear por combinação de filtros (Estratégia D).
Nenhuma foi aplicada: (a) e (b) mudam contrato/arquitetura e dependem do proprietário.

### 2.2 Inventário de redundância no caminho de busca (por leitura de código)

| Local | Redundância | Custo | Nota |
|---|---|---|---|
| `product.service.ts:417-423` | 2ª chamada à RPC quando a página está vazia | ~1 agregação completa extra (~500 ms) | **confirmada acima** |
| `product.service.ts:436-440` | após a RPC, nova consulta a `products` com `offers!left(...)` para os 24–48 ids | baixa (`.in("id", …)` por PK) | **necessária** (hidratação), não é redundância |
| `/product/[slug]` (`_cache.ts`) | `cache()` do React é **por requisição**: um crawl repete as mesmas leituras a cada render | ~5–8 queries por página crawleada | mitigaria com cache entre requisições (trade-off de frescor — Mission 05.4 §6.4) |
| `/search` (`search.service.ts:117`) | 1 chamada a `search_products_global` por seção + fallback em erro | ver §3 (a chamada é **caríssima**) | `RESULTS_PER_SECTION` sugere múltiplas seções por página → N chamadas do RPC mais caro do sistema |

---

## 3. BUSCA GLOBAL — `search_products_global` (objetivo 2)

### 3.1 Contrato atual (verificado, não presumido)

```sql
search_products_global(p_term text DEFAULT NULL, p_limit integer DEFAULT 8, p_offset integer DEFAULT 0)
RETURNS TABLE(product_id uuid, lowest_price_usd numeric, has_stock boolean, total_count bigint)
LANGUAGE sql STABLE
```
Caller único: `services/search.service.ts:117` (`/search`), com `p_limit: RESULTS_PER_SECTION`.

### 3.2 ROOT_CAUSE (medido, read-only)

`EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM search_products_global('perfume', 5, 0)`:

```
Limit  (actual time=3451.855..3451.889 rows=5 loops=1)          <-- 3,45 SEGUNDOS
  Buffers: shared hit=5413 read=55
  CTE matches
    ->  Seq Scan on products p (actual time=0.702..2994.538 rows=6335 loops=1)
          Filter: ((name ~~* '%perfume%') OR (replace(lower(name),' ','') ~~* '%perfume%'))
          Rows Removed by Filter: 46339        <-- 52.674 linhas varridas
          Buffers: 3897 hit + 55 read
  -> Sort (top-N) -> WindowAgg (5.692 linhas) -> Hash Join (5.692)
```

**Causa**: o predicado `p.name ILIKE '%term%' OR replace(lower(p.name),' ','') ILIKE '%term%'`
força **varredura completa de `products`** (52.674 linhas) com **duas operações de string por linha** (`ILIKE` case-insensitive + `replace/lower`) — **2.994,5 ms apenas no nó de filtro**, 46.339 linhas descartadas. Nenhum índice btree pode servir `%…%`; a segunda expressão é função de coluna, o que a torna inindexável por índices comuns. O `WindowAgg` (5.692) e o `Hash Join` somam o resto.

**Consequência operacional**: **3.451 ms > 3.000 ms = `statement_timeout` do papel `anon`** — a busca global do consumidor está, estruturalmente, **acima do limite** para termos comuns; quando estoura, `search.service.ts` degrada para resultado vazio (o erro é logado). É o mesmo mecanismo que segura conexão do pool de 10 e produz os 504/502 vistos no Kong.

### 3.3 SEARCH_RPC_OPTIMIZATION_PLAN (preparado, NÃO aplicado)

| # | Ação | Ganho esperado | Dependência |
|---|---|---|---|
| **G-A** | `CREATE EXTENSION pg_trgm` + `CREATE INDEX ... USING gin (name gin_trgm_ops)` + **índice de expressão** `USING gin (replace(lower(name),' ','') gin_trgm_ops)` → o `OR` vira `BitmapOr` de dois index scans | de 3.451 ms para ordem de **milissegundos** para termos comuns | **extensão** ⇒ exige ADR + aprovação explícita (regra do projeto) |
| **G-B** | Coluna materializada `name_normalized` (= `replace(lower(name),' ','')`) mantida por trigger/sync + índice trigram sobre ela | mesmo ganho, sem expressão no predicado | migration com escrita + backfill ⇒ aprovação |
| **G-C** | Remover a 2ª condição (busca só por `name`) | ~metade do custo do filtro | **muda semântica** (perde a tolerância a espaços) ⇒ decisão de produto |
| **G-D** | `total_count` exato sobre 5.692 → manter, mas agora barato com G-A; se não houver G-A, avaliar contagem aproximada | — | decisão de produto |
| **G-E** | Reduzir N chamadas: uma única chamada por página de busca, seccionando no cliente | elimina chamadas repetidas do RPC mais caro | decisão de produto/UI |

**Migration preparada (para revisão — NÃO executada)**:

```sql
-- NÃO APLICADA. Fora de supabase/migrations/ por ora: depende da aprovação da
-- extensão (ADR) — ver APPROVALS_REQUIRED.
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;                       -- extensão: exige ADR

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_nospace_trgm
  ON public.products USING gin ((replace(lower(name), ' ', '')) gin_trgm_ops);

-- Rollback: DROP INDEX CONCURRENTLY IF EXISTS <nome>;  (e, se a extensão for
-- revertida, DROP EXTENSION pg_trgm — só se nada mais depender dela)
```

**Não mudar o plano sem medir**: a validação da G-A exige a extensão + os índices criados; como a produção é read-only nesta missão, **o ganho é estimado a partir da anatomia do plano** (o nó que custa 2.995 ms é exatamente o que um índice trigram substitui por um bitmap scan) e **deve ser medido após a aplicação** — declarado como limitação, não como resultado.

---

## 4. MELHORIAS MENSURÁVEIS PREPARADAS (resumo)

| # | Melhoria | Ganho esperado | Estado | Depende de |
|---|---|---|---|---|
| M1 | Filter pushdown da `search_products_catalog` | **−54 a −66%** e buffers −58% nos filtrados (**medido**, Mission 05.7 `e08aa5b`) | migration **preparada, não aplicada** | aprovação (DDL) |
| M2 | pg_trgm + 2 índices trigram para a busca global | de 3.451 ms → ordem de ms (estimado pela anatomia do plano) | plano + SQL preparados | **ADR + aprovação da extensão** |
| M3 | Eliminar a 2ª chamada da RPC em página vazia | −1 agregação completa (~500 ms) por página vazia | 3 opções documentadas, nenhuma aplicada | decisão de contrato/produto |
| M4 | Seccionar a busca em 1 chamada por página | remove chamadas repetidas do RPC mais caro | documentado | decisão de produto/UI |

**Impacto cruzado esperado quando M1+M2 estiverem aplicadas**: os dois planos mais caros do banco saem da faixa de timeout do `anon` (3 s), o que deve reduzir os `57014` (hoje +262 em 3 dias) e, por consequência, os 502/503/504 do Kong — mas **isso é hipótese a medir**, não resultado.

---

## 5. TEST_RESULTS / QUALITY

- **Nenhum arquivo de código foi alterado nesta missão** (só documentação) ⇒ os gates permanecem os do `origin/main`: ESLint 0 erros (1 warning pré-existente em `scripts/comparison-forensics-audit.ts:19`), `tsc --noEmit` PASS, **186/186 suítes · 1401/1401 testes**, build PASS, e `db:lint` FAILED por motivo **pré-existente** (`20260829100000_merchant_authorization_records.sql`, commit `6622431` — provado na Mission 05.7 que a saída é idêntica com e sem migration nova).
- **Medições**: `EXPLAIN (ANALYZE, BUFFERS)` read-only em produção + contadores de log; nenhuma carga sintética; nenhum arquivo criado no host.

## 6. BRANCH_AND_COMMITS

- Branch `mission-05-8-search-efficiency` (de `1efb447`), commit deste relatório. Sem merge, sem deploy, sem DDL/DML.
- Mission 04 preservada; P0 da 05.5 intocado; `main` não modificada.

## 7. RISKS_AND_LIMITATIONS

| Risco / limitação | Nota |
|---|---|
| **Briefing truncado** | §1–§12 ausentes; escopo executado = objetivos declarados no título + §0. Se houver requisitos específicos (entregáveis/DoD/proibições), reenviar e eu completo. |
| Ganho da G-A é **estimado**, não medido | medir após criar extensão+índices (a produção é read-only aqui) |
| `pg_trgm` aumenta o custo de escrita/armazenamento | 2 índices GIN em `products` (52,6k linhas) — impacto modesto, mas real; medir tamanho após criar |
| M3/M4 mudam contrato/UI | exigem decisão de produto |
| `57014` crescendo (+262/3 dias) | é o risco operacional mais urgente; M1/M2 atacam as duas consultas dominantes |

## 8. APPROVALS_REQUIRED

1. **M1** — aplicar a migration da Mission 05.7 (`20261009170000_search_products_catalog_filter_pushdown.sql`).
2. **M2** — decidir sobre **`pg_trgm`** (extensão ⇒ **ADR**) e, se aprovado, criar os 2 índices.
3. **M3** — decidir o contrato da página vazia (`total_count` sem linhas / contagem separada / cache).
4. **M4** — decidir se a busca passa a fazer 1 chamada por página.
5. Deploy das branches 05.6 (offers-first) / 05.7 (pushdown) — continua pendente do proprietário.

## 9. DEPLOYMENT_RECOMMENDATION

**CONDITIONAL GO** para M1 (já medida na 05.7) e **GO condicionado ao ADR** para M2 — nessa ordem, uma mudança por janela, e nenhuma delas empilhada com o deploy do offers-first (05.6). **M3/M4: NO-GO** até decisão de produto. **P0 da 05.5: validado em runtime, recomendação de fechamento daquele item.**
