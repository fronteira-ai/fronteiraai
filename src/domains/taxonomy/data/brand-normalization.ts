// Program Κ — Mission Κ-2, Objetivo 4. Pure normalization function — case,
// diacritics, corporate-suffix (Inc/Corp/Ltd/®/™), and whitespace/punctuation
// (including parentheses) insensitive. Deterministic, no lookup table
// required — measured against the real 852-row `brands` table
// (scripts/kappa2-taxonomy-audit.ts, 2026-07-15): only 2 real duplicate
// groups exist in production (both a sub-brand written with vs. without
// parentheses, e.g. "Meta(quest)" vs "Meta Quest"), and this function
// alone already collapses both to the same identity — no hardcoded
// exception list is needed (a `KNOWN_BRAND_DUPLICATES` constant existed
// here through Mission Κ-4 under the assumption that it caught cases this
// function couldn't; Mission Κ-5 measured that assumption directly and
// found it false — the function's own test already proved it by
// collapsing both real groups without consulting the list — so the list
// was removed as redundant, not the function).
//
// Deliberately unwired into product-identity/ — Mission Κ-5 measured the
// real impact of wiring this (same pattern as Κ-4's category/signature
// wiring) across all 852 production brand rows: 0 cross-merchant merge
// candidates would result. Kept prepared for when brand-name
// fragmentation grows, not integrated because there is nothing real to
// integrate yet (see docs/engineering/PROGRAM_K_CLOSURE.md).
export function normalizeBrandName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[®™©]/g, "")
    .replace(/\b(inc|corp|corporation|company|co|ltd|llc|sa|srl)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
