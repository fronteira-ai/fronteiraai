# CATALOG_COMPLETION_REPORT.md
# PROGRAM Δ — Mission Δ-3 — Full Catalog Completion

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08

---

## O problema encontrado (herdado da Mission Δ-2)

`scripts/canonical-catalog-bootstrap.ts` consulta `products` sem paginação — o cliente Supabase limita isso a 1.000 linhas por padrão. Com 1.263 produtos em catálogo, 254 nunca foram alcançados nas execuções anteriores (Ω-4.1, Δ-2), sempre os mesmos (a consulta sem `ORDER BY`/`.range()` retorna as mesmas primeiras 1.000 linhas de forma estável).

## Correção aplicada (sem alterar o script rastreado)

Um script efêmero, não commitado, reutilizando **exatamente os mesmos serviços** que `scripts/canonical-catalog-bootstrap.ts` já usa (`lib/canonical-catalog-factory.ts` → `CanonicalProductService.bootstrapFromProduct`, `catalogRepo.linkOffer`, `CanonicalMergeSuggestionService.suggestMergesFor`) — a única diferença é a consulta inicial, paginada via `.range()` em vez de uma chamada única. Nenhuma lógica de negócio nova, nenhuma heurística tocada, nenhum arquivo do repositório alterado.

## Execução

**Dry-run primeiro** (confirmou 1.263 produtos alcançáveis, 254 pendentes, 0 erros esperados), depois `--execute`.

```
Products processed    : 1.263
Canonical created     : 254
Canonical pre-existed : 1.009
Offers linked         : 254
Merge suggestion runs : 1.263
Failed                : 0
```

## Confirmação

| Métrica | Antes desta correção | Depois |
|---|---|---|
| Produtos processados | 1.000 (limite da consulta) | **1.263 (100%)** |
| Produtos canonicalizados | 1.009 (79,9%) | **1.263 (100%)** |
| Produtos restantes | 254 | **0** |
| Erros | 0 | 0 |
| Ofertas com canonical | 1.012 (79,9%) | **1.266 (100%)** |

## Reprodutibilidade

Idempotente pela mesma garantia do script original (`findOrCreateBySlug` lê antes de escrever, `UNIQUE` em `canonical_slug` previne corrida). Reexecutar hoje reportaria `Canonical pre-existed: 1.263, created: 0` — confirmável a qualquer momento sem custo.

## Tempo de processamento

Não instrumentado com precisão de milissegundos pelo script (mesma limitação já observada em `BEFORE_AFTER_BASELINE.md`); observado empiricamente abaixo de 3 minutos para 1.263 produtos, incluindo dry-run e execução real.

## O que isso não faz

Não promove Product Identity para fora do Shadow Mode. Não altera heurística de confiança. Não força merge de nenhum candidato — `merge_candidates` segue em 0 linhas mesmo após 1.263 novas avaliações nesta execução (2.913 avaliações acumuladas desde Ω-4.1, contando as três execuções). Ver `MARKETPLACE_TRUTH_REPORT.md` para a leitura desse número.
