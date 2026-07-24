import { normalizeBrandName, findNodeByRealCategorySlug } from "@/src/domains/taxonomy";
import { buildProductSignature } from "@/src/domains/product-intelligence";
import { slugify } from "@/utils/slug";
import { isForbiddenValue, isGenericToken } from "../normalization/ForbiddenValues";
import type { RecoveryCandidateRow, ConfirmedAttributes } from "../repositories/IRecoveryRepository";

// Mission Ω-Rehabilitation (Catalog Recovery Engine). Recovers HISTORICAL
// products — rows written before Mission Ω-Gatekeeper existed — using the
// exact 5 layers the mission specifies, in the mission's exact order.
// Deliberately NOT the same code path as BrandCategoryGatekeeper (write-time
// firewall): that engine's final step accepts a well-formed, never-seen raw
// string as a brand-new identity — appropriate when a connector just
// scraped real text. Here there is no fresh raw text to accept as new: the
// current value IS the forbidden placeholder itself (e.g. "Outros"), so
// this engine only ever CONFIRMS via one of the 5 inheritance layers or
// gives up to pending review — it never fabricates a "new" brand/category
// from a value that was already known to be junk.
//
// Conflict discipline: Camada 1 (ProductSignature) and Camada 2 (Canonical
// Catalog) are both fetched UP FRONT for every candidate (never short-
// circuited) specifically so a disagreement between them is caught BEFORE
// either is trusted — "não diminuir precisão" applies to cross-layer
// agreement, not just to a single layer's own confidence. A caught
// disagreement is reported as a real conflict and the field goes to
// pending review, never resolved by picking one side arbitrarily.

export type RecoveryLayer = "product_signature" | "canonical_catalog" | "merchant_memory" | "universal_taxonomy" | "brand_normalization";

export interface RecoveredField {
  outcome: "recovered";
  value: string;
  id: string;
  layer: RecoveryLayer;
  confidence: "high" | "medium" | "low";
  evidence: string;
}

export interface PendingField {
  outcome: "pending";
  reasons: string[];
  /** Set only when this field was NOT confirmed specifically because two
   * deterministic layers disagreed (never when simply no evidence existed
   * at all) — a real signal for the "Conflitos encontrados" report metric. */
  conflict?: { layers: string[]; values: string[] };
  /** Set when a candidate value was found by a layer but rejected for being
   * itself forbidden/generic — a real "false positive prevented" signal,
   * distinct from "no evidence found at all". */
  falsePositiveRejected?: boolean;
}

export type FieldDecision = RecoveredField | PendingField;

export interface CatalogEntryLookup {
  id: string;
  name: string;
}

export interface RecoveryDependencies {
  findConfirmedByIdentifier(identifierType: "ean" | "manufacturer_code", identifierValue: string): Promise<ConfirmedAttributes | null>;
  findCanonicalLinkAttributes(productId: string): Promise<ConfirmedAttributes | null>;
  findLearnedCorrection(storeId: string, rawValue: string, concept: "brand" | "category"): Promise<string | null>;
  findBrandByNormalizedName(normalized: string): Promise<CatalogEntryLookup | null>;
  findCategoryByNormalizedName(taxonomySlug: string): Promise<CatalogEntryLookup | null>;
}

function safeConfidence(hasOtherFieldToo: boolean): "high" | "medium" | "low" {
  return hasOtherFieldToo ? "high" : "medium";
}

async function findIdentifierMatch(candidate: RecoveryCandidateRow, deps: RecoveryDependencies): Promise<ConfirmedAttributes | null> {
  const signature = buildProductSignature({ id: candidate.productId, name: candidate.name, brandName: null, specifications: candidate.specifications });
  if (signature.ean.value) {
    const match = await deps.findConfirmedByIdentifier("ean", signature.ean.value);
    if (match) return match;
  }
  if (signature.manufacturerCode.value) {
    const match = await deps.findConfirmedByIdentifier("manufacturer_code", signature.manufacturerCode.value);
    if (match) return match;
  }
  return null;
}

