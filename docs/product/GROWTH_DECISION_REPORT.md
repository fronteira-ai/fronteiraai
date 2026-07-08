# GROWTH_DECISION_REPORT.md
# PROGRAM Δ — Mission Δ-3 — Decisão de Crescimento

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08

---

## Decisão

# Opção B — Baixa sobreposição. Prioridade: integrar novos merchants.

## Por que não é Opção A (melhorar matching)

Matching já foi exaustivamente testado contra o catálogo real: **2.913 avaliações acumuladas** (`ProductIdentityEngine` via `CanonicalMergeSuggestionService`, rodadas em Ω-4.1, Δ-2 e Δ-3) produziram **zero** `MergeCandidate`, mesmo comparando produtos da mesma marca. Isso não é falta de execução do matching — é ausência de material para ele encontrar. `OFFER_CONVERGENCE_ANALYSIS.md` confirma isso pela raiz: os 4 merchants reais compartilham **1 produto em 1.262**. Não há sobreposição escondida que uma heurística melhor revelaria — os catálogos são, de fato, quase inteiramente distintos. Investir em ajustar heurística de matching agora otimizaria a busca por algo que os dados mostram não existir em volume.

## Por que não é Opção C (combinação)

Uma combinação se justificaria se houvesse evidência de sobreposição parcial não capturada — não é o caso. `MERCHANT_OVERLAP_MATRIX.md` mostra 0% de sobreposição em 5 de 6 pares, e 0,44% no único par com alguma. Não há um "meio termo" quantitativo aqui para justificar dividir o investimento.

## Por que é Opção B, com uma condição

**A evidência aponta para mais merchants — mas não para qualquer merchant.** `MERCHANT_OVERLAP_MATRIX.md` mostra que o único par com sobreposição real (Shopping China × Mega Eletrônicos, ambos "eletrônicos/importados gerais") tem perfil de categoria mais próximo entre si do que Roma Shopping/Atacado Connect (perfis mais amplos/distintos). Isso é um sinal real, não uma opinião: **integrar merchants por tamanho de catálogo não gerou concorrência de preço; integrar por proximidade de categoria com o que já existe é a hipótese que os dados favorecem.**

## Ação recomendada, com critério revisado

`MERCHANT_PRIORITY_MATRIX.md` (Mission Δ-1) priorizou os 6 merchants Tier 1 restantes por relevância comercial e viabilidade técnica. Esta missão adiciona um terceiro critério, agora com base quantitativa: **proximidade de categoria com o perfil de Shopping China/Mega Eletrônicos** (eletrônicos/celulares/informática) deve pesar mais do que tamanho de catálogo estimado ao decidir a ordem de integração dos 6 restantes — Cellshop e Nissei (ambos eletrônicos/celulares, coincidentemente os 2 nomes que já apareciam na base como seed antigo) e Mobile Zone/Visão VIP (ambos eletrônicos/celulares/informática) são, por perfil declarado, candidatos mais prováveis a gerar convergência real do que New Zone/Casa Americana (perfis mais genéricos/atacado).

Nenhum merchant novo foi integrado por esta missão — restrição explícita respeitada. Esta é uma recomendação de **ordem**, não uma execução.
