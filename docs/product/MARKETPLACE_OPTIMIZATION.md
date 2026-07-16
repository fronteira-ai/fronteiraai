# MARKETPLACE_OPTIMIZATION.md
# Program Φ (Phi) — Mission Φ-1 — Continuous Comparability Optimization

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Renomeado de**: a missão foi recebida como "Program Σ Mission Σ-1" — colisão real com o Program Σ já enviado (`docs/architecture/CONNECTOR_PLATFORM_V3.md`, Mission Σ-1, commit `ea1d4bc`, 2026-07-10; Mission Σ-2 Delta Engine, commit `2062ab9`). Renomeada para **Program Φ (Phi) — Mission Φ-1**, primeira letra grega ainda não usada no projeto (`Ω, Κ, Λ, Π, Θ, Ξ, Σ, ΔR` já ocupados).
**Restrições respeitadas**: nenhum algoritmo novo, nenhuma mudança em Product Identity/Buyer Intelligence/Opportunity Engine/Exchange/Home/UX, nenhuma migration aplicada. Duas verificações pontuais read-only foram executadas contra produção (contagem de `merge_executions`/`merge_candidates` por status; classificação intra vs. cross-merchant da fila pendente) — mesmo padrão dos scripts já certificados (`cpc-report.ts`, `merge-audit-report.ts`), não algoritmo novo, nem persistidas como scripts permanentes.
**Ver também**: `MARKETPLACE_KPIS.md`, `docs/architecture/MARKETPLACE_PIPELINE.md`, `docs/architecture/MARKETPLACE_DASHBOARD.md`, `MARKETPLACE_FEEDBACK_LOOP.md`.

---

## 1. Marketplace Optimization Audit — baseline real (2026-07-16, produção)

Toda linha abaixo é medição real, não estimativa — fonte citada em cada uma. Ver `MARKETPLACE_KPIS.md` para as fórmulas completas.

| KPI | Valor real | Fonte |
|---|---:|---|
| Marketplace Health Score | **63/100** | `MarketplaceHealthEngine` |
| AI Readiness Score | **52,6/100** | `marketplace-observatory-report.ts` |
| Comparable Product Coverage (CPC, 2+) | **6 / 17.990 = 0,03%** | `cpc-report.ts` |
| CPC-3+ / CPC-4+ / CPC-5+ | **0 / 0 / 0** | `cpc-report.ts` |
| Offer Density | **1,0003** (18.015 ofertas / 18.010 produtos) | `cpc-report.ts` |
| Merge Queue Depth | **3.072 pendentes** (Alta 0 · Média 1.114 · Manual 1.958) | `merge-audit-report.ts` |
| Merge Success Rate | **19/20 = 95%** | contagem `merge_executions` |
| Rollback Rate | **1/20 = 5%** | contagem `merge_executions` |
| **Composição da fila pendente** | **0 cross-merchant · 3.056 intra-merchant · 16 indeterminado** | verificação pontual desta Mission |
| Category count (bruto) | **929** | `kappa2-taxonomy-audit.ts` |
| Category-Product Coverage | **11/929 = 1,2%** | `MarketplaceHealthEngine` fator `coverage` |
| Universal Taxonomy mapeada | **129 slugs / 11 departamentos** — migration pronta, backfill não aplicado | `UNIVERSAL_TAXONOMY.md` |
| Brand Duplication | **4/852 = 0,5%** | `kappa2-taxonomy-audit.ts` |
| Attribute/Signature Coverage | **11.432/18.010 = 63,5%** não-vazio, 323 chaves fragmentadas | `kappa3-attribute-audit.ts` |
| Product Signature (simulado) | Manual 2→306, Média 0→10, +199 produtos comparáveis — **não wired em produção** | `kappa3-cross-merchant-simulation.ts` |
| Merchant Coverage | 7 com oferta — 5 substanciais, 2 residuais (nissei/cellshop, 2 ofertas cada) | `cpc-report.ts` |
| Buyer activity | 46 `buyer_events`/7 dias, 0 Brain events | `MarketplaceHealthEngine` fator `analytics_brain_volume` |

