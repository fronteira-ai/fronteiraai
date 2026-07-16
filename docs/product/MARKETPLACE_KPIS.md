# MARKETPLACE_KPIS.md
# Program Φ (Phi) — Mission Φ-1 — Continuous Comparability Optimization

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Status**: Catálogo oficial de KPIs de marketplace. Nenhum KPI aqui exige novo algoritmo — todos são reaproveitados de engines/scripts já existentes e certificados (`MarketplaceHealthEngine`, `cpc-report.ts`, `merge-audit-report.ts`, `kappa2/3-*-audit.ts`).
**Ver também**: `MARKETPLACE_OPTIMIZATION.md` (baseline + roadmap), `docs/architecture/MARKETPLACE_PIPELINE.md` (onde cada KPI é medido no pipeline).

---

## Convenção

Cada KPI tem: **Fórmula**, **Fonte** (engine/tabela/script que já o calcula), **Baseline real** (medido ao vivo em 2026-07-16, nunca projeção), **Cadência recomendada**.

Todo valor abaixo veio de execução real, read-only, contra produção — `npm run observatory:report`, `npm run cpc:report`, `npx tsx scripts/merge-audit-report.ts`, `npx tsx scripts/kappa2-taxonomy-audit.ts`, `npx tsx scripts/kappa3-attribute-audit.ts`, mais uma contagem pontual de `merge_executions`/`merge_candidates` por `status` (mesmo padrão read-only dos scripts acima, não persistida como script novo).

---

## 1. Comparability KPIs

### Comparable Product Coverage (CPC)
**Fórmula**: `canonical_products` com oferta de **2+** merchants distintos ÷ `canonical_products` com ≥1 oferta.
**Fonte**: `scripts/cpc-report.ts`.
**Baseline real**: **6 / 17.990 = 0,03%**.

### CPC-3 / CPC-4 / CPC-5+
**Fórmula**: mesma base, threshold em 3/4/5+ merchants.
**Baseline real**: CPC-3 = **0 (0,00%)**; CPC-4 = **0**; CPC-5+ = **0**. Nenhum produto do marketplace hoje tem 3 ou mais lojas comparáveis simultaneamente.

### Offer Density
**Fórmula**: total de `offers` ÷ total de `canonical_products` com oferta.
**Fonte**: `scripts/cpc-report.ts`.
**Baseline real**: **18.015 / 17.990 = 1,0003** — para efeitos práticos, 1 oferta por produto.

### Store-Count Histogram
**Fórmula**: distribuição de `canonical_products` por número de merchants distintos que o vendem.
**Baseline real**: 1 loja: 17.984 · 2 lojas: 6 · 3 lojas: 0 · 4 lojas: 0 · 5+ lojas: 0.

### Merchant Overlap Matrix
**Fórmula**: para cada par de merchants, `canonical_products` vendidos por ambos ÷ tamanho do menor catálogo dos dois.
**Baseline real**: maior overlap observado é 50% (`atacado-connect × cellshop`, `shopping-china × nissei`, `nissei × cellshop`) — mas em valor absoluto é **1 produto** em cada caso (cellshop/nissei têm apenas 2 ofertas cada no total). Os 5 merchants substanciais (mobile-zone, mega-eletronicos, shopping-china, roma-shopping, atacado-connect) têm overlap real de **0-1 produto por par**.

---

## 2. Merge Pipeline KPIs

### Merge Queue Depth
**Fórmula**: `merge_candidates` com `status='pending'`, segmentado por confiança (Alta ≥95%, Média 85-94%, Revisão manual 70-84% — limiares já aprovados pelo CTO em `product-identity/types/enums.ts`).
**Fonte**: `MergeAuditService` via `scripts/merge-audit-report.ts`.
**Baseline real**: **3.072 pendentes** — Alta: **0** · Média: **1.114** · Manual: **1.958**.

### Merge Success Rate
**Fórmula**: `merge_executions` com `status='executed'` ÷ total de `merge_executions`.
**Fonte**: contagem direta em `merge_executions` (mesmo padrão read-only dos scripts acima).
**Baseline real**: **19 / 20 = 95%**.

### Rollback Rate
**Fórmula**: `merge_executions` com `status='rolled_back'` ÷ total de `merge_executions`.
**Baseline real**: **1 / 20 = 5%**.

### Merge Funnel
**Fórmula**: contagem de `merge_candidates` por `status` (`pending`/`approved`/`merged`/`rejected`/`ignored`/`rolled_back`).
**Baseline real**: pending **3.072** · approved (aguardando execução) **14** · merged **19** · rejected **0** · ignored **0**. Isso confirma que o Merge Execution Engine (Program Ω, Mission Ω-1) já rodou em produção — não é um piloto teórico — mas em escala mínima (20 execuções) frente à fila real (3.072).

---

## 3. Taxonomy & Attribute KPIs

### Category Fragmentation Ratio
**Fórmula**: categorias reais (`categories`) ÷ conceitos universais mapeados (`universal_categories`, Program Κ Mission Κ-2).
**Baseline real**: **929 categorias reais ÷ 129 slugs mapeados na Universal Taxonomy = 7,2x de fragmentação**. A árvore universal existe (`src/domains/taxonomy/`) mas seu backfill (`supabase/migrations/20260715140000_universal_taxonomy.sql`) **não foi aplicado** — a fragmentação medida ainda é a bruta.

