// Program Κ — Mission Κ-3 (Product Intelligence Layer). Pure data shapes —
// this domain has no I/O of its own, same discipline as taxonomy/. Never
// depends on product-identity/, canonical-catalog/, or connectors/ —
// whether/how ProductIdentityEngine consumes a ProductSignature is a
// decision for a future Mission, deliberately not made here.

export type AttributeSource = "specifications" | "name" | "brand_id";
export type AttributeConfidence = "high" | "medium" | "low";

/**
 * Every extracted attribute is wrapped this way — never a bare value.
 * `value` is `null` when extraction genuinely found nothing (Quality Gate:
 * "nenhum atributo poderá ser inventado" — absence is always represented as
 * null, never guessed or defaulted).
 */
export interface AttributeValue<T> {
  value: T | null;
  source: AttributeSource | null;
  confidence: AttributeConfidence | null;
  /** The raw key/text this value was extracted from — e.g. "COR" or the
   * product name substring — so every value is traceable back to its
   * origin (Objetivo 4: "extraído de"). Null alongside a null value. */
  extractedFrom: string | null;
}

function empty<T>(): AttributeValue<T> {
  return { value: null, source: null, confidence: null, extractedFrom: null };
}

export const EMPTY_ATTRIBUTE = empty;

// Objetivo 3. Mirrors the mission's own example field list. Every field is
// an AttributeValue, never a bare type — "brand" is the one exception,
// since brand_id is already a 100%-populated, zero-ambiguity FK (no
// extraction needed, just a lookup) rather than something this Mission
// extracts.
export interface ProductSignature {
  canonicalProductId: string;
  brand: AttributeValue<string>; // resolved from brand_id, source="brand_id", confidence="high" whenever brand_id is set
  model: AttributeValue<string>;
  color: AttributeValue<string>;
  capacityGb: AttributeValue<number>;
  ramGb: AttributeValue<number>;
  screenSizeIn: AttributeValue<number>;
  processor: AttributeValue<string>;
  gpu: AttributeValue<string>;
  voltage: AttributeValue<string>;
  powerW: AttributeValue<number>;
  ean: AttributeValue<string>;
  manufacturerCode: AttributeValue<string>; // MPN/Part Number — extracted from name text, see model-code-extractor
  bundleIncludes: AttributeValue<string[]>;
}