**O achado central desta auditoria**: dos 3.072 candidatos pendentes na fila de merge, **zero são cross-merchant**. Executar a fila inteira hoje, do jeito que está, moveria o CPC em exatamente zero. Isso confirma e atualiza o achado de Fase 2 Sprint 2.7 (simulação de 11,28M pares, zero candidatos cross-merchant sob qualquer política de persistência) — mesmo depois de Program Κ (Taxonomy + Product Signature) ter sido construído. A diferença é que agora existe uma correção já construída e validada por simulação (Κ-3): só não está ligada em produção.

## 2. Optimization Pipeline

Ver `docs/architecture/MARKETPLACE_PIPELINE.md` para o mapeamento completo dos 12 estágios (Sync → Canonical → Taxonomy → Product Signature → Product Identity → Merge Candidates → Merge Queue → Merge Execution → Comparable Coverage → Opportunity Engine → Buyer Intelligence → Marketplace Health).

**Os 3 pontos de estrangulamento reais, cada um já resolvido tecnicamente e aguardando apenas execução/wiring:**

1. **Taxonomy → Canonical**: migration pronta (`20260715140000_universal_taxonomy.sql`), backfill não autorizado.
2. **Product Signature → Product Identity**: extração pronta, validada por simulação (+199 produtos), nunca wired ao `ProductIdentityEngine` real.
3. **Merge Queue → Merge Execution**: executor funcionando (95% de sucesso), mas a fila atual é 99,5% intra-merchant — processá-la não resolve CPC até o Product Signature (item 2) gerar candidatos cross-merchant novos.

## 3. Marketplace KPIs

Catálogo completo em `MARKETPLACE_KPIS.md` — 17 KPIs com fórmula e baseline real, mais 2 KPIs definidos e nomeados como não-medidos ainda (Opportunity Coverage, Buyer Decision Coverage — gap de instrumentação, não de arquitetura).

## 4. Feedback Loop

Ciclo de 6 passos + 5 regras de Auto Prioritization objetivas (sem IA) + 5 gatilhos de escala — todos em `MARKETPLACE_FEEDBACK_LOOP.md`. Leitura honesta dos gatilhos: **nenhum gatilho de expansão (novos merchants, novas categorias, recálculo de Product Identity) está atingido hoje** — todos apontam para processar o que já existe antes de trazer mais dado.

## 5. Dashboard Architecture

`/admin/marketplace-operations` já cobre Health/Coverage/Connectors/Priority/Alerts, com histórico diário já persistido (`MarketplaceSnapshotService`, cron `vercel.json` 07:00 UTC). O que falta é histórico dos KPIs desta Mission (CPC, Merge Queue Depth, Category Fragmentation, Attribute Coverage) — caminho técnico mapeado em `docs/architecture/MARKETPLACE_DASHBOARD.md`, não implementado (exigiria migration, fora do escopo).

## 6. Roadmap de Escala (Objetivo 7)

| Decisão | Gatilho | Estado |
|---|---|---|
| Integrar novos merchants | CPC-2 > 5% e Merge Success Rate ≥90% por 2 ciclos | Não atingido (CPC-2 = 0,03%) |
| Expandir categorias | Category-Product Coverage > 30% | Não atingido (1,2%) |
| Executar merges em lote | Fila estável/caindo + Rollback ≤10% | Rollback OK (5%), mas fila é 99,5% ruído (intra-merchant) |
| Recalcular Product Identity | Product Signature wired + yield real ≥80% do simulado | **Pré-condição de tudo o resto — não wired ainda** |
| Reprocessar Product Signature | Cobertura de specs <50% ou nova chave de alta frequência | Não atingido (63,5%) |

A ordem correta, segundo os próprios gatilhos: **wiring do Product Signature primeiro** — é a única ação que desbloqueia todas as outras (sem ela, "executar merges em lote" processa ruído, e "recalcular Product Identity" não tem o que recalcular de diferente).

