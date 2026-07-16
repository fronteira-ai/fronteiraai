# MARKETPLACE_PIPELINE.md
# Program Φ (Phi) — Mission Φ-1 — Continuous Comparability Optimization

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Mapeamento do pipeline real já em produção/quase-produção. Nenhum estágio foi criado ou alterado por esta Mission — cada um já existia, construído por Programs anteriores (Ω, Κ, Λ, Π, Ξ). Este documento só nomeia os pontos de medição.
**Ver também**: `MARKETPLACE_KPIS.md` (fórmulas), `MARKETPLACE_OPTIMIZATION.md` (baseline + gaps).

---

## O pipeline oficial (12 estágios)

```
1. Sync            → src/domains/connectors/
2. Canonical        → src/domains/canonical-catalog/  (bootstrap)
3. Taxonomy         → src/domains/taxonomy/            [construído, NÃO wired]
4. Product Signature→ src/domains/product-intelligence/[construído, NÃO wired]
5. Product Identity → src/domains/product-identity/
6. Merge Candidates → merge_candidates (CanonicalMergeSuggestionService)
7. Merge Queue      → MergeAuditService (classificação de confiança)
8. Merge Execution  → MergeExecutorService (approve/execute/rollback)
9. Comparable Coverage → derivado de offers.canonical_product_id (CPC)
10. Opportunity Engine → src/domains/buyer-intelligence/services/OpportunityEngine.ts
11. Buyer Intelligence → src/domains/buyer-intelligence/ (6 composers)
12. Marketplace Health → src/domains/marketplace-operations/health/MarketplaceHealthEngine.ts
```

Cada seta abaixo é uma dependência de dado real, não uma chamada de função direta — os domínios permanecem desacoplados (regra já estabelecida: `taxonomy/` e `product-intelligence/` são funções puras, zero I/O, zero dependência de `product-identity/`/`canonical-catalog/`/`connectors/`).

---

## 1 → 2: Sync → Canonical

**O que faz**: cada conector (`shoppingchina`, `megaeletronicos`, `romashopping`, `atacadoconnect`, `mobilezone`, mais `nissei`/`cellshop` residuais) grava `products`/`offers`; o Canonical Bootstrap (`scripts/canonical-catalog-bootstrap.ts`, Program Ω Mission Ω-1) cria 1 `canonical_products` por produto na primeira passada (hoje 1:1 — nunca fundiu automaticamente, por desenho: Shadow Mode).

**Ponto de medição**: `ConnectorHealthService.getSummaries()` → fatores `connector_health`/`connector_errors`/`freshness` do `MarketplaceHealthEngine`.

**Estado real**: 95/100, 98/100, 60/100 respectivamente — estágio saudável. Não é o gargalo.

## 2 → 3: Canonical → Taxonomy

**O que faz**: `src/domains/taxonomy/data/universal-tree.ts` define 11 departamentos e mapeia 129 slugs reais de `categories` (verificados linha por linha, `scripts/kappa2-tree-verify.ts`) — mas é uma camada semântica pura, sem consumidor ainda. `canonical_products.category_id` continua apontando para as 929 categorias brutas dos merchants.

**Ponto de medição**: `MarketplaceHealthEngine` fator `coverage` (11/929 categorias com produto); `Category Fragmentation Ratio` (`MARKETPLACE_KPIS.md`).

**Estado real**: migration `20260715140000_universal_taxonomy.sql` pronta, **backfill não executado** — depende de autorização explícita do CTO (mesmo padrão do Merge Execution Engine). Este é um gargalo real, não de engenharia.

## 3 → 4: Taxonomy → Product Signature

**O que faz**: independente da Taxonomy (não depende dela), `src/domains/product-intelligence/extraction/ProductSignatureExtractor.ts` normaliza as 323 chaves fragmentadas de `specifications` (`COR`/`Color`/`cor` → uma chave oficial) e extrai atributos estruturados (cor, capacidade, RAM, voltagem, EAN/MPN) do texto do nome quando `specifications` está vazio.

**Ponto de medição**: `Product Signature Extraction Yield` (`MARKETPLACE_KPIS.md`) — medido apenas por simulação (`scripts/kappa3-cross-merchant-simulation.ts`), nunca em produção.

**Estado real**: construído, testado, validado contra ~1,3M pares reais em modo simulação — **nunca escreveu em produção**. `ProductIdentityEngine` continua recebendo `specifications` bruto no fluxo real.

## 4 → 5: Product Signature → Product Identity