### Category-Product Coverage
**Fórmula**: categorias com ≥1 produto com oferta ÷ total de categorias.
**Fonte**: `MarketplaceHealthEngine` (fator `coverage`).
**Baseline real**: **11 / 929 = 1,2%**.

### Category Language Consistency
**Fórmula**: % de categorias classificadas de forma determinística (PT ou ES ou EN) vs. "Indeterminado" (heurística lexical, não classificador real — ver cabeçalho de `kappa2-taxonomy-audit.ts`).
**Baseline real**: PT 11,6% · ES 6,2% · EN 1,0% · Indeterminado 81,2%.

### Brand Duplication Rate
**Fórmula**: linhas de `brands` envolvidas em algum grupo de duplicata (normalização de caixa/pontuação/sufixo) ÷ total de `brands`.
**Baseline real**: **4 / 852 = 0,5%** (2 grupos: "Meta Quest", "Rayban Meta"). Marca é a dimensão de taxonomia **menos** fragmentada — o problema real está em categoria e atributo, não em marca.

### Product Signature / Attribute Coverage
**Fórmula**: `canonical_products` com `specifications` não-vazio ÷ total.
**Fonte**: `scripts/kappa3-attribute-audit.ts`.
**Baseline real**: **11.432 / 18.010 = 63,5%** não-vazio (36,5% vazio). 323 chaves distintas, fortemente fragmentadas por caixa/idioma (`Modelo`/`MODELO`/`modelo`; `COR`/`Color`/`cor`).

### Product Signature Extraction Yield (simulado, não produção)
**Fórmula**: pares cross-merchant que sobem de faixa de confiança quando o `ProductSignatureExtractor` (Program Κ, Mission Κ-3) substitui `specifications` bruto na entrada do `ProductIdentityEngine`, sem alterar o Engine.
**Fonte**: `scripts/kappa3-cross-merchant-simulation.ts` (simulação read-only sobre ~1,3M pares reais).
**Resultado medido (simulação, não produção)**: Média 0→10, Manual 2→306, produtos desbloqueados 2→199. **Esta camada não está ligada ao `ProductIdentityEngine` em produção** — o número de produção equivalente hoje é o CPC de 0,03% acima.

---

## 4. Marketplace-Level KPIs

### Marketplace Health Score
**Fórmula**: média não-ponderada de 8 fatores (0-100 cada): `connector_health`, `connector_errors`, `freshness`, `coverage`, `canonical_catalog`, `discovery`, `claims`, `analytics_brain_volume`. Cada fator falho pontua 0 com motivo registrado (nunca omitido) — `MarketplaceHealthEngine.compute()`, `Promise.allSettled`.
**Fonte**: `src/domains/marketplace-operations/health/MarketplaceHealthEngine.ts` via `npm run observatory:report`.
**Baseline real**: **63/100** — connector_health 95 · connector_errors 98 · freshness 60 · coverage 1 · canonical_catalog 100 · discovery 0 · claims 100 · analytics_brain_volume 50.

### AI Readiness Score
**Fórmula**: média de 3 componentes (0-100 cada): Canonical Coverage (% ofertas com `canonical_product_id`), Comparable Products (CPC, 2+ merchants), Price Trend Readiness (% produtos com 2+ pontos de `price_history`). Fórmula definida em `docs/product/MARKETPLACE_TRUTH_REPORT.md`.
**Fonte**: `scripts/marketplace-observatory-report.ts`.
**Baseline real**: **52,6/100** — Canonical Coverage 100% · Comparable Products 0,03% · Price Trend Readiness 57,62% (10.380/18.015).

### Merchant Coverage
**Fórmula**: merchants com ≥1 oferta ativa, segmentado por volume.
**Baseline real**: 7 merchants com oferta — 5 substanciais (mobile-zone 7.204, mega-eletronicos 5.245, shopping-china 2.446, roma-shopping 1.564, atacado-connect 1.552) e 2 residuais (nissei 2, cellshop 2 — consistente com o bloqueio de robots.txt já documentado em `docs/marketplace/MARKET_COVERAGE_REPORT.md`, Program Κ Mission A Wave 3).

---

## 5. KPIs definidos mas não medidos nesta baseline (honestidade de gap, Quality Gate)

### Opportunity Coverage
**Fórmula proposta**: `canonical_products` com pelo menos 1 sinal ativo de `OpportunityEngine` (best deal / purchase timing / comparison) ÷ `canonical_products` com oferta.
**Status**: `OpportunityEngine` (`src/domains/buyer-intelligence/services/OpportunityEngine.ts`) existe e é consumido, mas nenhum script hoje agrega esse número marketplace-wide. Não medido nesta baseline — nomeado como gap real, não estimado.

### Buyer Decision Coverage
**Fórmula proposta**: buscas reais (`buyer_events` tipo search) que retornam ≥1 produto comparável (CPC-eligible) ÷ total de buscas.
**Status**: mesma limitação — `buyer_events` tem apenas 46 eventos nos últimos 7 dias (volume real, ver `MarketplaceHealthEngine` fator `analytics_brain_volume`), insuficiente para uma leitura estatisticamente estável ainda. Não medido nesta baseline.

Ambos entram no `MARKETPLACE_FEEDBACK_LOOP.md` como próximos a instrumentar — nenhum exige algoritmo novo, apenas uma agregação sobre dado que já existe.
