# CANONICAL_EXCEPTION_REPORT.md
# PROGRAM Δ — Mission Ω-4.1 — Produtos Sem Canonical (Exceções)

**Categoria**: `docs/product/` (companion de Program Ω)
**Data**: 2026-07-08

---

## Resultado: zero exceções

650 de 650 produtos processados com sucesso. 0 falhas relatadas pelo script (`Failed: 0`). Nenhum produto permaneceu sem `canonical_products` correspondente após a execução.

Este é o resultado esperado dado que:
- Todo produto em `products` tem `slug` (obrigatório, único) — o único pré-requisito real do bootstrap (`canonical_slug = products.slug`).
- Nenhum produto tem `brand_id`/`category_id`/`image_url` que impedisse a criação — mesmo os 2 produtos sem imagem (`KPI_BASELINE.md`) foram processados normalmente, porque `image_url` é opcional em `canonical_products` (`image_url text`, nullable).
- O único produto órfão (sem nenhuma oferta, `KPI_BASELINE.md`) também recebeu um canonical normalmente — a criação de canonical não depende de o produto ter oferta.

## Por que isso é diferente de "zero produtos precisam de atenção"

Cobertura 100% não é o mesmo que qualidade 100%. Duas categorias de atenção futura, nenhuma delas uma "exceção" desta execução:

1. **Fragmentação de marca/categoria** (já nomeada em `KPI_BASELINE.md`) — 140 marcas e 175 categorias para 650 produtos. Um produto com `brand_id` apontando para uma marca fragmentada (ex.: "Cuisinart" grafado de duas formas) recebeu um canonical válido tecnicamente, mas esse canonical herda a fragmentação da fonte. Isso não é uma falha desta Wave — está fora do escopo de bootstrap 1:1 corrigir dado de origem.
2. **`price_usd` incorreto do parser Shopping China** (`docs/engineering/TECH_DEBT.md`, bug pré-existente — preço em Guarani gravado como se fosse USD) — produtos dessa loja receberam canonical normalmente; o bug de moeda não impede canonicalização, mas contaminaria qualquer comparação de preço feita sobre esse canonical. Fora do escopo desta missão corrigir (é um bug de parser, não de canonicalização).

Nenhuma das duas é uma "exceção de processamento" — ambas são qualidade de dado de origem, herdada, não introduzida por este bootstrap.

## Produtos Requiring Manual Review

**0** — porque nenhum `MergeCandidate` foi gerado (ver `MERGE_CANDIDATES_REPORT.md`), não há fila de revisão humana pendente hoje. Esse número deve ser reinterpretado, não como "está tudo perfeito", mas como "nada foi sinalizado pela heurística atual para revisão" — uma leitura mais cautelosa está em `MERGE_CANDIDATES_REPORT.md`.
