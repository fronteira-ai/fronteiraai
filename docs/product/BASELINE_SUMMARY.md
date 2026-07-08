# BASELINE_SUMMARY.md
# PROGRAM Ω — Mission Ω-4.0 — Sumário Executivo

**Categoria**: `docs/product/` (companion de Program Ω)
**Data**: 2026-07-08
**Wave**: Ω-4.0 — Baseline Measurement (única Wave autorizada nesta missão)
**Status**: **Concluída**

---

## O que foi pedido

Transformar toda métrica qualitativa de densidade de marketplace em quantitativa, sem alterar produção, arquitetura, comportamento, banco, IA, sem criar funcionalidades, sem promover Product Identity além de Shadow Mode, sem implementar Attribute Extraction.

## O que foi entregue

1. **`database/health_checks/marketplace_density.sql`** — 20 queries read-only, reproduzíveis, mesmo padrão dos health checks já existentes no projeto.
2. **`KPI_BASELINE.md`** — 18 KPIs, cada um com valor atual, método de cálculo, origem do dado, nível de confiança, meta para o Launch e meta para a VISION 2035.
3. **`MARKETPLACE_BASELINE.md`** — a mesma medição, em prosa, com riscos nomeados.
4. **`MARKETPLACE_OBSERVATORY_BASELINE.md`** — especificação do mecanismo de observação contínua (v1) + primeiro cálculo do Marketplace Density Score composto.

Todas as medições vieram de uma única execução, ao vivo, contra produção, em 2026-07-08, via conexão read-only autorizada explicitamente pelo CTO nesta sessão.

## Os 5 números que mais importam

| Número | Valor | Por quê importa |
|---|---|---|
| Offer Density | 1,0046 ofertas/produto | Sem múltiplas ofertas por produto, "comparar preço" não existe de fato hoje — é o gargalo mais direto para o Compare Engine |
| Canonical Coverage | 5,5% (36/650 produtos) | O bootstrap de canonicalização não rodou contra o catálogo completo — achado de execução, não de arquitetura |
| Merge Candidates | 0 (zero, sempre) | O motor de duplicate detection nunca persistiu um resultado em produção |
| Claimed Stores | 0 (zero) | Confirma numericamente, pela primeira vez, o achado repetido em 3 auditorias estratégicas anteriores |
| Images/Brand/Category preenchidos | 99,7% / 100% / 100% | A única frente onde a densidade já está no nível esperado — mas com fragmentação não auditada (140 marcas, 175 categorias para 650 produtos) |

## O que isso muda na priorização

Nada no `ROADMAP_2_0.md`/`RELEASE_ALIGNMENT.md` aprovados precisa ser revertido — esta baseline **confirma** a tese central da Mission Ω-1 (Vision Alignment Score baixo por substrato fino) com números exatos em vez de estimativa qualitativa. O achado novo e mais acionável é o de Canonical Coverage/Merge Candidates: não é "o match rate é baixo porque os produtos são muito diferentes entre lojas" (hipótese razoável, mas não é o que os números mostram) — é "o processo de canonicalização em si só rodou contra 5,5% do catálogo". Isso muda Ω-4.1 (`MISSION_OMEGA_4_EXECUTION_BLUEPRINT.md`) de "ajustar heurísticas de match" para, primeiro, "rodar o bootstrap já existente contra o catálogo completo" — um problema de execução, mais barato de resolver do que um problema de algoritmo.

## O que continua bloqueado, corretamente

- **Ω-4.1 (merge automático de alta confiança)**: continua exigindo ADR própria antes de qualquer implementação — muda comportamento de escrita em produção.
- **Attribute Extraction**: continua não implementado, gap nomeado, não construído.
- **Product Identity**: continua em Shadow Mode — nenhuma linha em `merge_candidates` foi criada, aprovada ou fundida por esta Wave.
- **Todas as Waves Ω-4.2 a Ω-4.7**: continuam não iniciadas, aguardando mandato explícito do CTO, agora com baseline real para se ancorar.

## Recomendação

Baseline aprovado e completo. Próxima decisão é do CTO: qual Wave abrir primeiro. Dado o achado do Canonical Coverage, `Ω-4.1` (rodar o bootstrap de canonicalização contra o catálogo completo — trabalho de execução, não de algoritmo, baixo risco) é o candidato de maior razão impacto/esforço identificado nesta baseline.
