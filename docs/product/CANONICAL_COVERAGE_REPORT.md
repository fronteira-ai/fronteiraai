# CANONICAL_COVERAGE_REPORT.md
# PROGRAM Δ — Mission Ω-4.1 — Cobertura Canônica Pós-Bootstrap

**Categoria**: `docs/product/` (companion de Program Ω)
**Data**: 2026-07-08

---

## Resultado

| Métrica | Valor |
|---|---|
| Canonical Products totais | 650 |
| Produtos com canonical resolvido | 650 / 650 (**100%**) |
| Ofertas com canonical resolvido | 653 / 653 (**100%**) |
| Razão canonical:produto | 1:1 exato — nenhuma duplicação de canonical por produto, nenhum produto com 2 canonicals |

## Como isso foi alcançado

Espelhamento 1:1 lossless, exatamente como a migration original (Release 1.7 Wave 4) descreveu: cada `products` sem canonical correspondente ganhou um `canonical_products` novo com `canonical_slug = products.slug`, `brand_id`/`category_id`/`image_url`/`specifications` copiados diretamente. **Não é uma união** — nenhum produto foi fundido com outro, nenhuma oferta trocou de produto de origem (`offers.product_id` nunca foi tocado). É a mesma distinção que a migration original já registrava: bootstrap ≠ merge.

## O que "100% de cobertura" significa e o que não significa

**Significa**: todo produto e toda oferta agora têm uma identidade canônica resolvida — o pré-requisito estrutural para `PriceIntelligenceService`, `CompareFoundationService`, `OfferRankingService` e qualquer futuro Recommendation Engine (`ROADMAP_2_0.md` Wave 2) operarem sobre 100% do catálogo, não sobre uma amostra de 5,5%.

**Não significa**: que duplicatas reais entre produtos foram identificadas ou unidas — isso é o papel de `MergeCandidate` (ver `MERGE_CANDIDATES_REPORT.md`), que permanece vazio após esta execução. Cobertura canônica (todo produto tem UM canonical) e deduplicação (produtos que deveriam compartilhar UM canonical mas hoje têm dois) são conceitos diferentes — este relatório mede o primeiro, não o segundo.

## Distribuição por origem (contexto, não medido separadamente nesta Wave)

Os 650 produtos vêm de 4 conectores certificados (Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect) mais o seed original pré-Connector Platform. Como cada conector cobre categorias de produto amplamente não sobrepostas (achado já registrado em `PRODUCTION_BASELINE_1.9.md`), a expectativa a priori de duplicatas *entre* conectores é baixa — reforça, sem provar, a leitura de que zero `MergeCandidate` pode refletir um catálogo genuinamente pouco duplicado hoje, não uma falha de detecção.

## Impacto imediato habilitado

Qualquer serviço que já consulta `offers.canonical_product_id`/`canonical_products` (ex.: `CompareFoundationService`, `PriceIntelligenceService`) passa a enxergar 100% do catálogo na próxima leitura — nenhum código novo, nenhum deploy necessário. O efeito é imediato porque esses serviços já foram escritos para consumir esse campo desde que ele existe; eles só nunca tiveram dado além dos 36 produtos originais para consumir.