**O que faz (quando wired)**: o `ProductSignatureExtractor` alimentaria sua saída de volta ao único canal que o `ProductIdentityEngine` já lê — o campo `specifications` de `EvaluableProduct`/`MatchCandidate` — sem alterar uma linha do fator `specOverlap` do Engine (existente desde a Release 1.7).

**Ponto de medição**: nenhuma mudança na saída do Engine hoje, porque a entrada não mudou. Este é o elo perdido do pipeline — o único estágio que, uma vez wired, tem simulação real provando +199 produtos comparáveis sem tocar o Engine.

## 5 → 6: Product Identity → Merge Candidates

**O que faz**: `CanonicalMergeSuggestionService` já grava `merge_candidates` para todo par que passa no piso de confiança ≥70% — infraestrutura de Program Κ/Λ, intocada por esta Mission.

**Estado real**: 3.072 candidatos pendentes hoje — a fila é alimentada continuamente pela sincronização de cada merchant.

## 6 → 7 → 8: Merge Candidates → Merge Queue → Merge Execution

**O que faz**: `MergeAuditService` reclassifica cada candidato pendente (Alta ≥95% / Média 85-94% / Manual 70-84%, limiares já aprovados pelo CTO). `MergeExecutorService.execute()` só processa candidatos em status `Approved` (decisão humana explícita, nunca automática — Shadow Mode permanente). `rollback()` reverte por `moved_offer_ids` auditado, nunca por inferência de estado atual.

**Ponto de medição**: `Merge Queue Depth`, `Merge Success Rate`, `Rollback Rate` (`MARKETPLACE_KPIS.md`).

**Estado real**: 3.072 pendentes · 14 aprovados aguardando execução · 19 executados · 1 revertido (5% rollback rate, dentro de uma amostra pequena). O executor funciona em produção — só roda em escala mínima frente à fila.

## 8 → 9: Merge Execution → Comparable Coverage

**O que faz**: cada merge executado marca a linha `source` como `is_active=false`/`merged_into_id`, e repointa `offers.canonical_product_id` para o `target` — a única FK que precisa mudar (confirmado por auditoria de código antes da migration, `MERGE_EXECUTION_ENGINE.md` §3). Isso é literalmente o que move o CPC.

**Ponto de medição**: `scripts/cpc-report.ts` — CPC, CPC-3/4/5+, histograma de lojas, overlap matrix.

**Estado real**: CPC = 0,03% (6 produtos). Com apenas 19 execuções reais até hoje, o efeito no CPC marketplace-wide ainda não é visível — consistente com o achado de Sprint 2.6/2.7 (fila grande, execução pequena).

## 9 → 10 → 11: Comparable Coverage → Opportunity Engine → Buyer Intelligence

**O que faz**: `OpportunityEngine` e os 6 composers de `buyer-intelligence/` (`BestDealComposer`, `ComparisonIntelligenceComposer`, `ParaguAIAdvisorComposer`, `ProductIntelligenceComposer`, `PurchaseTimingComposer`, `SearchIntelligenceComposer`, `TrustComposer` — Program Π) consomem CPC/preço/reputação já existentes via composição `Promise.allSettled`, sem duplicar lógica de nenhum domínio fonte.

**Ponto de medição**: `Opportunity Coverage`, `Buyer Decision Coverage` — **formulas definidas, não medidas nesta baseline** (ver `MARKETPLACE_KPIS.md` §5). Este é o próximo gap de instrumentação, não de arquitetura.

## 11 → 12: Buyer Intelligence → Marketplace Health

**O que faz**: `MarketplaceHealthEngine.compute()` agrega 8 fatores independentes (`Promise.allSettled`, um fator falho não derruba os outros) num único score.

**Ponto de medição**: Marketplace Health Score = 63/100; AI Readiness Score = 52,6/100.

---

## Onde o pipeline realmente trava hoje

Não é um estágio quebrado — é dois estágios **construídos e não conectados/executados em escala**:

1. **Taxonomy → Canonical**: migration pronta, backfill não autorizado.
2. **Product Signature → Product Identity**: extração pronta e validada por simulação, nunca wired ao Engine real.

Mais um estágio **conectado mas subutilizado**:

3. **Merge Queue → Merge Execution**: executor funcionando em produção (19 execuções reais, 95% de sucesso), mas processando ~0,6% da fila pendente (19/3.072).

Nenhum desses três é um problema de arquitetura ou de algoritmo — os três já têm solução construída e testada. São decisões de execução pendentes de autorização/priorização do CTO. Ver `MARKETPLACE_OPTIMIZATION.md` §Executive Recommendation.
