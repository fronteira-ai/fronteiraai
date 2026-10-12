# ADR-060 — Índices trigram (`pg_trgm`) para a busca global

**Data**: 2026-10-12
**Status**: **PROPOSTO** — aguardando aprovação do proprietário. Nenhum DDL executado.
**Categoria**: `docs/adr/`
**Missão de origem**: Mission 05.9 (Release Readiness), a partir da medição da Mission 05.8.
**Decisão em uma linha**: habilitar a extensão `pg_trgm` e criar dois índices GIN em `products`
para que a busca global (`search_products_global`) deixe de varrer 52.674 linhas por chamada.

---

## 1. Contexto e evidência

`search_products_global(p_term, p_limit, p_offset)` é a RPC da busca do consumidor
(`/search`, caller único em `services/search.service.ts:117`). Medição read-only em produção
(2026-10-12, `EXPLAIN (ANALYZE, BUFFERS)`, função viva):

```
Limit (actual time=3451.855..3451.889 rows=5)                   <-- 3,45 s
  CTE matches -> Seq Scan on products p (actual time=0.702..2994.538 rows=6335)
        Filter: ((name ~~* '%perfume%') OR (replace(lower(name),' ','') ~~* '%perfume%'))
        Rows Removed by Filter: 46339                            <-- 52.674 linhas varridas
  -> Sort(top-N) -> WindowAgg(5.692) -> Hash Join(5.692)
```

- **2.994,5 ms apenas no nó de filtro**, com **duas operações de string por linha** (`ILIKE`
  case-insensitive + `replace/lower`).
- **3.451 ms > 3.000 ms = `statement_timeout` do papel `anon`** ⇒ a busca pública está,
  estruturalmente, acima do limite para termos comuns; quando estoura, `search.service.ts`
  degrada para resultado vazio (o erro é logado).
- Nenhum índice btree serve `%…%`; a segunda condição é **função de coluna**, portanto
  inindexável por índices comuns.
- Contexto: `57014` (statement timeout) subiu de 462 para **724 (+262 em 3 dias)**; é a classe de
  erro que segura conexão do pool de 10 e produz os 502/503/504 do Kong.

## 2. Decisão proposta

```sql
-- 1) EXTENSÃO (mudança de schema; exige este ADR + aprovação explícita)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2) ÍNDICES (CONCURRENTLY: sem bloqueio de escrita; fora de transação)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_nospace_trgm
  ON public.products USING gin ((replace(lower(name), ' ', '')) gin_trgm_ops);
```

O segundo índice é **de expressão** e existe para a condição `replace(lower(name),' ','') ILIKE
'%…%'` — sem ele, metade do predicado continua forçando varredura completa. Com os dois, o `OR`
tende a virar `BitmapOr` de dois index scans.

## 3. Custo

| Dimensão | Avaliação |
|---|---|
| Extensão | `pg_trgm` não exige `shared_preload_libraries`; apenas `CREATE EXTENSION` (rápido). É a única dependência nova. |
| Tamanho dos índices | **Não medido** (criar em produção é proibido nesta missão). Estimativa: `products` tem 52.674 linhas e 3.952 páginas (~31 MB de heap); dois índices GIN de trigrama sobre `name`/expressão ficam tipicamente na **mesma ordem de grandeza do heap indexado** ⇒ ordem de **dezenas de MB** no total. **Medir com `pg_relation_size` imediatamente após criar e comparar com o disco livre (69 GB hoje).** |
| Criação | `CONCURRENTLY` = 2 varreduras da tabela + construção do GIN. Com 3.952 páginas e cache quente, **segundos** por índice. Não bloqueia escrita; **não** pode rodar em transação; se for interrompido deixa índice `INVALID` (que só pode ser removido com `DROP INDEX CONCURRENTLY`). |
| Escrita | GIN tem custo por INSERT/UPDATE em `products`, mitigado por *fastupdate* (pending list). O caminho de escrita é o sync dos conectores (volume intermitente); **medir a duração do sync** antes/depois. |
| Manutenção | GIN pode acumular pending list; autovacuum já roda no banco. Monitorar bloat e tamanho do índice após um ciclo completo de sync. |
| Plano | Para termos muito comuns (ex.: `perfume` → 5.692 de 52.674 ≈ 11%), o planner pode ainda preferir varredura sequencial — **comportamento aceitável** (é a escolha correta nesse caso). O ganho vem dos termos seletivos e raros, que hoje pagam o mesmo custo do termo comum. |