## 7. Executive Simulation — 30/90/180 dias

**Metodologia**: dois cenários, cada um explicitamente rotulado como projeção (não medição). Nenhum modelo novo — Cenário B usa exclusivamente números já medidos por simulação em Κ-3 (`kappa3-cross-merchant-simulation.ts`), nunca um número inventado por esta Mission.

### Cenário A — Trajetória inercial (nenhuma decisão nova do CTO)

Hoje não existe cron/processo automático que aprove ou execute merges — Shadow Mode é permanente por desenho (`RELEASE_2_FOUNDATION_COMPLETE.md` §5). As 19 execuções reais até agora são um lote piloto, não uma cadência contínua. Sem nova autorização:

| Dia | CPC | Category Coverage | Marketplace Health | AI Readiness |
|---|---:|---:|---:|---:|
| Hoje | 0,03% | 1,2% | 63 | 52,6 |
| +30 | 0,03% (projeção) | 1,2% (projeção) | ~63 (projeção) | ~52,6 (projeção) |
| +90 | 0,03% (projeção) | 1,2% (projeção) | ~63 (projeção) | ~52,6 (projeção) |
| +180 | 0,03% (projeção) | 1,2% (projeção) | ~63 (projeção) | ~52,6 (projeção) |

Pequenas variações de `freshness`/`connector_health` continuam ocorrendo com o sync diário normal, mas nenhum dos fatores que hoje seguram o score (`coverage`=1, `discovery`=0) muda sem decisão humana. **Esta é a leitura mais importante da simulação**: o marketplace não piora, mas também não melhora sozinho — a "otimização contínua" pedida pela Mission não existe ainda como processo automático, existe como capacidade manual não acionada.

### Cenário B — Wiring do Product Signature autorizado (usa números já medidos por Κ-3)

Premissa única: o CTO autoriza (1) o wiring do `ProductSignatureExtractor` na entrada do `ProductIdentityEngine` (zero mudança no Engine) e (2) revisão/aprovação humana dos novos candidatos cross-merchant gerados, na cadência semanal já recomendada em `MARKETPLACE_FEEDBACK_LOOP.md`.

- **+30 dias (projeção)**: os 316 candidatos que a simulação Κ-3 identifica (10 Média + 306 Manual) entram na fila real pela primeira vez — hoje a fila tem 0 cross-merchant. Revisão humana semanal (ritmo de `MARKETPLACE_FEEDBACK_LOOP.md`) processando a faixa Média primeiro pode aprovar/executar uma fração pequena desses 10-30 dias — CPC sai de 0,03% para uma faixa de dezenas de produtos (ordem de grandeza de **199 produtos desbloqueáveis no total**, per Κ-3, não necessariamente todos em 30 dias).
- **+90 dias (projeção)**: se a cadência semanal se mantiver e a taxa de aprovação humana acompanhar o volume de 306 candidatos Manual, o CPC projetado se aproxima do teto medido por Κ-3: **199/17.990 ≈ 1,1%** — ainda pequeno em termos absolutos, mas **36x** o valor atual (0,03%).
- **+180 dias (projeção)**: sem uma segunda rodada de extração (novos merchants ou novos atributos), o teto de 199 produtos é o limite superior conhecido — o próximo salto exigiria ou (a) mais merchants com overlap real de catálogo, ou (b) autorizar também o backfill da Universal Taxonomy (Κ-2), que ataca a outra metade do gate (categoria/marca) que Κ-2 já provou mover CPC de 6 para 7 (+1) sozinha, antes do Product Signature.

**O que não está incluído no Cenário B, deliberadamente**: nenhum número de Marketplace Health/AI Readiness projetado — ambos dependem de fatores (`coverage`, `discovery`, `claims`) que o wiring do Product Signature não move. Projetar esses dois só com base num CPC melhor seria uma correlação inventada, não uma medição — por isso omitidos, não estimados.

## 8. Documentation

Os 5 documentos mandatados por esta Mission:

