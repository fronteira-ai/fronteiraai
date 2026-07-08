# MERGE_CANDIDATES_REPORT.md
# PROGRAM Δ — Mission Ω-4.1 — Geração de Candidatos de Merge

**Categoria**: `docs/product/` (companion de Program Ω)
**Data**: 2026-07-08

---

## Resultado

- **650 avaliações rodadas** (`suggestMergesFor` chamado uma vez por canonical product criado ou pré-existente, dentro do loop principal do bootstrap)
- **0 `MergeCandidate` escritos**, em qualquer status

## O que a engine realmente fez, passo a passo (`CanonicalMergeSuggestionService.suggestMergesFor`)

Para cada canonical product:
1. Busca todos os outros canonical products **da mesma marca** (`findByBrandId`).
2. Se não há nenhum outro da mesma marca, encerra sem escrever nada (no-op silencioso, não é uma falha).
3. Se há candidatos, roda o `ProductIdentityEngine.evaluate()` contra todos eles.
4. Só escreve um `MergeCandidate` se a confiança do melhor resultado atingir pelo menos o tier `possible` (`CONFIDENCE_THRESHOLDS.possible`).
5. Mesmo então, só se um candidato para o mesmo par não existir ainda (idempotência).

Zero resultados em 650 execuções significa: ou nenhum produto tinha "outro produto da mesma marca" no catálogo (marca com um único produto), ou havia outros da mesma marca mas nenhum atingiu o threshold de confiança mínimo.

## Interpretação — duas hipóteses, nenhuma confirmada nesta execução

**Hipótese 1 — o catálogo genuinamente não tem duplicatas hoje.** Suportada pela amostra observada durante o dry-run: produtos da marca "Cuisinart" incluíam uma cafeteira, um moedor de café, uma faca elétrica, uma pipoqueira, uma balança de cozinha — todos genuinamente produtos diferentes, não o mesmo produto listado duas vezes. Com apenas 4 conectores cobrindo categorias majoritariamente não sobrepostas (achado de `PRODUCTION_BASELINE_1.9.md`), a probabilidade a priori de duplicata real é baixa neste estágio de densidade do catálogo.

**Hipótese 2 — o threshold de confiança está mais conservador do que deveria, ou os produtos de mesma marca no catálogo simplesmente não compartilham atributos suficientes para o engine reconhecer.** Não descartável sem uma auditoria manual de uma amostra de pares mesma-marca — não feita nesta execução (estaria fora do escopo: "nenhuma heurística deve ser alterada antes da execução do baseline completo", e uma auditoria de tuning já seria o primeiro passo em direção a alterar heurística).

## Por que este relatório não escolhe entre as duas hipóteses

O mandato desta missão é explícito: "a recomendação deve ser fundamentada em evidências produzidas nesta execução, nunca em hipóteses." Esta execução produziu a contagem (0) e o mecanismo confirmado como funcionando sem erro (0 falhas, 650 avaliações completas) — mas não produziu a auditoria manual de amostra que permitiria escolher entre Hipótese 1 e 2 com confiança. Apresentar uma escolha aqui seria exatamente o tipo de conclusão-por-hipótese que o mandato pede para evitar.

## Confidence Distribution

Não aplicável — nenhum candidato foi criado, portanto não existe distribuição de confiança para reportar. Isto é diferente de "distribuição vazia por baixa confiança geral": a métrica de confiança só é persistida quando um `MergeCandidate` é de fato escrito (`confidence` é uma coluna de `merge_candidates`, não computada/logada separadamente pelo script para os casos abaixo do threshold). Uma limitação real de observabilidade, não desta execução, mas do desenho atual do script — nomeada aqui, não corrigida (corrigir exigiria alterar o script, fora do escopo desta missão).

## Duplicate Groups

0 — decorre diretamente de 0 `MergeCandidate`. Nenhum grupo de duplicatas foi identificado porque nenhum par atingiu o critério de agrupamento.

## Recomendação para uma Wave futura (não executada aqui)

Se a Hipótese 2 precisar ser testada, o caminho de menor risco é uma auditoria manual de amostra — pegar as marcas com mais produtos (ex.: as top 10 de 140) e revisar visualmente se há duplicatas reais não capturadas. Isso é trabalho de leitura, não de código, e não altera heurística nem promove Shadow Mode — pode ser feito antes de qualquer decisão sobre ajustar o `ProductIdentityEngine`.
