# COMPARABLE_COVERAGE_REPORT.md
# Program Ω — Mission Ω-1 — Medição real antes/depois

**Categoria**: `docs/product/`
**Data**: 2026-07-15 — medição direta contra produção, antes e depois de uma execução real e autorizada pelo CTO
**Reprodutível em**: `npm run cpc:report`, `scripts/merge-audit-report.ts`, `scripts/merge-crossstore-sample.ts`, `scripts/merge-final-stats.ts` (todos read-only, exceto `scripts/merge-pilot.ts`, que executou o piloto real)

---

## 1. Objetivo 1 — Auditoria dos 3.106 candidatos (real, medida)

| Classificação | Contagem | % |
|---|---:|---:|
| Alta confiança (≥95%) | 34 | 1,1% |
| Média confiança (85–94%) | 1.114 | 35,9% |
| Revisão manual (70–84%) | 1.958 | 63,0% |
| **Total** | **3.106** | 100% |

## 2. Achado real que precede tudo o resto: 100% dos candidatos são intra-loja

Antes de aprovar ou executar qualquer coisa, `scripts/merge-crossstore-sample.ts` verificou, para os **3.106 candidatos pendentes**, se a fonte e o destino de cada um pertencem à mesma loja ou a lojas diferentes:

**3.106 de 3.106 (100%) são intra-loja.** Zero candidato cross-merchant existe hoje na fila.

Isso não é surpresa nova — é a confirmação, ao nível de execução real, do que a Sprint 2.7 já havia provado por simulação (11,28M pares avaliados, zero candidato cross-merchant acima de qualquer limiar de confiança testado). O que esta Mission adiciona é a prova direta: **mesmo pegando os candidatos já gerados e reais** (não uma simulação), nenhum deles uniria produtos de lojas diferentes. A fila de `merge_candidates` inteira, aprovada e executada, é 100% limpeza de duplicata dentro da mesma loja — nunca criação de comparação de preço nova.

## 3. Baseline (antes do piloto) — 2026-07-15, catálogo de 18.010 produtos

| Métrica | Valor |
|---|---:|
| Products / Offers | 18.010 / 18.015 |
| Offer Density | 1,0003 |
| Canonical products com oferta | 18.009 |
| **Comparable (2+ lojas)** | **6** (0,03%) |
| **Comparable (3+ lojas)** | **0** (0,00%) |
| Histograma — 1 loja | 18.003 |
| Histograma — 2 lojas | 6 |
| Histograma — 3/4/5+ lojas | 0 / 0 / 0 |

**Achado colateral real**: os 6 produtos comparáveis já existentes hoje envolvem `nissei` e `cellshop` — 2 dos 4 merchants documentados como bloqueados/sem conector em `docs/marketplace/Tier1_Merchants.md` — com 2 ofertas cada no banco. Isso é anterior a esta Mission e não foi investigado aqui (fora do escopo: nenhum conector foi criado ou alterado); registrado como um achado a esclarecer em uma missão futura de auditoria de dado, não uma contradição desta Mission.

## 4. O piloto real (autorizado pelo CTO, executado em produção)

Escopo: os 34 candidatos de Alta confiança — todos intra-loja, o lote de menor risco possível.

| Etapa | Resultado |
|---|---|
| Aprovação | 34/34 aprovados |
| Execução individual (5 primeiros, com preview antes de cada) | 5/5 executados, 1 oferta movida cada |
| Execução em lote (`executeBatch`, 29 restantes) | **15 sucesso, 14 falha** |
| Rollback (1 execução, para provar reversibilidade) | 1/1 revertida com sucesso |

**As 14 falhas foram o guard de integridade funcionando corretamente, não um bug**: `TARGET_ALREADY_MERGED` — vários dos 34 candidatos formam cadeias de 3+ duplicatas do mesmo produto dentro da mesma loja (ex.: "Produto X", "Produto X (Lacre)", "Produto X (Ativado)" todos como candidatos separados apontando para alvos que já haviam sido mesclados por uma execução anterior no mesmo lote). O Engine recusou corretamente continuar a cadeia sem resolução explícita — exatamente o comportamento desenhado em `MERGE_EXECUTION_ENGINE.md` §4, nunca uma corrupção silenciosa. Os 14 candidatos permanecem em status `Approved`, prontos para uma segunda rodada depois que a cadeia for resolvida (fora do escopo desta Mission — é um passo operacional, não uma decisão de arquitetura).