## 4. Risco operacional

| Risco | Severidade | Mitigação |
|---|---|---|
| Extensão nova no banco de produção | Média (regra do projeto: extensão ⇒ ADR + aprovação) | este ADR; `CREATE EXTENSION` é reversível com `DROP EXTENSION` se nada depender dela |
| Índice `INVALID` por interrupção do `CONCURRENTLY` | Média | executar em janela calma, fora de transação, com `ON_ERROR_STOP=1`; verificar `pg_index.indisvalid`; se inválido, `DROP INDEX CONCURRENTLY` e refazer |
| Escolha ruim de plano (índice em termo muito comum) | Baixa | comportamento fica igual ou melhor; medir os 6 cenários abaixo |
| Aumento de latência de escrita no sync | Baixa/Média | medir a duração do sync antes/depois; se piorar de forma relevante, considerar `DROP INDEX` (rollback) |
| Disco | Baixa | 69 GB livres; medir tamanho real após criar |

## 5. Plano de medição (antes/depois)

1. **Antes** (já registrado): `EXPLAIN (ANALYZE, BUFFERS)` de `search_products_global` com
   6 termos — comum (`perfume`), raro, inexistente (`zzzzquimera`), acentuado, com espaço, e
   `NULL` — mais `pg_stat_statements` da `queryid` por 24 h.
2. **Depois** (imediatamente após criar os índices): os mesmos 6 `EXPLAIN` + `pg_relation_size`
   dos 2 índices + `pg_index.indisvalid`.
3. **24–48 h depois**: `pg_stat_statements` (média/p95 da `queryid`), contadores de `57014` e
   `PGRST003`, e o tempo de execução do sync dos conectores.
4. **Equivalência de resultados**: a expressão `ILIKE`/`replace` é **inalterada** pela criação de
   índice (índices não mudam semântica); ainda assim, comparar o conjunto retornado antes/depois
   com o harness `EXCEPT ALL` bidirecional já usado nas Missões 05.7/05.9.
5. **Critério de sucesso**: `search_products_global('perfume')` **abaixo de 3 s** (hoje 3,45 s) e,
   idealmente, na casa das centenas de ms; termos raros na casa dos ms; **nenhuma** mudança no
   conjunto de resultados; nenhuma piora relevante no sync.

## 6. Rollback

```sql
DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_products_name_nospace_trgm;
-- só remover a extensão se nada mais depender dela:
-- DROP EXTENSION IF EXISTS pg_trgm;
```
Reversível em segundos por índice, sem perda de dado. O rollback também reverte o custo de
escrita.

## 7. Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| **Coluna materializada** `name_normalized` (trigger/sync) + trigram sobre ela | mesmo requisito de extensão, **mais** backfill + caminho de escrita novo |
| **Busca por prefixo** (`ILIKE 'term%'`) com btree `text_pattern_ops` | **muda a experiência** (perde a busca no meio da string) ⇒ decisão de produto |
| **`unaccent` + trigram** | resolveria acentos, mas `ILIKE` hoje também não normaliza acentos ⇒ seria mudança de comportamento, não otimização; fica como melhoria futura separada |
| **Não fazer nada** | a busca do consumidor está acima do timeout do `anon` (3 s) e degrada silenciosamente para vazio nos termos comuns — não é aceitável para o beta |

## 8. Decisão solicitada

Aprovar (ou rejeitar) **a extensão `pg_trgm` + os dois índices GIN** e a janela de aplicação.
Sem essa aprovação, a busca global permanece com o plano medido (3,45 s, acima do timeout do
papel `anon`).
