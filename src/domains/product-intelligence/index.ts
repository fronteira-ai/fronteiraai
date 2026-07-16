// Program Κ — Mission Κ-3 (Product Intelligence Layer). Pure extraction
// domain: constants + deterministic functions only, zero I/O, zero
// dependency on product-identity/, canonical-catalog/, or connectors/.
// Deliberately not consumed by any of them in this Mission — wiring is a
// future Mission's decision (same discipline as taxonomy/).

export * from "./types/product-intelligence.types";
export { ATTRIBUTE_KEY_ALIASES, resolveOfficialKey } from "./extraction/attribute-key-aliases";
export {
  normalizeCapacityToGb,
  normalizeVoltage,
  normalizePowerW,
  normalizeEan,
  normalizeColorToken,
  normalizeBundleIncludes,
} from "./extraction/value-normalizers";
export { extractManufacturerCode } from "./extraction/manufacturer-code-extractor";
export type { ManufacturerCodeMatch } from "./extraction/manufacturer-code-extractor";
export { buildProductSignature } from "./extraction/ProductSignatureExtractor";
export type { ExtractableProduct } from "./extraction/ProductSignatureExtractor";
