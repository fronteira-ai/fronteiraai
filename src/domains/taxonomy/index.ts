// Program Κ — Mission Κ-2 (Universal Product Taxonomy Engine). Pure
// semantic-layer domain: constants + deterministic normalization
// functions only, zero I/O, zero dependency on any other src/domains/*.
//
// Program Κ — Mission Κ-4 wired `UNIVERSAL_TAXONOMY`/`findNodeByRealCategorySlug`
// into `product-identity/services/CanonicalMergeSuggestionService.ts` (the
// category gate). `normalizeAppleModelToken` is wired transitively via
// `product-intelligence/extraction/ProductSignatureExtractor.ts`.
//
// `normalizeBrandName` remains deliberately unwired — Program Κ Mission
// Κ-5 remeasured its real impact (all 852 production brand rows) and found
// 0 cross-merchant merge candidates would result from wiring it today (see
// docs/engineering/PROGRAM_K_CLOSURE.md). Kept as a correct, tested,
// zero-cost function prepared for when brand-name fragmentation grows
// (more merchants, more spelling variance) — not integrated because there
// is nothing real to integrate yet.
//
// ATTRIBUTE_DICTIONARY (Κ-2) stays exported — its real consumer is
// scripts/kappa2-taxonomy-backfill.ts (writes the `attribute_dictionary`
// table this migration would create), blocked on the same pending
// migration authorization as the rest of this domain's backfill tooling.
// Mission Κ-5 initially misjudged this as dead (a src/-only grep missed
// the scripts/ consumer) and corrected it before removal — see
// docs/engineering/PROGRAM_K_CLOSURE.md for the audit trail.

export * from "./types/taxonomy.types";
export { UNIVERSAL_TAXONOMY, flattenTree, findNodeByRealCategorySlug } from "./data/universal-tree";
export { normalizeBrandName } from "./data/brand-normalization";
export { normalizeAppleModelToken, KNOWN_MODEL_ALIASES } from "./data/model-normalization";
export { ATTRIBUTE_DICTIONARY } from "./data/attribute-dictionary";
