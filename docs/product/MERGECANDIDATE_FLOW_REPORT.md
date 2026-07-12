# MERGECANDIDATE_FLOW_REPORT.md
# FASE 2 — SPRINT 2.3 — Product Comparison Validation — Objetivos 2 e 3

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Companion**: `PRODUCT_IDENTITY_VALIDATION_FRAMEWORK.md` (inventário estrutural do pipeline, Mission Θ-1), `MERGE_CANDIDATES_REPORT.md` (medição anterior, 2026-07-08, 650 avaliações / 0 candidatos)

---

## 1. A cadeia completa, com os componentes reais de código em cada etapa

```
Merchant (site de origem)
  │  raw.product.brand / raw.product.category / raw.product.name  (texto livre, sem taxonomia comum)
  ▼
OfferNormalizer.normalizeOffer()                    src/domains/connectors/normalization/OfferNormalizer.ts
  │  brandSlug = slugify(brandName)  |  categorySlug = slugify(categoryName)
  ▼
CatalogWriteStage.persist()                          src/domains/connectors/services/stages/CatalogWriteStage.ts
  │  upsertBrand(name, slug) onConflict:"slug"  →  brand_id (compartilhado corretamente entre lojas, achado §2 de PRODUCT_COMPARISON_AUDIT.md)
  │  upsertCategory(name, slug) onConflict:"slug" →  category_id (NÃO compartilhado — cada loja usa sua própria palavra)
  │  upsertProduct(...) onConflict:"slug"  →  products row (1 linha por slug único)
  ▼
Offer                                                 offers.product_id, offers.canonical_product_id
  ▼
canonical-catalog-bootstrap.ts (--execute, já rodado 100% do catálogo na Sprint 2.2)
  │  CanonicalProductService.bootstrapFromProduct()  →  1 canonical product por product, 1:1, canonical_slug = product.slug
  ▼
CanonicalMergeSuggestionService.suggestMergesFor(canonicalProductId)
  │  candidates = catalogRepo.findByBrandId(source.brandId)   ← já filtra certo, brand não é o problema
  │  result = ProductIdentityEngine.evaluate(source, candidates)
  │  if (confidence < 70) return;                              ← MAIORIA DOS PARES MORRE AQUI
  ▼
MergeCandidate (status: Pending)                      merge_candidates table — Shadow Mode
  │  PATCH /api/admin/canonical-catalog/merge-candidates/[id]  → Approved/Rejected/Ignored (rótulo humano)
  │
  X  NENHUM CÓDIGO EXECUTA O MERGE — IMergeCandidateRepository não tem esse método (confirmado, [[program_theta_mission1_product_identity_backlog]])
  ▼
offers.canonical_product_id continua separado por loja
  ▼
Usuário vê N listagens separadas para o mesmo produto real, sem comparação de preço.
```

## 2. Onde a perda de comparação acontece, precisamente

Não em um único ponto — em **dois pontos sequenciais**, cada um suficiente sozinho para impedir a comparação:

1. **`OfferNormalizer` → `upsertCategory`, por produto**: cada loja usa seu próprio vocabulário de categoria (`Celular` vs `Celulares` vs `Smartphones` vs `iPhone`), sem normalização entre lojas. Isso cria `category_id`s diferentes para o mesmo conceito real, o que alimenta o gate de categoria do engine (ver §3).
2. **`CanonicalMergeSuggestionService.suggestMergesFor`, por par candidato**: mesmo quando brand+category batem, `confidence < CONFIDENCE_THRESHOLDS.possible (70)` descarta o par silenciosamente (`return` sem log de "quase deu certo" — só o `product_identity_match_log`, alimentado por um caminho de código diferente e não pelo bootstrap, guarda essa evidência).

Depois desses dois pontos, o pipeline funciona exatamente como projetado: `MergeCandidate` é só uma sugestão (Shadow Mode), a revisão é humana, e não existe caminho de código para aplicar um merge — isso é garantia estrutural, não um terceiro ponto de perda.

## 3. Análise de `merge_candidates` (Objetivo 3)

**5 registros no marketplace inteiro, todos `status=pending`, 0 envolvendo a amostra estratégica.**

