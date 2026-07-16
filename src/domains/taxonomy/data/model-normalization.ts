import type { ModelAliasEntry } from "../types/taxonomy.types";

// Program Κ — Mission Κ-2, Objetivo 5 — "maior missão", per the mandate.
// `ProductIdentityEngine`'s model-number factor already extracts
// digit-containing tokens straight from the product NAME (see
// src/domains/product-identity/domain/ProductIdentityEngine.ts,
// `offerModelTokens`) — it has no dedicated model field to read. This
// layer's real contribution is a canonical `specifications.model` value a
// future Mission could inject, which the engine's existing `specifications`
// factor already knows how to score at full weight when both sides share
// the exact same key/value (see `specOverlap` in the same file) — a
// stronger signal than raw digit-token overlap, without touching the
// engine itself.
//
// Coverage today is a real, grounded SAMPLE (Apple/iPhone + JBL — the two
// highest-volume brands with clearly model-coded names, verified against
// real catalog text in scripts/kappa2-model-variance-sample.ts, run
// 2026-07-15), not an exhaustive dictionary for all 852 brands — the
// mandate itself calls this "a maior missão"; a first Wave that claimed
// full coverage across every brand's naming convention would be assuming,
// not measuring. Extending brand-by-brand is deliberately incremental.

export function normalizeAppleModelToken(rawName: string): string | null {
  const lower = rawName.toLowerCase();
  const iphoneMatch = lower.match(/iphone\s*(\d{2})\s*(e)?\s*(pro)?\s*(max)?/);
  if (iphoneMatch) {
    const [, gen, eSuffix, pro, max] = iphoneMatch;
    const parts = ["IPHONE", eSuffix ? `${gen}E` : gen];
    if (pro) parts.push("PRO");
    if (max) parts.push("MAX");
    return parts.join("_");
  }
  const macbookMatch = lower.match(/macbook\s*(air|pro)?\s*(m\d)?/);
  if (macbookMatch && (macbookMatch[1] || macbookMatch[2])) {
    const [, variant, chip] = macbookMatch;
    const parts = ["MACBOOK"];
    if (variant) parts.push(variant.toUpperCase());
    if (chip) parts.push(chip.toUpperCase());
    return parts.join("_");
  }
  const ipadMatch = lower.match(/ipad\s*(air|pro|mini)?/);
  if (ipadMatch && lower.includes("ipad")) {
    const parts = ["IPAD"];
    if (ipadMatch[1]) parts.push(ipadMatch[1].toUpperCase());
    return parts.join("_");
  }
  const watchMatch = lower.match(/apple watch\s*(se|ultra)?/);
  if (watchMatch && lower.includes("apple watch")) {
    const parts = ["APPLE_WATCH"];
    if (watchMatch[1]) parts.push(watchMatch[1].toUpperCase());
    return parts.join("_");
  }
  return null;
}

// Real examples (verified against production catalog text, 2026-07-15) —
// seeds `model_aliases` for the Apple brand cohort. Each `rawToken` is a
// literal fragment observed in a real canonical_products.name.
export const KNOWN_MODEL_ALIASES: ModelAliasEntry[] = [
  { brandSlug: "apple", rawToken: "iphone 16 pro", canonicalModel: "IPHONE_16_PRO" },
  { brandSlug: "apple", rawToken: "iphone 17 pro max", canonicalModel: "IPHONE_17_PRO_MAX" },
  { brandSlug: "apple", rawToken: "iphone 17 pro", canonicalModel: "IPHONE_17_PRO" },
  { brandSlug: "apple", rawToken: "iphone 17e", canonicalModel: "IPHONE_17E" },
  { brandSlug: "apple", rawToken: "iphone 17", canonicalModel: "IPHONE_17" },
  { brandSlug: "apple", rawToken: "macbook air m3", canonicalModel: "MACBOOK_AIR_M3" },
  { brandSlug: "apple", rawToken: "ipad air", canonicalModel: "IPAD_AIR" },
  { brandSlug: "apple", rawToken: "apple watch se", canonicalModel: "APPLE_WATCH_SE" },
];