export async function decideBrand(
  candidate: RecoveryCandidateRow,
  identifierMatch: ConfirmedAttributes | null,
  canonicalMatch: ConfirmedAttributes | null,
  deps: RecoveryDependencies
): Promise<FieldDecision> {
  const reasons: string[] = [];

  const fromIdentifier = identifierMatch?.brandId && identifierMatch.brandName && !isForbiddenValue(identifierMatch.brandName) && !isGenericToken(identifierMatch.brandName) ? identifierMatch : null;
  const fromCanonical = canonicalMatch?.brandId && canonicalMatch.brandName && !isForbiddenValue(canonicalMatch.brandName) && !isGenericToken(canonicalMatch.brandName) ? canonicalMatch : null;

  // Cross-layer conflict check — Camada 1 vs Camada 2, before either is trusted.
  if (fromIdentifier && fromCanonical && fromIdentifier.brandId !== fromCanonical.brandId) {
    return {
      outcome: "pending",
      reasons: [`conflict: ProductSignature says brand "${fromIdentifier.brandName}" but Canonical Catalog says "${fromCanonical.brandName}" — never auto-resolved`],
      conflict: { layers: ["product_signature", "canonical_catalog"], values: [fromIdentifier.brandName!, fromCanonical.brandName!] },
    };
  }

  // Camada 1 — ProductSignature (EAN/MPN cross-reference).
  if (fromIdentifier) {
    return {
      outcome: "recovered",
      value: fromIdentifier.brandName!,
      id: fromIdentifier.brandId!,
      layer: "product_signature",
      confidence: safeConfidence(!!identifierMatch!.categoryId),
      evidence: `EAN/manufacturer code shared with another product already confirmed as brand "${fromIdentifier.brandName}"`,
    };
  }
  if (identifierMatch?.brandId && (isForbiddenValue(identifierMatch.brandName) || isGenericToken(identifierMatch.brandName!))) {
    reasons.push(`rejected-forbidden: identifier match resolved to "${identifierMatch.brandName}", itself forbidden/generic — not trusted`);
  } else {
    reasons.push("no confirmed EAN/manufacturer-code match found for this product");
  }

  // Camada 2 — Canonical Catalog.
  if (fromCanonical) {
    return {
      outcome: "recovered",
      value: fromCanonical.brandName!,
      id: fromCanonical.brandId!,
      layer: "canonical_catalog",
      confidence: "high",
      evidence: `this product's linked canonical product already carries confirmed brand "${fromCanonical.brandName}"`,
    };
  }
  reasons.push("no confirmed brand on this product's linked canonical product (or no canonical link exists yet)");

  // Camada 3 — Merchant Memory.
  if (candidate.brandName) {
    const learned = await deps.findLearnedCorrection(candidate.storeId, candidate.brandName, "brand");
    if (learned && !isForbiddenValue(learned) && !isGenericToken(learned)) {
      const existing = await deps.findBrandByNormalizedName(normalizeBrandName(learned));
      if (existing) {
        return {
          outcome: "recovered",
          value: existing.name,
          id: existing.id,
          layer: "merchant_memory",
          confidence: "high",
          evidence: `previously corrected by an operator for this store: "${candidate.brandName}" -> "${learned}"`,
        };
      }
    }
  }
  reasons.push(`no learned correction on file for store+"${candidate.brandName ?? "(no brand)"}"`);

  // Camada 5 — Brand Normalization. Rarely fires (current value IS the
  // forbidden placeholder itself), kept for the genuine edge case where
  // brandName is real text that simply never linked to an existing row.
  if (candidate.brandName && !isForbiddenValue(candidate.brandName)) {
    const normalized = normalizeBrandName(candidate.brandName);
    if (normalized && !isGenericToken(normalized)) {
      const existing = await deps.findBrandByNormalizedName(normalized);
      if (existing) {
        return {
          outcome: "recovered",
          value: existing.name,
          id: existing.id,
          layer: "brand_normalization",
          confidence: "medium",
          evidence: `"${candidate.brandName}" normalizes to the same identity as existing brand "${existing.name}"`,
        };
      }
    }
  }
  reasons.push("brand text (if any) does not normalize to any existing confirmed brand");

  return { outcome: "pending", reasons };
}

