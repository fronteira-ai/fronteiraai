# CATALOG QUALITY GOVERNANCE
# Mission Ω-Catalog Quality — Sistema Oficial de Governança da Qualidade do Catálogo

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-25
**Status**: Oficial — toda futura Mission de melhoria de dados do catálogo deve ser guiada pelos KPIs aqui definidos.
**Escopo**: exclusivamente qualidade operacional do catálogo, usando componentes já existentes (Catalog Recovery Engine, Pending Review Resolution, Merge Queue, Learning Engine, Canonical Integration). Nenhuma alteração de Product Identity, Canonical Catalog, Recovery Engine, Learning Engine, Gatekeeper ou Sync Pipeline foi feita para produzir este documento — auditoria 100% somente-leitura contra produção em 2026-07-25.

---

## 1. Indicadores atuais de qualidade do catálogo

| Indicador | Valor real medido |
|---|---|
| Cobertura de marcas (produtos com marca real, não "Outros"-like) | **40,7%** (15.673 de 38.471) — 59,3% (22.798) estão em "Outros" |
| Cobertura de categorias (não-forbidden) | **94,9%** (36.503 de 38.471) |
| Cobertura de especificações (specifications não-vazio) | **29,7%** (11.420 de 38.471) — média 8,3 chaves entre os que têm; 323 chaves distintas (fragmentação de nomenclatura) |
| Cobertura de imagens | **99,1%** produtos / **99,7%** canonical products |
| Cobertura de preços (USD válido) | **100,0%** |
| Cobertura de ProductSignature (≥1 campo estruturado extraído) | **47,5%** (18.272 de 38.471) — mas `model` só 1,8%, `capacityGb` 3,0%, `ramGb` 1,9% (o sinal realmente útil para diferenciar produtos é muito menor que os 47,5% sugerem; `manufacturerCode` sozinho é 42,1% do total) |
| Cobertura de Canonical Products (offers linkadas) | **~46,8%** (18.015 de 38.492) — 100% em 6 das 7 lojas, **10,7%** em Shopping China (59,6% de todas as offers do marketplace) |
| Comparable Product Coverage (canonical com ≥2 lojas) | **0,04%** (7 de 17.969 ativos) |
| Pending Reviews | **24.836**, 100% `pending`, **0 resolvidos** desde que o sistema existe |
| Merge Candidates | **4.681** total — 4.623 `pending`, 14 `approved`, 41 `merged`, 2 `rejected`, 1 `rolled_back` |
| Recovery Coverage (decisões de marca / backlog atual "Outros") | **3,7%** piso (830 decisões de marca já tomadas / 22.705 produtos ainda em "Outros" hoje — decisões passadas que já corrigiram produtos não aparecem mais neste denominador, então o número real de tentativas históricas é maior que 3,7%, mas o backlog restante é exatamente este) |

## 2. Detalhamento por indicador

| Indicador | Valor atual | Aceitável | Impacto no usuário | Impacto no matching | Dificuldade de melhoria |
|---|---|---|---|---|---|
| Brand Coverage | 40,7% | ≥90% | Alto — filtro/busca por marca inútil para 6 em 10 produtos | Crítico — marca é gate obrigatório; nenhum match cross-brand é possível por design | Baixa (ferramenta pronta), Alta em volume operacional |
| Category Coverage | 94,9% | ≥95% (já quase lá) | Baixo hoje | Médio — categoria é o 2º gate | Baixa — já próximo da meta |
| Specification Coverage | 29,7% (bruto) / single-digit por campo estruturado | ≥60% bruto, ≥30% por campo-chave (model/capacidade) | Médio-Alto — reduz confiança de match mesmo com marca certa | Alto — specifications é 30% do score de matching | Média — depende de parser por loja, não de um motor único |
| Image Coverage | 99,1%/99,7% | ≥95% | Já resolvido | Nenhum | N/A |
| Price Coverage (USD) | 100% | 100% | Já resolvido | Nenhum | N/A |
| ProductSignature Coverage | 47,5% (dominado por manufacturerCode) | ≥50% com pelo menos 2 campos além de manufacturerCode | Médio | Alto — é o sinal usado no fator `specifications`/`model-number` do algoritmo | Média-Alta — depende da qualidade do texto de origem |
| Canonical Coverage | 46,8% | ≥95% | Alto — offer fora do Canonical Catalog nunca é comparável | Crítico — é pré-condição de tudo | Baixa — Ω-Canonical Integration já resolve isso automaticamente após deploy |
| Comparable Product Coverage | 0,04% | Meta de curto prazo: 1%; médio prazo: 5% | Altíssimo — é a proposta de valor central do produto | É o resultado final de todos os outros indicadores | Alta — depende de todos os anteriores em sequência |
| Pending Review Aging | 24.836 pendentes, idade indefinida (0 resolvidos) | Fila ativa com idade média <7 dias | Alto (indireto) — cada revisão parada é uma correção que nunca se propaga | Alto — é a única fonte de correção humana confirmada que alimenta Gatekeeper/Learning Engine | Baixa tecnicamente, **alta operacionalmente — não existe hoje nenhuma ferramenta (script ou UI) que execute `PendingReviewResolutionService`, achado real desta auditoria** |
| Merge Approval Rate | 14/4.681 = 0,3% | ≥50% dos candidatos revisados dentro de 30 dias | Alto | Alto — é o único caminho para uma comparação virar visível | Baixa — UI já existe (`/admin/merge-execution`), só não está sendo operada |
| Recovery Coverage | 3,7% (piso) do backlog de marca | ≥80% do backlog resolvido | Alto | Alto — é a ferramenta que resolve marca em escala | Baixa — motor pronto e testado, só não rodou em volume |

