# MARKETPLACE_TRUTH_REPORT.md
# PROGRAM Δ — Mission Δ-3 — A Fotografia Definitiva

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08 — medição read-only direta contra produção, catálogo 100% canonicalizado (`CATALOG_COMPLETION_REPORT.md`)

---

## Série histórica completa

| Métrica | Ω-4.0 (baseline) | Ω-4.1 (bootstrap parcial) | Δ-2 (após ativação+resync) | **Δ-3 (definitivo)** |
|---|---|---|---|---|
| Products | 650 | 650 | 1.263 | **1.263** |
| Offers | 653 | 653 | 1.266 | **1.266** |
| Canonical Products | 36 | 650 | 1.009 | **1.263** |
| Canonical Coverage (produtos) | 5,5% | 100%* | 79,9% | **100%** |
| Canonical Match Rate (ofertas) | 5,97% | 100%* | 79,9% | **100%** |
| Products Without Canonical | 614 | 0* | 254 | **0** |
| Merge Candidates | 0 | 0 | 0 | **0** |
| Offer Density | 1,0046 | 1,0046 | 1,0024 | **1,0024** |
| Brands | 140 | 140 | 199 | 199 |
| Categories | 175 | 175 | 305 | 305 |

*Ω-4.1 atingiu 100% sobre os 650 produtos que existiam **naquele momento** — o catálogo cresceu depois (Δ-2), reabrindo o gap que esta missão fecha em definitivo sobre os 1.263 produtos de hoje.

## As métricas novas exigidas por esta missão

| Métrica | Valor | Método |
|---|---|---|
| **Products With Multiple Offers** | 4 de 1.262 canonical products com oferta (0,32%) | `canonical_product_id` com ofertas de 2+ `store_id` distintos |
| **Products With Single Offer** | 1.258 de 1.262 (99,68%) | Inverso do item acima |
| **Duplicate Groups** | 0 | `merge_candidates` — 2.913 avaliações acumuladas (Ω-4.1: 650 + Δ-2: 1.000 + Δ-3: 1.263), zero em qualquer status |
| **Merchant Coverage** | 4 conectores reais de 10 Tier 1 auditados (40%) — inalterado por esta missão | `docs/marketplace/Tier1_Merchants.md` |
| **Category Coverage** | 100% dos produtos com categoria preenchida; 305 categorias distintas para 1.263 produtos (~4,1 produtos/categoria — fragmentação, não medida nominalmente) | `products.category_id` |
| **Brand Coverage** | 100% preenchido; 199 marcas para 1.263 produtos (~6,3 produtos/marca) | `products.brand_id` |
| **Marketplace Density Score** | **83,2/100** (era 78,1 em Δ-2, 59,7 no baseline Ω-4.0) | Ver fórmula abaixo |
| **AI Readiness Score** | **34,2/100** (nova métrica desta missão) | Ver definição abaixo |

## Marketplace Density Score — recálculo final

| Fator | Peso | Valor | Contribuição |
|---|---|---|---|
| Images per Product | 20% | 99,05% | 19,8 |
| Categories Coverage | 15% | 100% | 15,0 |
| Brand Coverage | 15% | 100% | 15,0 |
| Canonical Coverage | 25% | **100%** | **25,0** |
| Offer Density (meta=3,0) | 25% | 33,4% | 8,4 |
| **Total** | | | **83,2** |

Canonical Coverage deixou de ser um fator limitante — contribui o máximo possível (25,0/25,0). **Offer Density agora é, isoladamente, o único fator abaixo do potencial pleno.**

## AI Readiness Score — definição nova, proposta por esta missão

Mede, de forma direta, quantos produtos o ParaguAI já pode responder com uma resposta comparativa/histórica real — não uma capacidade de infraestrutura, uma capacidade de **resposta útil hoje**:

| Componente | Valor | O que mede |
|---|---|---|
| Canonical Coverage | 100% | Pré-requisito — todo produto tem identidade resolvida |
| Comparable Products (2+ ofertas por canonical) | 0,32% (4/1.262) | Quantos produtos permitem "qual loja tem o menor preço" com resposta não-trivial |
| Price Trend Readiness (2+ pontos de histórico) | 2,13% (27/1.266) | Quantos produtos permitem "esse preço está bom pra época" com dado real |

**AI Readiness Score = média simples dos 3 componentes = (100 + 0,32 + 2,13) / 3 = 34,2/100.**

**Leitura honesta**: a infraestrutura de identidade está 100% pronta, mas isso sozinho não gera uma resposta de IA melhor — precisa de **volume de comparação real**, que está em 0,32%. Isso não é pessimismo, é a mesma disciplina de `AI_CONSTITUTION.md` §IX: "a qualidade da inteligência é diretamente proporcional à qualidade dos dados que a alimentam." Hoje, o dado que alimenta comparação real é escasso.

## Nível de confiança de cada número

Todos os valores desta tabela são medição direta (`Alto`), exceto: fragmentação de marca/categoria nominal (não medida, apenas a proporção agregada) e Merchant Coverage (herda o denominador qualitativo "10 Tier 1" de `Tier1_Merchants.md`, não uma contagem do banco).