export async function decideCategory(
  candidate: RecoveryCandidateRow,
  identifierMatch: ConfirmedAttributes | null,
  canonicalMatch: ConfirmedAttributes | null,
  deps: RecoveryDependencies
): Promise<FieldDecision> {
  const reasons: string[] = [];

  const fromIdentifier = identifierMatch?.categoryId && identifierMatch.categoryName && !isForbiddenValue(identifierMatch.categoryName) ? identifierMatch : null;
  const fromCanonical = canonicalMatch?.categoryId && canonicalMatch.categoryName && !isForbiddenValue(canonicalMatch.categoryName) ? canonicalMatch : null;

  if (fromIdentifier && fromCanonical && fromIdentifier.categoryId !== fromCanonical.categoryId) {
    return {
      outcome: "pending",
      reasons: [`conflict: ProductSignature says category "${fromIdentifier.categoryName}" but Canonical Catalog says "${fromCanonical.categoryName}" — never auto-resolved`],
      conflict: { layers: ["product_signature", "canonical_catalog"], values: [fromIdentifier.categoryName!, fromCanonical.categoryName!] },
    };
  }

  // Camada 1 — ProductSignature.
  if (fromIdentifier) {
    return {
      outcome: "recovered",
      value: fromIdentifier.categoryName!,
      id: fromIdentifier.categoryId!,
      layer: "product_signature",
      confidence: safeConfidence(!!identifierMatch!.brandId),
      evidence: `EAN/manufacturer code shared with another product already confirmed as category "${fromIdentifier.categoryName}"`,
    };
  }
  if (identifierMatch?.categoryId && isForbiddenValue(identifierMatch.categoryName)) {
    reasons.push(`rejected-forbidden: identifier match resolved to category "${identifierMatch.categoryName}", itself forbidden — not trusted`);
  } else {
    reasons.push("no confirmed EAN/manufacturer-code match found for this product");
  }

  // Camada 2 — Canonical Catalog.
  if (fromCanonical) {
    return {
      outcome: "recovered",
      value: fromCanonical.categoryName!,
      id: fromCanonical.categoryId!,
      layer: "canonical_catalog",
      confidence: "high",
      evidence: `this product's linked canonical product already carries confirmed category "${fromCanonical.categoryName}"`,
    };
  }
  reasons.push("no confirmed category on this product's linked canonical product (or no canonical link exists yet)");

  // Camada 3 — Merchant Memory.
  if (candidate.categoryName) {
    const learned = await deps.findLearnedCorrection(candidate.storeId, candidate.categoryName, "category");
    if (learned && !isForbiddenValue(learned)) {
      const taxonomySlug = findNodeByRealCategorySlug(slugify(learned))?.slug ?? slugify(learned);
      const existing = await deps.findCategoryByNormalizedName(taxonomySlug);
      if (existing) {
        return {
          outcome: "recovered",
          value: existing.name,
          id: existing.id,
          layer: "merchant_memory",
          confidence: "high",
          evidence: `previously corrected by an operator for this store: "${candidate.categoryName}" -> "${learned}"`,
        };
      }
    }
  }
  reasons.push(`no learned correction on file for store+"${candidate.categoryName ?? "(no category)"}"`);

  // Camada 4 — Universal Taxonomy (resolve the CURRENT category text
  // through the taxonomy tree — real text that simply never matched an
  // existing category row is the genuine edge case this covers).
  if (candidate.categoryName && !isForbiddenValue(candidate.categoryName)) {
    const taxonomySlug = findNodeByRealCategorySlug(slugify(candidate.categoryName))?.slug ?? slugify(candidate.categoryName);
    const existing = await deps.findCategoryByNormalizedName(taxonomySlug);
    if (existing) {
      return {
        outcome: "recovered",
        value: existing.name,
        id: existing.id,
        layer: "universal_taxonomy",
        confidence: "medium",
        evidence: `"${candidate.categoryName}" resolves to the same Universal Taxonomy node as existing category "${existing.name}"`,
      };
    }
  }
  reasons.push("category text (if any) does not resolve to any existing confirmed category via Universal Taxonomy");

  return { outcome: "pending", reasons };
}

export interface CandidateResult {
  productId: string;
  needsBrand: boolean;
  needsCategory: boolean;
  brand: FieldDecision | null;
  category: FieldDecision | null;
}

export async function evaluateCandidate(candidate: RecoveryCandidateRow, deps: RecoveryDependencies): Promise<CandidateResult> {
  const needsBrand = !candidate.brandId || isForbiddenValue(candidate.brandName);
  const needsCategory = !candidate.categoryId || isForbiddenValue(candidate.categoryName);

  if (!needsBrand && !needsCategory) {
    return { productId: candidate.productId, needsBrand, needsCategory, brand: null, category: null };
  }

  // Fetched once, up front, for BOTH fields — never short-circuited by an
  // early return, specifically so a Camada 1 vs Camada 2 disagreement is
  // always detectable.
  const [identifierMatch, canonicalMatch] = await Promise.all([
    findIdentifierMatch(candidate, deps),
    deps.findCanonicalLinkAttributes(candidate.productId),
  ]);

  const brand = needsBrand ? await decideBrand(candidate, identifierMatch, canonicalMatch, deps) : null;
  const category = needsCategory ? await decideCategory(candidate, identifierMatch, canonicalMatch, deps) : null;

  return { productId: candidate.productId, needsBrand, needsCategory, brand, category };
}
