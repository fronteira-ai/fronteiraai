# MISSION 05.9 — RELEASE READINESS & PRODUCTION RECOVERY

**Categoria**: `docs/operations/`
**Branch**: `mission-05-9-release-readiness` (a partir de `origin/main` = `1efb447`)
**Produção**: **READ-ONLY** em toda a missão — nenhum `DDL`/`DML`, migration, cron manual, merge, deploy, alteração de Vercel/Docker/Kong/secrets/pool, nem limpeza de alertas.
**Preservados**: Mission 04 (arquivos byte-idênticos ao snapshot) e todas as branches anteriores.
**Estado revalidado antes de agir** (2026-10-12 22:13 UTC): `origin/main = 1efb447`; branches `05` `277b44b` · `05.5` `5308237` · `05.6` `c43538b` · `05.7` `e08aa5b` · `05.8` `6367624`.

---

## 1. P0_STATUS

## `PASS`

Auditoria dos três ciclos posteriores ao deploy do P0 (Mission 05.5, `1efb447`) — **evidência real, não inferida**:

### 1.1 Execução real dos crons e GETs paginados (access log do Kong)

| Ciclo | `GET /rest/v1/marketplace_alerts` | offsets observados | `limit=1000` | `POST` (INSERTs) |
|---|---|---|---|---|
| **10/Oct 07:54** | **3** | **0, 1000, 2000** | 3/3 | **431** |
| **11/Oct 07:54** | **3** | **0, 1000, 2000** | 3/3 | **0** |
| **12/Oct 07:54** | **3** | **0, 1000, 2000** | 3/3 | **0** |

A paginação se comporta exatamente como implementada: `ceil(2.560/1000) = 3` páginas, com
`limit=1000` e offsets `0/1000/2000` — o conjunto **completo** de alertas abertos é lido em cada
execução. Antes do fix o ciclo fazia **1 GET sem `limit`** (truncado em 1.000 linhas) + **~500
POSTs** de duplicatas.

### 1.2 Novas chaves vs duplicatas

| Métrica | Valor |
|---|---|
| Linhas criadas em 10/Oct (1º ciclo pós-fix) | **431** (todas às 07:54:05) |
| Chaves **novas** criadas desde 10/Oct | **431** |
| **DUPLICATAS** criadas desde 10/Oct | **0** |
| Linhas criadas em 11/Oct | **0** |
| Linhas criadas em 12/Oct | **0** |
| `DISTINCT_KEYS` | 1.536 (09/Out) → **1.967** (+431) |
| `marketplace_alerts` total | 2.039 (pós-DELETE) → **2.991** |

**Leitura**: as 431 linhas do 1º ciclo pós-fix são **alertas legítimos** (chaves que a leitura
truncada nunca via) — `DISTINCT_KEYS` cresceu **exatamente** o mesmo número, ou seja, **nenhuma
duplicata**. Nos **dois ciclos seguintes não houve nenhum INSERT**: o dedupe agora enxerga todas
as chaves abertas e o acúmulo diário de duplicatas **parou**. (`DUPLICATES_created_since_10_Oct = 0`
confirmado por consulta de janela sobre `created_at`.)

### 1.3 Erros nos ciclos

Nenhum erro novo atribuível à varredura de alertas nos ciclos de 10–12/Oct (o endpoint
`marketplace_alerts` não aparece nos 5xx do período). Os contadores gerais do PostgREST seguem
subindo por causa **de outra classe** de consulta (ver §2/§3 e o ADR-060): `PGRST003` 55 → 67 e
`57014` 462 → **724 (+262 em 3 dias)**.

**Ressalva honesta**: o P0 corrige a *integridade de dados* (duplicatas) e o *custo de leitura* da
varredura — ele **não** é a causa nem a solução do aumento de `57014`, que vem das consultas de
catálogo/busca. Não estou atribuindo a um o problema do outro.

---

## 2. 05_6_GO_NO_GO — **GO (condicional à janela)**

Revisão da branch `mission-05-6-performance` (`c43538b`): offers-first para as duas leituras de
`price_history` (`services/price-intelligence.service.ts` e
`src/domains/canonical-catalog/infrastructure/SupabaseCanonicalPriceHistoryRepository.ts`).

