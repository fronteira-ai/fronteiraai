// Program Κ — Mission Κ-2 (Universal Product Taxonomy Engine). Pure data
// shapes — this domain has no I/O of its own (no repository, no Supabase
// client). `UniversalCategoryNode` is wired into production as of Program
// Κ Mission Κ-4 (see taxonomy/index.ts). `BrandDuplicateGroup` and
// `MapConfidence` were removed by Mission Κ-5 — `MapConfidence` had zero
// consumers of any kind; `BrandDuplicateGroup`'s only consumer (its own
// test) disproved the type's reason for existing (see
// docs/engineering/PROGRAM_K_CLOSURE.md). `AttributeDictionaryEntry` was
// initially assessed the same way and then correctly restored: its real
// consumer is `scripts/kappa2-taxonomy-backfill.ts` (blocked on the same
// pending migration authorization as the rest of this domain's backfill
// tooling, but real, not dead) — the audit trail for that correction is
// in docs/engineering/PROGRAM_K_CLOSURE.md.

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
