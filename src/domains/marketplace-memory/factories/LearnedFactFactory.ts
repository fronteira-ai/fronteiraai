import type { ProductSignature } from "@/src/domains/product-intelligence";
import { FactType, MARKETPLACE_MEMORY_ALGORITHM_VERSION } from "../types/enums";
import type { LearnedFactInput } from "../types/marketplace-memory.types";

/** Converts the output of `buildProductSignature` (Program Κ-3, unmodified)
 * into persistable LearnedFactInput rows — pure function, zero I/O, same
 * discipline as the extractor it wraps. This is the ONLY place that
 * decides which ProductSignature fields become a fact; adding a new
 * fact_type is a change here, never in product-intelligence/. */
export function factsFromProductSignature(
  canonicalProductId: string,
  signature: ProductSignature,
  merchantId: string | null
): LearnedFactInput[] {
  const facts: LearnedFactInput[] = [];

  function addIfPresent(
    factType: FactType,
    attr: { value: unknown; source: string | null; confidence: string | null; extractedFrom: string | null }
  ) {
    if (attr.value === null || attr.value === undefined) return;
    if (attr.source === null || attr.confidence === null) return; // never a fact without real provenance
    facts.push({
      canonicalProductId,
      factType,
      factValue: Array.isArray(attr.value) ? attr.value.join(", ") : String(attr.value),
      confidence: attr.confidence as LearnedFactInput["confidence"],
      source: attr.source as LearnedFactInput["source"],
      extractedFrom: attr.extractedFrom,
      merchantId,
      origin: "backfill",
      algorithmVersion: MARKETPLACE_MEMORY_ALGORITHM_VERSION,
    });
  }

  addIfPresent(FactType.ManufacturerCode, signature.manufacturerCode);
  addIfPresent(FactType.Model, signature.model);
  addIfPresent(FactType.Color, signature.color);
  addIfPresent(FactType.CapacityGb, signature.capacityGb);
  addIfPresent(FactType.RamGb, signature.ramGb);
  addIfPresent(FactType.ScreenSizeIn, signature.screenSizeIn);
  addIfPresent(FactType.Processor, signature.processor);
  addIfPresent(FactType.Gpu, signature.gpu);
  addIfPresent(FactType.Voltage, signature.voltage);
  addIfPresent(FactType.PowerW, signature.powerW);
  addIfPresent(FactType.Ean, signature.ean);
  addIfPresent(FactType.BundleIncludes, signature.bundleIncludes);

  // signature.brand is deliberately NOT persisted as a fact here — brand_id
  // is already a 100%-populated, zero-ambiguity FK on canonical_products
  // (ProductSignature's own type comment already says so, Κ-3). Persisting
  // it again here would be exactly the "resultado derivado" duplication
  // Objetivo 2 forbids. Normalized brand (`normalizeBrandName`) and
  // Universal Taxonomy category are added by the caller (backfill script),
  // not here, because they require data this pure function doesn't have
  // (the brands/categories tables) — see `factCategoryFromTaxonomy`/
  // `factBrandFromNormalization` below.

  // family/line: no extractor exists (docs/architecture/PRODUCT_KNOWLEDGE_GRAPH.md
  // §2) — never fabricated, never added here.
  // tokens: tokenize() is private to product-identity/, not exported —
  // exporting it would alter Product Identity (forbidden this Mission).

  return facts;
}

/** Category fact from Universal Taxonomy resolution (Κ-2/Κ-4's
 * `findNodeByRealCategorySlug`, unmodified) — separate from
 * `factsFromProductSignature` because it needs the real `categories.slug`,
 * which the caller (backfill script) already resolves in batch, the same
 * pattern `CanonicalMergeSuggestionService` uses. */
export function factCategoryFromTaxonomy(
  canonicalProductId: string,
  universalCategorySlug: string,
  merchantId: string | null
): LearnedFactInput {
  return {
    canonicalProductId,
    factType: FactType.Category,
    factValue: universalCategorySlug,
    confidence: "high",
    source: "taxonomy",
    extractedFrom: null,
    merchantId,
    origin: "backfill",
    algorithmVersion: MARKETPLACE_MEMORY_ALGORITHM_VERSION,
  };
}

/** Brand fact from `normalizeBrandName` (Κ-2, unmodified, unwired into
 * Product Identity per Mission Κ-5's decision — reused here purely for
 * Memory, never for gating). */
export function factBrandFromNormalization(
  canonicalProductId: string,
  normalizedBrandName: string,
  merchantId: string | null
): LearnedFactInput {
  return {
    canonicalProductId,
    factType: FactType.Brand,
    factValue: normalizedBrandName,
    confidence: "high",
    source: "brand_id",
    extractedFrom: null,
    merchantId,
    origin: "backfill",
    algorithmVersion: MARKETPLACE_MEMORY_ALGORITHM_VERSION,
  };
}
