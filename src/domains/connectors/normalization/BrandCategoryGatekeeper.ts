import { normalizeBrandName } from "@/src/domains/taxonomy";
import { findNodeByRealCategorySlug } from "@/src/domains/taxonomy";
import { buildProductSignature } from "@/src/domains/product-intelligence";
import { slugify } from "@/utils/slug";
import { normalizeCategoryName } from "./CategoryNormalizer";
import { isForbiddenValue, isGenericToken } from "./ForbiddenValues";

// Mission Ω-Gatekeeper (Catalog Integrity Firewall). The decision engine
// every new brand/category name must pass through before it is allowed to
// become (or reuse) a real `brands`/`categories` row. Pure decision logic —
// every DB lookup a decision might need is passed in as an already-resolved
// dependency (never a raw SupabaseClient here), so this file stays 100%
// unit-testable and 100% deterministic: same inputs, same decision, always.
//
// Mandatory chain (never bypassed): normalize → check existing/equivalent →
// ProductSignature (EAN/MPN) cross-reference → learned pattern
// (MerchantAttributePattern.resolvedValue) → forbidden/generic-token
// rejection. If nothing confirms a real value, the result is
// "pending_review" with every reason recorded — never a silent write of
// "Outros"/"GENERAL"/equivalent.

export interface ExistingCatalogEntry {
  id: string;
  name: string;
}

export interface GatekeeperDependencies {
  /** Question 1/2: does a brand already exist whose own normalized name
   * equals this one? (case/diacritics/punctuation/corporate-suffix
   * insensitive, via normalizeBrandName). */
  findBrandByNormalizedName(normalized: string): Promise<ExistingCatalogEntry | null>;
  /** Same as above, for categories — normalized via the existing
   * CategoryNormalizer synonym table + slugify. */
  findCategoryByNormalizedName(normalized: string): Promise<ExistingCatalogEntry | null>;
  /** Question 4: has any OTHER product already been written with a
   * CONFIRMED (non-forbidden) brand and the same EAN or manufacturer code?
   * `product_identifiers` is the index this queries — see the Ω-Gatekeeper
   * migration. */
  findBrandIdByIdentifier(identifierType: "ean" | "manufacturer_code", value: string): Promise<ExistingCatalogEntry | null>;
  /** Question 5: has a human already corrected this exact raw value for
   * this exact store before? Reuses MerchantAttributePattern (Program Ω)
   * extended with `resolvedValue` (Mission Ω-Gatekeeper). */
  findLearnedCorrection(storeId: string, rawValue: string, concept: "brand" | "category"): Promise<string | null>;
}

export type GatekeeperDecision =
  | {
      decision: "accept";
      value: string;
      matchedLayer: "existing" | "identifier" | "learned-pattern" | "new";
      evidence: string;
    }
  | {
      decision: "pending_review";
      rawValue: string;
      reasons: string[];
    };

export interface ResolveBrandInput {
  rawBrandName: string | null | undefined;
  storeId: string;
  productName: string;
  specifications: Record<string, string> | null;
}

export interface ResolveCategoryInput {
  rawCategoryName: string | null | undefined;
  storeId: string;
}

/** Camada 1 — the strongest, least ambiguous signal: a real EAN or
 * manufacturer code (MPN/part number) already confirmed on another product
 * with a real brand. Computed with the exact same pure extractor Product
 * Identity/Marketplace Memory already trust (buildProductSignature) — never
 * a second, competing extraction. */
async function resolveBrandByIdentifier(
  productName: string,
  specifications: Record<string, string> | null,
  deps: GatekeeperDependencies
): Promise<{ brand: ExistingCatalogEntry; identifierType: string; identifierValue: string } | null> {
  const signature = buildProductSignature({
    id: "gatekeeper-probe",
    name: productName,
    brandName: null,
    specifications,
  });

  if (signature.ean.value) {
    const match = await deps.findBrandIdByIdentifier("ean", signature.ean.value);
    if (match) return { brand: match, identifierType: "ean", identifierValue: signature.ean.value };
  }
  if (signature.manufacturerCode.value) {
    const match = await deps.findBrandIdByIdentifier("manufacturer_code", signature.manufacturerCode.value);
    if (match) return { brand: match, identifierType: "manufacturer_code", identifierValue: signature.manufacturerCode.value };
  }
  return null;
}