## 3. KPIs oficiais de qualidade do catálogo

1. **Brand Coverage** — % de produtos com marca real (não-forbidden)
2. **Category Coverage** — % de produtos com categoria real (não-forbidden)
3. **Specification Coverage** — % de produtos com `specifications` não-vazio
4. **ProductSignature Depth** — % de produtos com ≥2 campos de `ProductSignature` extraídos além de `manufacturerCode`
5. **Canonical Coverage** — % de offers linkadas a um Canonical Product
6. **Comparable Product Coverage (CPC)** — % de Canonical Products ativos com ≥2 lojas distintas
7. **Pending Review Aging** — tempo médio (dias) que um `catalog_pending_review` permanece `pending`
8. **Merge Approval Rate** — % de `merge_candidates` revisados (aprovado ou rejeitado) sobre o total já criado
9. **Review Throughput** — número de `pending_reviews` + `merge_candidates` resolvidos por semana
10. **Recovery Coverage** — % do backlog de marca/categoria "forbidden" já coberto por `catalog_recovery_decisions`

## 4. Definição de cada KPI

| KPI | Fórmula | Origem dos dados | Frequência | Meta curto prazo (30d) | Meta médio prazo (90d) | Meta longo prazo (180d) |
|---|---|---|---|---|---|---|
| Brand Coverage | `produtos com brand não-forbidden / total de produtos` | `products.brand_id` → `brands.name` | Semanal | 50% | 70% | 90% |
| Category Coverage | `produtos com category não-forbidden / total` | `products.category_id` → `categories.name` | Semanal | 95% (manutenção) | 96% | 97% |
| Specification Coverage | `produtos com specifications ≠ {} / total` | `products.specifications` | Semanal | 35% | 45% | 60% |
| ProductSignature Depth | `produtos com ≥2 campos de ProductSignature (excl. manufacturerCode) / total` | `buildProductSignature()` aplicado a `products.name`+`specifications` (leitura, função pura já existente) | Quinzenal | 10% | 20% | 35% |
| Canonical Coverage | `offers com canonical_product_id / total de offers` | `offers.canonical_product_id` | Diária (após deploy do Ω-Canonical Integration) | 90% | 97% | 99% |
| Comparable Product Coverage | `canonical_products ativos com ≥2 lojas distintas / canonical_products ativos` | `offers` agrupado por `canonical_product_id` → `store_id` distintos | Semanal | 1% | 3% | 5% |
| Pending Review Aging | `média(now() − created_at)` sobre `catalog_pending_reviews.status='pending'` | `catalog_pending_reviews.created_at` | Semanal | <30 dias | <14 dias | <7 dias |
| Merge Approval Rate | `merge_candidates com status ∈ {approved,rejected,merged} / total de merge_candidates` | `merge_candidates.status` | Semanal | 10% | 30% | 60% |
| Review Throughput | `count(pending_reviews resolvidos) + count(merge_candidates revisados) por semana` | `catalog_pending_reviews.resolved_at`, `merge_candidates.reviewed_at` | Semanal | >100/semana | >500/semana | >1000/semana |
| Recovery Coverage | `catalog_recovery_decisions (brand) / (catalog_recovery_decisions(brand) + produtos ainda "Outros")` | `catalog_recovery_decisions`, `products.brand_id` | Mensal | 20% | 50% | 80% |

## 5. Plano operacional — apenas ferramentas já existentes