- `docs/product/MARKETPLACE_OPTIMIZATION.md` (este documento)
- `docs/product/MARKETPLACE_KPIS.md`
- `docs/architecture/MARKETPLACE_PIPELINE.md`
- `docs/architecture/MARKETPLACE_DASHBOARD.md`
- `docs/product/MARKETPLACE_FEEDBACK_LOOP.md`

## 9. Executive Recommendation

**O ParaguAI já possui uma plataforma capaz de melhorar continuamente sem grandes mudanças arquiteturais?**

Sim, tecnicamente — com uma ressalva importante. Toda a maquinaria de medição já existe e já roda contra produção: `MarketplaceHealthEngine`, `cpc-report.ts`, `MergeAuditService`, `MergeExecutorService` (com rollback real testado), `MarketplaceSnapshotService` com histórico diário automatizado. Nenhuma dessas peças precisa ser reconstruída. Mas "otimização contínua" implica um *ciclo fechado* — e o ciclo hoje está aberto no ponto exato entre medir e agir: o `ProductSignatureExtractor` já mede que existe uma correção (+199 produtos comparáveis, validado por simulação sobre 1,3M pares reais), mas essa correção não está conectada a nada em produção. A capacidade de melhorar é real; o *acionamento* dela é manual e não está acontecendo.

**Qual passa a ser o verdadeiro gargalo?**

Não é engenharia — as 3 correções que fechariam o ciclo (wiring do Product Signature, backfill da Universal Taxonomy, escala de execução de merge) já foram construídas, testadas e, em 2 dos 3 casos, verificadas por simulação read-only sobre dado de produção real. Não é marketplace nem merchants — o catálogo atual (18.010 produtos, 5 merchants substanciais, `Offer Density` ≈ 1,0) já contém overlap real não capturado pelo pareamento atual (é exatamente isso que a fila 100% intra-merchant, 0% cross-merchant, prova: o problema não é falta de produto duplicado no catálogo, é falta de reconhecimento desse duplicado). Não é dado no sentido de "dado ausente" — é dado presente e não normalizado (`COR`/`Color`/`cor`; 929 categorias brutas vs. 129 conceitos reais).

**O gargalo real é decisório/operacional**: três peças de infraestrutura certificada (Quality Gate verde, cada uma) estão esperando uma autorização explícita do CTO para sair de "construído" para "em produção" — exatamente o mesmo padrão observado em Sprint 2.6→2.8, Κ-1→Κ-3 e Ω-1: o ParaguAI tem sistematicamente construído a correção certa antes de ligá-la. Isso não é um problema de disciplina de engenharia (o padrão "construir, simular, só executar com autorização explícita" é o Shadow Mode permanente funcionando como projetado) — é a evidência de que o próximo ganho de CPC não depende de escrever uma linha de código nova, depende de uma decisão de sequenciamento: autorizar o wiring do Product Signature antes de qualquer outra iniciativa de marketplace, porque é a única peça que, segundo a própria simulação já rodada, move o número que todo o resto do roadmap depende (CPC).

Aquisição de usuários e monetização não aparecem como gargalo nesta auditoria porque estão a jusante de um problema mais fundamental: com CPC em 0,03%, o produto ainda não tem, na prática, "comparação de preço" para a esmagadora maioria do catálogo — a proposta de valor central do ParaguAI. Investir em aquisição ou monetização antes de destravar Product Signature seria otimizar a distribuição de um produto que ainda não entrega, na maior parte do catálogo, o que promete no nome.

---

## Veredito

**B) FOUNDATIONAL OPTIMIZATION GAPS DETECTED**

Não por falta de arquitetura, engine ou KPI — por três peças já construídas e validadas (Universal Taxonomy, Product Signature, Merge Execution em escala) que ainda não estão conectadas/autorizadas em produção, e cuja ausência de conexão é a causa direta, medida (não suposta), de CPC = 0,03% e de uma fila de 3.072 candidatos pendentes dos quais **zero** move o número que a Mission existe para otimizar.
