// Program Κ — Mission Κ-2 (Universal Product Taxonomy Engine). Pure
// semantic-layer domain: constants + deterministic normalization
// functions only, zero I/O, zero dependency on any other src/domains/*.
// Deliberately not consumed by product-identity/, canonical-catalog/, or
// connectors/ in this Mission — wiring is a future Mission's decision.

export * from "./types/taxonomy.types";
export { UNIVERSAL_TAXONOMY, flattenTree, findNodeByRealCategorySlug } from "./data/universal-tree";
export { normalizeBrandName, KNOWN_BRAND_DUPLICATES } from "./data/brand-normalization";
export { normalizeAppleModelToken, KNOWN_MODEL_ALIASES } from "./data/model-normalization";
export { ATTRIBUTE_DICTIONARY } from "./data/attribute-dictionary";