**Catalog Recovery Engine** (`scripts/catalog-recovery-run.ts`, `CatalogRecoveryEngine.ts`): já pronto, já testado, já usado uma vez (830 decisões de marca, 173 de categoria). Operação recomendada: execução recorrente (ex.: semanal) em modo `--execute` contra o backlog completo — hoje o motor só processou uma fração pequena do total historicamente candidato. Cada execução é idempotente e auditável (`catalog_recovery_decisions` nunca é sobrescrita).

**Pending Review Resolution** (`PendingReviewResolutionService`): **achado real desta auditoria — não existe hoje nenhum script ou rota de admin que execute esta classe em produção.** Ela é chamada apenas dentro dos testes unitários e referenciada (não invocada) por `scripts/knowledge-engine-backfill.ts`. Operar este componente, como a Missão pede, requer primeiro que uma Missão futura (fora do escopo "não gerar código" desta) construa o ponto de entrada mínimo — script ou rota — que já deveria existir para o Learning Engine (Ω-5) e o Gatekeeper (Ω-Gatekeeper) terem qualquer efeito prático. Este é o maior gap operacional puro encontrado nesta auditoria: a peça de correção humana mais barata de operar (não exige nova arquitetura, só um consumidor do serviço já existente) é também a única sem nenhum consumidor hoje.

**Merge Queue** (`MergeQueueDashboardService`, `/admin/merge-execution`, rotas `/api/admin/canonical-catalog/merge-execution/*`): interface já existe e já funciona (14 aprovações já feitas por ela). Operação recomendada: sessão de revisão recorrente (ex.: 2x por semana) processando o backlog de 4.623 pendentes, priorizando os de maior confiança (`tier auto/probable` já classificados por `MergeAuditService.classifyPending()`, também já existente).

**Learning Engine** (`scripts/knowledge-engine-backfill.ts`, `scripts/knowledge-engine-validation-report.ts`): pronto, mas sua fonte de entrada (patterns confirmados via Pending Review) está vazia — depende diretamente do item acima ganhar throughput. Operação recomendada: reexecutar o backfill semanalmente assim que Pending Review Resolution começar a gerar `resolved_value`, monitorando via o relatório de validação já existente.

**Canonical Integration** (Ω-Canonical Integration / Ω-Hardening, implementado, não deployado): sua aplicação (migration + deploy) é pré-requisito para o Canonical Coverage subir de 46,8% para perto de 100% — não depende de nenhuma ação de qualidade de dado, é puramente uma decisão de rollout já tomada e aprovada em Missões anteriores.

**Sequência recomendada** (nenhuma etapa nova, só ordem de operação do que já existe): (1) deploy do Ω-Canonical Integration → Canonical Coverage sobe; (2) Catalog Recovery Engine em volume → Brand/Category Coverage sobem; (3) construir o consumidor mínimo de Pending Review Resolution (Missão futura) → Review Throughput deixa de ser zero; (4) Merge Queue operada com regularidade → Merge Approval Rate sobe; (5) Learning Engine passa a ter dado real para consumir → correções futuras se tornam automáticas por loja.

## 6. Critérios de maturidade operacional do catálogo

O catálogo é considerado operacionalmente maduro quando, simultaneamente:
- Brand Coverage ≥ 90% e Category Coverage ≥ 95%
- Canonical Coverage ≥ 97%
- Pending Review Aging < 7 dias (fila ativa, nunca represada)
- Merge Approval Rate ≥ 60% do total histórico já criado
- Comparable Product Coverage ≥ 5% (teto realista de curto/médio prazo dado o tamanho do catálogo; não 100%, porque nem todo produto tem par real em outra loja)
- Recovery Coverage ≥ 80% do backlog de marca/categoria identificado

## 7. Quando estes KPIs forem atingidos

- **Comparação de preços entre lojas / `OfferRankingService`** passa a ter produto real para rankear em vez de 7 casos isolados.
- **Busca** para de mostrar o mesmo produto como resultados aparentemente diferentes por loja.
- **Melhor Oferta / Savings Opportunity / ParaguAIAdvisor** passam a disparar para uma fração relevante do catálogo, não uma anomalia estatística.
- **Filtro por marca e por categoria** deixam de esbarrar em "Outros"/genéricos como o valor mais comum.
- **Learning Engine** passa a acumular conhecimento real por loja (hoje vazio) e a reduzir revisões futuras de fato, não só em teoria.
- Tudo isso sem nenhuma nova arquitetura — são capacidades que já existem em código e passam a ter dado suficiente para operar como projetado.