export async function resolveBrand(input: ResolveBrandInput, deps: GatekeeperDependencies): Promise<GatekeeperDecision> {
  const raw = input.rawBrandName?.trim() ?? "";
  const reasons: string[] = [];

  // Question 4 first — the strongest evidence, independent of whether the
  // raw text is usable at all (a product can have no brand text but a real
  // EAN that already resolves it elsewhere).
  const byIdentifier = await resolveBrandByIdentifier(input.productName, input.specifications, deps);
  if (byIdentifier && !isForbiddenValue(byIdentifier.brand.name) && !isGenericToken(byIdentifier.brand.name)) {
    return {
      decision: "accept",
      value: byIdentifier.brand.name,
      matchedLayer: "identifier",
      evidence: `${byIdentifier.identifierType}="${byIdentifier.identifierValue}" already confirmed on brand "${byIdentifier.brand.name}"`,
    };
  }
  reasons.push(raw ? "no confirmed EAN/manufacturer-code match found for this product" : "no brand text provided by connector");

  // Question 5 — has a human already corrected this exact raw string for
  // this exact store?
  if (raw) {
    const learned = await deps.findLearnedCorrection(input.storeId, raw, "brand");
    if (learned && !isForbiddenValue(learned) && !isGenericToken(learned)) {
      return { decision: "accept", value: learned, matchedLayer: "learned-pattern", evidence: `previously corrected by an operator for this store: "${raw}" -> "${learned}"` };
    }
  }
  if (raw) reasons.push(`no learned correction on file for store+"${raw}"`);

  // Question 6 — is the raw value itself one of the forbidden placeholder markers?
  if (isForbiddenValue(raw)) {
    reasons.push(`"${raw || "(empty)"}" is a forbidden placeholder value, never a real brand`);
    return { decision: "pending_review", rawValue: raw, reasons };
  }

  // Question 2/3 — normalize and check for an existing equivalent brand.
  const normalized = normalizeBrandName(raw);
  if (!normalized) {
    reasons.push("brand text normalized to nothing (only punctuation/corporate-suffix words)");
    return { decision: "pending_review", rawValue: raw, reasons };
  }

  // Question 7 — a single generic/common-noun token is never sufficient evidence alone.
  if (isGenericToken(normalized)) {
    reasons.push(`"${raw}" normalizes to a generic token ("${normalized}"), not a confirmed brand name`);
    return { decision: "pending_review", rawValue: raw, reasons };
  }

  // Question 1 — does an equivalent brand already exist?
  const existing = await deps.findBrandByNormalizedName(normalized);
  if (existing && !isForbiddenValue(existing.name) && !isGenericToken(existing.name)) {
    return { decision: "accept", value: existing.name, matchedLayer: "existing", evidence: `"${raw}" normalizes to the same identity as existing brand "${existing.name}"` };
  }

  // Nothing above matched an EXISTING brand, but the raw text itself is
  // real, well-formed evidence (not generic, not forbidden, not empty) —
  // this is a legitimately new brand the catalog has never seen before
  // (e.g. "Oukitel", "Luxor" — real brands found for the first time during
  // the Ω-Data audit). The failure mode this Mission targets is brand text
  // being ABSENT and silently mapped to "Outros", never a real name being
  // rejected — forcing every first-time real brand into manual review
  // would flood the queue with good data and contradict "reduzir
  // drasticamente" revisões manuais. Accepted as new, using the normalized
  // form so future variants (case, punctuation, corporate suffix) collapse
  // onto this same identity from day one.
  // Stored with its original casing/punctuation (never the lowercased
  // comparison form) — `normalized` only ever decides EQUIVALENCE here;
  // future variants (any casing, corporate suffix) still collapse onto
  // this exact row via the same normalizeBrandName comparison above,
  // regardless of what casing this first occurrence happened to use.
  return { decision: "accept", value: raw, matchedLayer: "new", evidence: `"${raw}" is a well-formed, non-generic brand name never seen before — accepted as new` };
}

function resolveCategoryGateSlug(realSlug: string): string {
  const node = findNodeByRealCategorySlug(realSlug);
  return node?.slug ?? realSlug;
}

export async function resolveCategory(input: ResolveCategoryInput, deps: GatekeeperDependencies): Promise<GatekeeperDecision> {
  const raw = input.rawCategoryName?.trim() ?? "";
  const reasons: string[] = [];

  // Question 5 first for category too — a store-specific correction
  // ("Notebook Gamer" -> "Notebook") is the strongest signal once it exists.
  if (raw) {
    const learned = await deps.findLearnedCorrection(input.storeId, raw, "category");
    if (learned && !isForbiddenValue(learned) && !isGenericToken(learned)) {
      return { decision: "accept", value: learned, matchedLayer: "learned-pattern", evidence: `previously corrected by an operator for this store: "${raw}" -> "${learned}"` };
    }
  }
  if (raw) reasons.push(`no learned correction on file for store+"${raw}"`);

  if (isForbiddenValue(raw)) {
    reasons.push(`"${raw || "(empty)"}" is a forbidden placeholder value, never a real category`);
    return { decision: "pending_review", rawValue: raw, reasons };
  }

  // Question 2/3 — apply the existing synonym table (Sprint 2.5) then
  // resolve through Universal Taxonomy (Κ-2) — a category is "equivalent to
  // a known one" precisely when it resolves to the same real node.
  const synonymNormalized = normalizeCategoryName(raw);
  const taxonomySlug = resolveCategoryGateSlug(slugify(synonymNormalized));

  if (isGenericToken(synonymNormalized)) {
    reasons.push(`"${raw}" normalizes to a generic token, not a confirmed category`);
    return { decision: "pending_review", rawValue: raw, reasons };
  }

  // Question 1 — does an existing category already resolve to the same
  // Universal Taxonomy node? If so, reuse ITS name/id rather than create a
  // sibling row for the same real-world category under a different label.
  const existing = await deps.findCategoryByNormalizedName(taxonomySlug);
  if (existing && !isForbiddenValue(existing.name) && !isGenericToken(existing.name)) {
    return { decision: "accept", value: existing.name, matchedLayer: "existing", evidence: `"${raw}" resolves to the same Universal Taxonomy node ("${taxonomySlug}") as existing category "${existing.name}"` };
  }

  // A real, well-formed, non-generic category name with no existing sibling
  // yet is accepted as a genuinely new category (same reasoning as brand:
  // creating a first-time real identity is not the failure mode this
  // Mission targets — silently reusing "GENERAL"/"Outros" forever is).
  if (synonymNormalized) {
    return { decision: "accept", value: synonymNormalized, matchedLayer: "new", evidence: `"${raw}" is a well-formed category name with no forbidden/generic markers` };
  }

  reasons.push(`"${raw}" normalized to nothing usable`);
  return { decision: "pending_review", rawValue: raw, reasons };
}