**Estado final da fila** (medido via `MergeQueueDashboardService`, real):

```json
{
  "pending": 3072,
  "approved": 14,
  "merged": 19,
  "rejected": 0,
  "rolledBack": 1,
  "totalOffersMoved": 19,
  "successRate": 0.95
}
```

## 5. Depois (após o piloto) — CPC remedido

| Métrica | Antes | Depois | Delta |
|---|---:|---:|---:|
| Canonical products com oferta | 18.009 | 17.990 | **-19** (exatamente os 19 merges ativos — cada merge bem-sucedido remove 1 canonical product duplicado da contagem "com oferta própria") |
| Comparable (2+ lojas) | 6 | **6** | **0** |
| Comparable (3+ lojas) | 0 | **0** | **0** |
| Histograma — 1 loja | 18.003 | 17.984 | -19 |
| Histograma — 2 lojas | 6 | 6 | 0 |

**Exatamente como previsto pelo achado da Seção 2**: Comparable Product Coverage não se moveu **nem um único produto**, porque os 19 merges executados eram 100% intra-loja. O Engine funciona (prova real: 19 ofertas foram fisicamente movidas, 1 rollback funcionou, o `canonical_products` count caiu exatamente 19), mas **não existe hoje nenhum candidato cross-merchant para o Engine executar** — o gargalo não é o executor, nunca foi (confirma a conclusão da Mission ΔR-2/Program Κ).

## 6. Objetivo 10 — Resposta objetiva

**"Após executar todos os merges aprovados, quantos produtos passarão a ter 2/3/4/5 lojas?"**

Resposta medida, não projetada: **zero mudança em qualquer bucket de 2+**, porque não existe, na fila de 3.106 candidatos gerados até hoje, nenhum par cross-merchant. Executar os 14 restantes (após resolver a cadeia) ou até os 3.072 ainda pendentes (Média + Revisão manual, ambos também confirmados 100% intra-loja na Seção 2) teria exatamente o mesmo efeito sobre CPC: **nenhum**. O único efeito real de executar o resto da fila seria continuar a limpeza de duplicatas de catálogo (relevante para `AI Readiness Score`/qualidade de dado), nunca para comparabilidade de preço.

**"Qual será o novo Marketplace Health? Qual será o novo AI Readiness?"** — não recalculados nesta Mission (ambos dependem de `MarketplaceHealthEngine`/fórmula de `MARKETPLACE_TRUTH_REPORT.md`, fora do escopo de código desta missão, que é execução de merge, não recomputar scores agregados). Como Comparable Products é um dos 3 componentes do AI Readiness Score e não se moveu, e Offer Density também não se move por um merge intra-loja (a contagem de `offers` não muda, só `canonical_product_id`), a expectativa honesta é **nenhuma mudança perceptível** em nenhum dos dois — mas isso é inferência, não uma nova medição, e está rotulado como tal.

## 7. Conclusão estratégica

Esta Mission fecha, com prova de execução real (não só simulação), o mesmo veredito que Sprint 2.7/Program Κ já haviam estabelecido: **o Merge Execution Engine é uma capacidade de qualidade de catálogo, não uma capacidade de comparabilidade de preço** — enquanto a fila de `merge_candidates` continuar sendo gerada apenas a partir de comparações intra-loja (efeito direto da fragmentação de categoria, já documentada em `docs/product/CATEGORY_INVENTORY_REPORT.md`). Mover Comparable Product Coverage continua exigindo o que já estava nomeado como backlog estratégico: Universal Taxonomy (Mission Κ-2) e/ou expansão do universo de merchants com overlap real de categoria (`docs/marketplace/MARKETPLACE_EXPANSION_ROADMAP.md`, Mission ΔR-2) — não mais execução de merge.

## 8. Fontes

`scripts/merge-audit-report.ts`, `scripts/merge-crossstore-sample.ts`, `scripts/merge-pilot.ts`, `scripts/merge-final-stats.ts`, `scripts/cpc-report.ts` (todos rodados ao vivo em 2026-07-15), `docs/product/RELEASE_2_FOUNDATION_COMPLETE.md`, `docs/product/CATEGORY_INVENTORY_REPORT.md`, `docs/engineering/MERGE_EXECUTION_ENGINE.md`.