| Critério | Avaliação |
|---|---|
| **Equivalência funcional** | ✅ mesma visibilidade (`stores!inner(active)` movido para o passo de `offers`), mesma ordenação no banco, mesma projeção (incl. `null` preservado), mesmo teto (`limit 3000` / cap do PostgREST), `available` intacto (ADR-008), zero filtro em JS. 11 testes de equivalência verdes. |
| **Testes / gates** | ✅ 187/187 suítes · 1409/1409 testes; lint 0 erros; typecheck PASS; build PASS (executados na Mission 05.6 nesta mesma revisão de código). |
| **Risco de URL `IN` grande** | ✅ **medido agora, desprezível**: ofertas por produto → **máx 3** (p95 = 1); ofertas por `canonical_product_id` → **máx 14** (p95 = 1); **nenhum** produto/canonical com mais de 50 ofertas. Pior caso de URL = 14 × ~37 B ≈ **518 bytes**. Nenhum chunking necessário hoje. |
| **Falha parcial** | ✅ ambos os passos degradam para vazio com log, sem lançar (testado: erro em `offers` e erro em `price_history`); conjunto vazio no 1º passo **nem consulta** `price_history`. |
| **Ganho medido** | ✅ canonical 651,4 ms/207.233 buffers → ~1,40 ms; produto 1.039,8 ms/207.235 buffers → ~0,82 ms. |
| **Risco residual** | Duas idas-e-voltas em vez de uma (≈1 ms a mais; ainda ~1000× melhor). Sem mudança de RLS/papéis. |
| **Recomendação de revisão** | Aprovar; aplicar **isoladamente** e reverter com `git revert` se necessário. |

**GO** — com a condição de entrar **sozinho** numa janela de observação (nada empilhado).

---

## 3. 05_7_GO_NO_GO — **GO (condicional à janela e à verificação pós-aplicação)**

Revisão da migration `supabase/migrations/20261009170000_search_products_catalog_filter_pushdown.sql`
(branch `mission-05-7-search-rpc`, `e08aa5b`): move os filtros de produto para dentro da agregação
da RPC `search_products_catalog`.

| Critério | Avaliação |
|---|---|
| **Privilégios e superfície** | ✅ `SECURITY INVOKER` (inalterado), `LANGUAGE sql`, `STABLE`, **sem** `SET search_path`, `GRANT EXECUTE` **re-aplicado idêntico** (anon/authenticated/service_role); mesmas tabelas lidas (`offers`/`stores`/`products`); nenhuma política de RLS tocada; nenhum `BYPASSRLS`. |
| **Regressão em consultas SEM filtro** | ⚠️ Medido: **+5%** (501,8 → 528,6 ms) e **+9%** na página 2 (469,4 → 511,4 ms), **com faixas de medição sobrepostas** (495–524 vs 525–551; 418–520 vs 411–519) — ou seja, **indistinguível dentro da dispersão** de ±12% observada. A variante de **dois** JOINs piorava de forma consistente (+23/+29%) e foi **descartada** por isso. |
| **Equivalência** | ✅ `EXCEPT ALL` bidirecional = **0/0** nos 10 cenários; e para o **texto exato** da migration: `only_old=0 only_new=0 rows=24 new_total=1391 old_total=1391` (mesmo conjunto **e** mesmo `total_count`). |
| **Ganho medido** | ✅ filtrados −54 a −66% (categoria 195,98 → 76,4 ms; buffers 5.463 → 2.309 = **−58%**); busca sem resultado −28%; meta <100 ms atingida nos filtrados; **<50 ms não atingida** (piso estrutural) e **busca textual comum não melhora** (limitação declarada). |
| **Rollback** | ✅ reaplicar o corpo anterior, preservado em `20260916120000_public_catalog_visibility.sql`; migration histórica não alterada. `CREATE OR REPLACE FUNCTION` é instantâneo e não bloqueia escrita. |
| **Risco operacional** | Baixo: uma função, sem extensão/índice/tabela nova; lock apenas de catálogo. |
| **Condição** | Rodar o harness de equivalência **depois** de aplicar (contra a função viva) + 24 h de `pg_stat_statements` + conferir `total_count` em `/products`. |

**GO** — condicional à janela isolada e à verificação pós-aplicação. Sem essas duas condições,
vira **NO-GO**.

---

## 4. PG_TRGM_ADR

**ADR preparado**: `docs/adr/ADR-060-pg-trgm-global-search-indexes.md` (**PROPOSTO**, nenhum DDL
executado). Resumo do que ele decide e avalia:

