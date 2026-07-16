# MARKETPLACE_FEEDBACK_LOOP.md
# Program Φ (Phi) — Mission Φ-1 — Continuous Comparability Optimization

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Status**: Ciclo operacional proposto — reaproveita 100% de infraestrutura já existente (scripts read-only + engines já certificados). Nenhuma automação nova foi construída por esta Mission; o ciclo abaixo é reproduzível manualmente hoje mesmo, com os comandos já existentes.

---

## O ciclo (6 passos, nenhum manual em sua medição)

```
Dados               → estado real em products/offers/canonical_products/merge_candidates/merge_executions/categories
  ↓
Análise             → npm run observatory:report + npm run cpc:report + kappa2/3-*-audit.ts + merge-audit-report.ts
  ↓
Correção            → decisão humana explícita (aprovar merge_candidates, autorizar backfill, priorizar wiring)
  ↓
Reprocessamento     → MergeExecutorService.execute() / migration de backfill / sync de conector
  ↓
Nova medição        → mesmos scripts, mesma fórmula (MARKETPLACE_KPIS.md) — nunca uma fórmula diferente para "provar" progresso
  ↓
Comparação histórica → diff contra a baseline anterior (este documento + MARKETPLACE_OPTIMIZATION.md), nunca contra uma meta abstrata
  ↓
Nova priorização    → Auto Prioritization (§ abaixo) recalcula "onde trabalhar amanhã" com o dado novo
```

Nenhum passo depende de julgamento subjetivo sobre "o que melhorou" — cada um é a saída determinística de um script já existente. A única decisão humana no ciclo é o passo 3 (Correção): aprovar um `merge_candidate`, autorizar um backfill de migration, ou priorizar o wiring de uma camada já construída. Isso é deliberado — preserva o Shadow Mode permanente (`RELEASE_2_FOUNDATION_COMPLETE.md` §5): nada muda o catálogo sem uma decisão humana registrada.

---

## Auto Prioritization — regras objetivas, sem IA

Cada regra abaixo responde "onde trabalhar amanhã" com uma fórmula sobre dado já medido — nenhuma é um modelo, todas são ordenações determinísticas.

### Regra 1 — Categoria mais degradada
`ORDER BY (produtos com oferta) DESC` entre categorias com `Category-Product Coverage = 0` (categorias que existem mas nunca tiveram produto real vinculado). Hoje: **918 das 929 categorias (98,8%)** estão nessa condição — a maioria é ruído histórico de import per-merchant, não trabalho real pendente. Regra prática: só considerar as top-N categorias por `products.category_id` bruto (mesmo sem `canonical_products` ainda), porque são as que geram merge_candidates reais na próxima sincronização.

### Regra 2 — Merchant com maior impacto potencial
`ORDER BY offers_count DESC` entre merchants com overlap real 0 hoje. Aplicando ao dado atual: **roma-shopping** (1.564 ofertas, overlap real = 0 com todos os outros 4 merchants substanciais) é o maior ganho de CPC potencial disponível sem nenhuma sincronização nova — os produtos já estão no catálogo, só não foram pareados.

### Regra 3 — Atributo mais ausente
`ORDER BY frequência DESC` entre chaves de `specifications` fragmentadas por caixa/idioma (`Modelo`/`MODELO`/`modelo` = 5.231+5.115+1 ocorrências que já deveriam ser uma única chave). Aplicando: consolidar as top-6 chaves fragmentadas (`Modelo`, `COR`/`Color`/`cor`, `PESO BRUTO`, `DIMENSÕES DA EMBALAGEM`) cobre a maioria das ocorrências não-vazias — exatamente o que o `ProductSignatureExtractor` (Κ-3) já resolve, ainda não wired.

### Regra 4 — Merge mais valioso
`ORDER BY confidence_score DESC` dentro da fila de 3.072 pendentes, processando primeiro os 1.114 de faixa Média (85-94%) antes dos 1.958 de Revisão Manual (70-84%) — mesma disciplina que `MergeAuditService` já aplica, só faltando aprovação humana em lote.

### Regra 5 — Produto mais buscado sem comparação
`ORDER BY search_count DESC` entre `buyer_events` tipo busca cujo termo não retorna nenhum `canonical_product` com CPC≥2. Hoje o volume é baixo (46 eventos/7 dias) mas o padrão já aparece: "Notebook Gamer" (8 buscas) e "iPhone 17 Pro" (7 buscas) são os termos mais buscados — ambos já têm múltiplos merchants no catálogo (Notebooks: 400 produtos, 0 ofertas vinculadas — gap real; iPhone 17 Pro: 67 produtos, 4 merchants, mas 0 comparáveis 2+ porque o merge ainda não rodou nesses candidatos específicos).

Nenhuma dessas 5 regras precisa de um modelo novo — todas são `ORDER BY` sobre KPIs já definidos em `MARKETPLACE_KPIS.md`.

---

## Gatilhos objetivos de escala (Objetivo 7)

| Decisão | Gatilho objetivo | Estado hoje |
|---|---|---|
| Integrar novos merchants | CPC-2 do conjunto atual > 5% **e** Merge Success Rate estável ≥90% por 2 ciclos | CPC-2 = 0,03% — **não atingido**, escalar merchants agora dilui ainda mais uma fila já não processada |
| Expandir categorias (aceitar novas categorias de merchant) | Category-Product Coverage > 30% nas categorias já existentes | 1,2% — **não atingido** |
| Executar novos merges em lote | Merge Queue Depth estável ou caindo por 2 ciclos consecutivos **e** Rollback Rate ≤10% | Rollback Rate = 5% (dentro do critério), mas fila está crescendo a cada sync — não há ciclo de "queda" ainda medido |
| Recalcular Product Identity (reprocessar todos os pares) | Product Signature wired em produção **e** yield de simulação confirmado em produção ≥ 80% do valor simulado | Não aplicável ainda — camada não wired |
| Reprocessar Product Signature (novo extrator/regra) | Cobertura de `specifications` não-vazio cai abaixo de 50% (hoje 63,5%) **ou** uma nova chave de alta frequência (>1.000 ocorrências) aparece não mapeada | Não atingido |

A leitura honesta: **nenhum gatilho de expansão está atingido hoje**. Todos os gatilhos apontam para a mesma direção — processar o que já existe antes de trazer mais dado.

---

## Cadência recomendada

- **Diária**: `npm run observatory:report` (Marketplace Health, AI Readiness) — 8 fatores, cada um já rápido o suficiente para rodar diariamente sem custo de Postgres relevante no volume atual (18k produtos).
- **Semanal**: `npm run cpc:report` (CPC + overlap matrix) + revisão manual de um lote de `merge_candidates` Média (85-94%) — este é o único passo humano recorrente do ciclo.
- **Por Mission/Wave**: `kappa2-taxonomy-audit.ts`, `kappa3-attribute-audit.ts` — só quando uma mudança estrutural (nova migration, novo merchant, novo extrator) justifica remedir taxonomia/atributo do zero.

Nenhuma cadência acima exige um novo cron ou pipeline — todos os scripts já existem e podem ser rodados manualmente ou agendados via o Scheduler decoupled já decidido em ADR-052 (GitHub Actions até `pg_cron` na Release 2.0), sem mudança de arquitetura.
