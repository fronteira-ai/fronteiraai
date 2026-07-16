# PRODUCT_IDENTITY_PIPELINE.md
# Program Κ — Mission Κ-4 — Product Identity Integration

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-16
**Status**: Pipeline oficial, pós-wiring. Diagrama e estado por estágio — nenhum algoritmo, peso, threshold ou score foi alterado nesta Mission; apenas o encanamento entre estágios já construídos por Κ-1/Κ-2/Κ-3/Ω-1.

---

## Diagrama oficial

```
Canonical Product (canonical_products, Program Ω Mission Ω-1)
  │
  ▼
Universal Taxonomy (src/domains/taxonomy/, Κ-2)          ✅ CONECTADO (Κ-4)
  │  categoryId (UUID) → categories.slug (batch lookup,
  │  novo) → findNodeByRealCategorySlug() (Κ-2, já existia)
  ▼
Product Signature (src/domains/product-intelligence/, Κ-3) ✅ CONECTADO (Κ-4)
  │  buildProductSignature() (Κ-3, já existia) → flatten
  │  para Record<string,string> (novo, glue puro)
  ▼
ProductIdentityEngine (src/domains/product-identity/)     ✅ EM PRODUÇÃO, INTOCADO
  │  mesmo arquivo, mesmos pesos (NAME 50/SPEC 30/MODEL 20),
  │  mesmo MISMATCH_CAP=40, mesmos thresholds (95/85/70) —
  │  zero linha alterada nesta Mission.
  ▼
Merge Candidates (merge_candidates, via CanonicalMergeSuggestionService) ✅ EM PRODUÇÃO
  │  única mudança: os dois objetos que entram no Engine
  │  (EvaluableProduct/MatchCandidate) agora carregam
  │  categorySlug e specifications wired, não mais os
  │  valores brutos de canonical_products.
  ▼
Merge Queue (MergeAuditService, Program Ω)                 ✅ EM PRODUÇÃO, INTOCADO
  │  só reclassifica confidence já computada — nunca
  │  reexecuta o Engine.
  ▼
Merge Engine / Executor (MergeExecutorService, Program Ω)  ✅ EM PRODUÇÃO, INTOCADO
     approve/execute/rollback — decisão humana explícita,
     Shadow Mode permanente, inalterado por esta Mission.
```

## Estado por estágio (Objetivo 1)

| Estágio | Antes de Κ-4 | Depois de Κ-4 |
|---|---|---|
| Canonical Product | Em produção | Inalterado |
| Universal Taxonomy | Construída (Κ-2), **não consumida** — `taxonomy/index.ts` dizia explicitamente "deliberately not consumed" | **Conectada** — única consumidora real: `CanonicalMergeSuggestionService.resolveCategoryGateSlug()` |
| Product Signature | Construída e validada por simulação (Κ-3), **não consumida** — mesma nota explícita em `product-intelligence/index.ts` | **Conectada** — única consumidora real: `CanonicalMergeSuggestionService.signatureToSpecifications()` |
| ProductIdentityEngine | Em produção, recebia `categoryId`/`specifications` brutos | Em produção, recebe `categorySlug` resolvido pela Universal Taxonomy e `specifications` normalizadas pelo Product Signature — **arquivo `ProductIdentityEngine.ts` byte-a-byte idêntico** |
| Merge Candidates | Gerados a partir de dado bruto fragmentado | Gerados a partir de dado normalizado — mesma função `suggestMergesFor`, mesma assinatura pública |
| Merge Queue | Em produção, classificação por threshold | Inalterado |
| Merge Engine | Em produção, 19 execuções reais (Φ-1) | Inalterado |

## O que "apenas simula" vs. "está em produção" hoje

- **Em produção, real, com efeito imediato no próximo `suggestMergesFor()` chamado**: a wiring em si (`CanonicalMergeSuggestionService.ts`) — já mesclada no código, coberta por lint/typecheck/test/build verdes.
- **Simulação, não persistida**: a reavaliação completa do catálogo (Objetivo 5/6 desta Mission) rodou a função real, sobre dado real, com repositórios em memória — **nenhum `merge_candidates` novo foi escrito em produção**. Mesma disciplina que `scripts/kappa3-cross-merchant-simulation.ts` já usava. Resultados em `PRODUCT_IDENTITY_INTEGRATION.md` §Cross Merchant Evaluation, explicitamente rotulados.

## Duplicidade encontrada (Objetivo 3 — "caso exista, documentar")

Existe um **segundo caminho** que também avalia Product Identity, e que esta Mission **não tocou**: `src/domains/connectors/services/stages/ProductIdentityShadowStage.ts`, chamado durante a sincronização de cada conector. Ele já usa `categorySlug`/`brandSlug` reais (strings vindas de `OfferNormalizer`, não UUIDs) — nunca teve o problema de UUID que `CanonicalMergeSuggestionService` tinha. Mas ele:

1. Opera no nível de **produto por oferta** (pré-canonicalização), não de `canonical_products` — não gera `merge_candidates`, apenas grava um log de auditoria (`IProductIdentityMatchLogRepository`, Shadow Mode desde a Release 1.7).
2. **Não usa a Universal Taxonomy nem o Product Signature** — continua recebendo o `categorySlug`/`specifications` como o `OfferNormalizer` já os monta, sem o wiring desta Mission.

Isso é uma duplicidade real de caminho (dois lugares avaliam Product Identity, com insumos diferentes), mas **não uma duplicidade de decisão** — só `CanonicalMergeSuggestionService` grava algo que afeta o catálogo (`merge_candidates`); o Shadow Stage é auditoria pura, sem efeito em Comparable Coverage. Nomeado aqui como dívida técnica candidata para uma Mission futura (unificar os dois caminhos ou documentar formalmente por que devem permanecer distintos) — fora do escopo de "apenas conectar componentes existentes" desta Mission, que tratou exclusivamente do caminho que efetivamente move CPC.

## Migration Κ-2 — status inalterado

`supabase/migrations/20260715140000_universal_taxonomy.sql` (5 tabelas: `universal_categories`, `category_universal_map`, `canonical_brands`, `brand_universal_map`, `model_aliases`, `attribute_dictionary`) **continua não aplicada**. O wiring desta Mission não precisou dela — `findNodeByRealCategorySlug()` já operava sobre a árvore estática em código (`src/domains/taxonomy/data/universal-tree.ts`), zero I/O, exatamente como Κ-2 a desenhou. A migration permanece uma melhoria futura legítima (consulta SQL direta, admin UI), não um bloqueio para o que esta Mission entregou.