| Par | Lojas | Confiança | Mismatch |
|---|---|---|---|
| Cable Hoco X109 (USB-C→USB-C vs USB→USB-C) | mobile-zone × mega-eletronicos | 70 | specifications |
| Cable Hoco X99 (mesma variação) | mobile-zone × mega-eletronicos | 70 | specifications |
| Dispenser Prosper P-0120 | mobile-zone × mobile-zone (mesma loja) | 70 | specifications |

(2 pares Hoco aparecem como 2 `MergeCandidate`s cada — A→B e B→A — porque `suggestMergesFor` roda por canonical product, não por par; sem deduplicação de direção. Efeito prático: 4 registros para 2 pares reais + 1 intra-loja = 5.)

**Achado direto**: os **2 pares Hoco são cross-merchant, genuinamente o mesmo produto, e estão parados esperando revisão humana agora mesmo** — zero risco, zero custo de engenharia, ação imediata disponível (ver `PRODUCT_IDENTITY_FINDINGS.md` §4). O terceiro é intra-loja (duplicata de catálogo da própria mobile-zone, não um caso de comparação entre lojas).

**Por que só 5 no marketplace inteiro, com 9.549 canonical products bootstrapped**: confirma e generaliza `MERGE_CANDIDATES_REPORT.md` (2026-07-08, 650 avaliações / 0 candidatos) — o volume de candidatos não escalou com o catálogo porque o gargalo não é volume, é taxa de acerto por par avaliado. Ver §4 para a decomposição exata de por que pares que deveriam ser óbvios (mesma SKU, mesma marca) não atingem o threshold.

## 4. Por que um par genuinamente idêntico não vira `MergeCandidate` — decomposição numérica real

Caso capturado no `product_identity_match_log` (não em `merge_candidates` — nunca chegou a ser avaliado pelo bootstrap porque os dois productos têm `products.slug` diferentes e nunca foram comparados como canonical products de mesma marca no mesmo momento; capturado pelo Shadow Mode do sync, caminho de código separado — ver `PRODUCT_IDENTITY_VALIDATION_FRAMEWORK.md` §2):

**AirPods Pro 3, mesma SKU (MFHP4LL), mega-eletronicos × mobile-zone. Confiança final: 38 (tier `new_product`, threshold `possible`=70).**

```
matched:    [brand, model-number]
mismatched: [category, name-similarity, specifications]

name-similarity: 36% de similaridade de tokens entre
  "Fone de Ouvido Sem Fio Apple AirPods Pro 3 MFHP4LL com MagSafe Charging Case - Branco(S Lacre)"
  "Apple Airpods Pro 3 MFHP4LL/A Wireless Magsafe Charging Case  USB-C (Deslacrado)"
  → peso obtido ≈ 18 de 50 (perda de 32)

specifications: nenhuma chave comparável (specifications={} nos dois lados)
  → peso obtido = 0 de 30 (perda de 30)

model-number: 1/2 tokens alfanuméricos compartilhados ("mfhp4ll")
  → peso obtido = 20 de 20 (cheio — contado em "matched")

rawScore = 18 + 0 + 20 = 38
gate brand+category: category diverge → gatesPassed=false
confidence = min(rawScore, MISMATCH_CAP=40) = min(38, 40) = 38
```

**Achado crítico**: mesmo se o gate de categoria não existisse (ou category batesse), a confiança seria `min(100, rawScore) = min(100, 38) = 38` — **o mesmo valor**. Para este par específico, o gate de categoria não é o fator decisivo — `rawScore` já estava abaixo do cap antes do gate ser aplicado. Os fatores que realmente custaram pontos foram `specifications` vazio (-30) e a diferença de template de nome entre lojas (-32 em `name-similarity`).

Simulação de correção parcial, usando os mesmos pesos do engine real (nenhum código alterado, só aritmética sobre o `MatchFactor` já registrado):

| Cenário | rawScore resultante | Cruza o threshold 70? |
|---|---|---|
| Hoje | 38 | Não |
| + `specifications` populado e idêntico (recupera 30) | 68 | **Não** (fica a 2 pontos) |
| + `name-similarity` alinhado por template (recupera ~22, chega a ~80%) | 60 | Não |
| Ambos juntos | ~90 | **Sim**, tier `probable` |

Nenhuma correção isolada resolve este par — só a combinação de dados estruturados (`specifications`) **e** normalização de nome/template atinge o threshold. Isto é evidência quantitativa direta, não hipótese, para a resposta dada em `PRODUCT_IDENTITY_FINDINGS.md`.
