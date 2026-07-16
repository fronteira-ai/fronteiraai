// Program Κ — Mission Κ-2 (Universal Product Taxonomy Engine). Pure data
// shapes — this domain has no I/O of its own (no repository, no Supabase
// client). Backfill scripts read these constants and write to the new
// universal_categories/category_universal_map/canonical_brands/
// brand_universal_map/model_aliases/attribute_dictionary tables.
// Deliberately not wired into product-identity/, canonical-catalog/, or
// connectors/ — this Mission builds the semantic layer, a future Mission
// decides how (or whether) ProductIdentityEngine consumes it.

export interface UniversalCategoryNode {
  /** Stable, human-assigned slug — never regenerated once backfilled. */
  slug: string;
  name: string;
  /** 0 = department (top-level), 1 = category, 2 = variant/accessory. */
  level: 0 | 1 | 2;
  /** Real `categories.slug` values (production) already known to represent
   * this exact node — the Fase 1 (sinônimo) backfill target. Empty when no
   * real category exists yet for this node (an aspirational/placeholder
   * node the tree defines top-down, per the mission's "nunca depender das
   * categorias dos lojistas"). */
  realCategorySlugs: string[];
  children?: UniversalCategoryNode[];
}

export type MapConfidence = "alta" | "media" | "manual";

export interface BrandDuplicateGroup {
  canonicalName: string;
  /** Real `brands.name` values (production) found to normalize to the same
   * identity — measured, not hypothetical (scripts/kappa2-taxonomy-audit.ts). */
  variantNames: string[];
}

export interface ModelAliasEntry {
  brandSlug: string;
  rawToken: string;
  canonicalModel: string;
}

export interface AttributeDictionaryEntry {
  key: string;
  labelPt: string;
  labelEs: string;
  category: "physical" | "technical" | "identifier";
  description: string;
}