- **Problema medido**: `search_products_global` leva **3,451 ms** (> 3 s = `statement_timeout` do
  `anon`) porque o `OR replace(lower(name),' ','') ILIKE '%…%'` força `Seq Scan` de 52.674
  produtos com duas operações de string por linha — **2.994,5 ms só no filtro**.
- **Decisão proposta**: `CREATE EXTENSION pg_trgm` + 2 índices GIN (`name gin_trgm_ops` e índice
  **de expressão** `(replace(lower(name),' ','')) gin_trgm_ops`), ambos `CONCURRENTLY`.
- **Custo**: extensão sem `shared_preload`; **tamanho dos índices NÃO medido** (estimar dezenas de
  MB; medir com `pg_relation_size` após criar, contra 69 GB livres); criação em segundos
  (2 varreduras de 3.952 páginas); custo de escrita por INSERT em `products` (medir duração do
  sync antes/depois); risco de `INVALID` se o `CONCURRENTLY` for interrompido.
- **Risco operacional**: extensão nova ⇒ exige ADR + aprovação (regra do projeto); termo muito
  comum (11% das linhas) pode continuar em seq scan — comportamento aceitável; disco sob controle.
- **Plano de medição**: 6 termos antes/depois (comum, raro, inexistente, acentuado, com espaço,
  `NULL`) + `pg_stat_statements` por 24–48 h + contadores `57014`/`PGRST003` + duração do sync +
  equivalência por `EXCEPT ALL`. **Critério**: `perfume` < 3 s (hoje 3,45 s), sem mudança de
  resultado.
- **Rollback**: `DROP INDEX CONCURRENTLY` (segundos, sem perda de dado) e `DROP EXTENSION` se nada
  mais depender dela.
- **Alternativas avaliadas**: coluna materializada + trigram (mais backfill/escrita), busca por
  prefixo (muda a UX ⇒ produto), `unaccent` (muda comportamento, não é otimização), não fazer nada
  (a busca fica acima do timeout do `anon` — inaceitável para o beta).

---

## 5. DOUBLE_RPC_STATUS

**Não é possível eliminar a segunda chamada sem mudar o contrato do `total_count`; nenhum código
foi preparado.** Análise com evidência:

- **O que acontece**: em `/products`, quando a página volta vazia, `product.service.ts:417-423`
  chama a RPC **de novo** (`p_limit: 1, p_offset: 0`) apenas para ler `total_count`.
- **Por que existe**: por contrato, `total_count` viaja **em cada linha retornada**; uma página
  vazia não tem linha, logo não carrega total algum. O comentário do código já registrava isso
  ("a segunda chamada barata (1 linha) preserva o comportamento anterior") — a intenção era certa
  para o mundo em que o custo estava no número de linhas.
- **Custo real (medido agora)**: um `EXPLAIN` com `p_offset = 999999` mostra o **plano completo**
  — `WindowAgg` sobre **43.407** linhas, `HashAggregate` sobre **43.407**, `Seq Scan products`
  52.674 — **5.410 buffers**, exatamente como uma página normal. Ou seja, a segunda chamada
  **não** é barata: ela repete a agregação inteira. Uma página além do fim custa hoje **≈2× a
  agregação** (~1 s sem filtro).
- **Por que não há correção que preserve o contrato**: o total exato **exige** uma agregação; e
  como a página vazia não devolve linha, o total só pode ser obtido por *alguma* chamada. As
  alternativas honestas são:
  1. **Deixar como está e baratear a agregação** → é exatamente o que a **Mission 05.7** faz
     (categoria: 195,98 → 76,4 ms; a segunda chamada cai junto, ~2,5× mais barata nos filtrados).
  2. **Cache curto por assinatura de filtro** (sem DDL, sem mudar contrato): dedupe de sondagens
     repetidas de páginas além do fim (padrão típico de crawler seguindo links de paginação).
     Introduz política de frescor do `total_count` — decisão de produto.
  3. **RPC dedicada só de contagem** (novo contrato, não muda o `total_count` existente): exige
     a mesma agregação; ganho marginal (evita `WindowAgg` + sort + re-join), **superfície nova**.
  4. (rejeitadas) emitir linha sintética na página vazia ou aproximar o total → **mudam contrato**.
