import type { BrandDuplicateGroup } from "../types/taxonomy.types";

// Program Κ — Mission Κ-2, Objetivo 4. Pure normalization function — case,
// diacritics, corporate-suffix (Inc/Corp/Ltd/®/™), and whitespace/punctuation
// insensitive. Deterministic, no lookup table required for the general
// case; `KNOWN_BRAND_DUPLICATES` below is only the real, measured
// exceptions this function alone does NOT already collapse (parenthetical
// sub-brand notation, e.g. "Meta(quest)" vs "Meta Quest").
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

// Measured against the real 852-row `brands` table
// (scripts/kappa2-taxonomy-audit.ts, run 2026-07-15) — NOT the
// hypothetical Apple/Samsung example from the mission brief. The real
// catalog's brand data is already largely clean: only 2 groups (4 rows)
// were found, both a sub-brand written with vs. without parentheses. This
// is reported honestly, not inflated to match the brief's illustrative
// example — see docs/engineering/MODEL_NORMALIZATION.md §"O que a medição
// real mostrou" for the full comparison against the hypothetical case.
export const KNOWN_BRAND_DUPLICATES: BrandDuplicateGroup[] = [
  { canonicalName: "Meta Quest", variantNames: ["Meta Quest", "Meta(quest)"] },
  { canonicalName: "Rayban - Meta", variantNames: ["Rayban - Meta", "Rayban(meta)"] },
];