- **Decisão**: nenhuma mudança de código foi preparada — a condição da missão ("prepare código
  apenas se demonstrar equivalência") não se satisfaz com ganho relevante em nenhuma opção que
  preserve o contrato **hoje**. Com a 05.7 aplicada, o caso mais comum (filtrado) já cai para
  ~76 ms por chamada. Se depois da 05.7 a rota `/products` ainda mostrar peso relevante, a opção
  2 (cache com TTL) é a candidata de menor risco e será medida antes de implementada.

---

## 6. ROLLOUT_ORDER

**Um componente por vez, cada um com janela de observação própria.** Nada empilhado.

| Ordem | Componente | Artefato | Pré-condição | Aplicação | Métricas antes/depois | Smoke test | Rollback |
|---|---|---|---|---|---|---|---|
| **1** | **05.6 — offers-first** | branch `mission-05-6-performance` `c43538b` | GO (§2) | merge/PR pela mão do proprietário (Vercel builda) | `pg_stat_statements` das 2 `queryid` de `price_history` (média/p95), tempo de `/product/[slug]`, contadores `57014` | `/product/[slug]` responde 200 com o card de Price Intelligence; amostra de 3 produtos com/sem oferta pública | `git revert` + push (sem banco envolvido) |
| **2** | **05.7 — filter pushdown** (DDL) | migration `20261009170000_…filter_pushdown.sql` | GO (§3) **e** ordem 1 já estável | `psql -f` como `postgres` (instantâneo, fora do PostgREST) | `EXPLAIN` de categoria e sem-filtro; `pg_stat_statements` da nova `queryid` por 24 h; `total_count` em `/products` | harness `EXCEPT ALL` **contra a função viva**; `/products?category=…` e `/products` com contagem correta | reaplicar o corpo anterior (`20260916120000_public_catalog_visibility.sql`) |
| **3** | **ADR-060 + `pg_trgm` + 2 GIN** | ADR + DDL proposto | **ADR aprovado** e ordens 1–2 estáveis | `CREATE EXTENSION` + 2 `CREATE INDEX CONCURRENTLY` (janela calma, fora de transação) | 6 `EXPLAIN` de `search_products_global`; `pg_relation_size`; duração do sync; `57014`/`PGRST003` por 24–48 h | `/search?q=perfume` e `q=` raro retornando os mesmos resultados; `indisvalid = true` | `DROP INDEX CONCURRENTLY` (×2) e, se aplicável, `DROP EXTENSION` |
| **4** | **Double-RPC de `/products`** | *(nada preparado — ver §5)* | somente se, após 1–3, a mitigação mostrar materialidade | — | — | — | — |

**Marcos de sucesso da sequência**: `57014` **parando de crescer** (hoje +262 em 3 dias) e os
502/503/504 do Kong caindo; nenhuma regressão funcional em `/products`, `/search` e
`/product/[slug]`; nenhum novo pico de `PGRST003`.

**Regra transversal**: cada componente entra **sozinho** numa janela; se o componente N falhar,
reverte-se N antes de considerar N+1. Nenhuma limpeza de alertas nesta missão (proibida) — o
resíduo de 1.024 linhas pré-10/Oct continua fora de escopo.

---

## 7. APPROVALS_REQUIRED

1. **Aplicar a 05.6** (merge da branch `mission-05-6-performance` `c43538b`) — código, sem banco.
2. **Aplicar a 05.7** (DDL: `CREATE OR REPLACE FUNCTION search_products_catalog`) — na janela da ordem 2.
3. **ADR-060**: aprovar (ou rejeitar) a extensão **`pg_trgm`** e os 2 índices GIN — é a única
   dependência nova de infraestrutura desta sequência.
4. **Double-RPC** (§5): decidir se cabe a mitigação 2 (cache com TTL) — só depois de 1–3 medidos.
5. **Fechamento do item P0 da Mission 05.5** — a evidência de §1 sustenta o fechamento daquele
   item (duplicatas pararam; paginação confirmada nos 3 ciclos).
6. (Fora do escopo desta missão, registrado) o resíduo de **1.024** alertas espúrios pré-10/Oct
   segue exigindo autorização explícita para limpeza — **nada foi feito**.

**Bloqueios encontrados**: nenhum. Nenhuma ação proibida foi executada; nenhuma evidência foi
inventada — todas as medições foram read-only em produção (`EXPLAIN (ANALYZE, BUFFERS)`, `psql`
SELECT, `docker logs`), sem criar arquivos no host.
