// Program Κ — Mission Κ-3, Objetivo 2 (EAN/MPN/Part Number/SKU fabricante).
// Grounded in real product names sampled by
// scripts/kappa2-model-variance-sample.ts (2026-07-15): manufacturer codes
// like "A3257" (Apple), "KD32N22" (Keepdata), "ICE-21RP1" (Cuisinart),
// "JBLFLIP7BLKAM" (JBL) already appear as literal tokens inside
// canonical_products.name — never in a structured field
// (ATTRIBUTE_DICTIONARY.md already names this as a real, confirmed gap:
// "confirmado presente em nomes reais... não extraído estruturadamente
// ainda"). This is a heuristic token extractor, never a verified-against-a-
// registry lookup — every result is confidence="medium" for exactly that
// reason, never "high".

// Real, observed false positives from the same name samples — measured,
// not hypothetical (e.g. "13GB RAM de 6.9" 48+48MP" would otherwise match
// "48MP"/"6GB" as a false "code"). Deliberately small and closed — this is
// a stoplist of tokens seen in real data, not a general dictionary.
const KNOWN_NON_CODE_TOKENS = new Set([
  "4K",
  "5G",
  "4G",
  "3G",
  "2G",
  "8K",
  "HDMI",
  "USB-C",
  "USB-A",
  "WI-FI",
  "WIFI",
  "RGB",
  "LED",
  "OLED",
  "IP68",
  "IP67",
  "IPX4",
  "IPX5",
  "IPX7",
  "IPX8",
  "NFC",
  "GPS",
  "ESIM",
  "M2",
  "M3",
  "M4",
]);

// Matches an uppercase alphanumeric token (letters + digits, optional
// internal hyphen/slash) of 4-24 chars that mixes at least 1 letter and 1
// digit — the real shape every sampled manufacturer code shared. Upper
// bound widened from an initial 16 to 24 after a real spot-check
// (scripts/kappa3-code-spotcheck.ts) found genuine 19-char Razer codes
// ("RZ01-04870100-R3U1") silently truncated by a too-tight cap — a real
// bug, not a hypothetical one.
const CODE_PATTERN = /\b(?=[A-Z0-9\/-]{4,24}\b)(?=[A-Z0-9\/-]*[A-Z])(?=[A-Z0-9\/-]*\d)[A-Z][A-Z0-9\/-]{3,23}\b/g;

export interface ManufacturerCodeMatch {
  code: string;
  /** All candidate tokens found, for auditability (Objetivo 4 — "extraído
   * de" must show what was actually scanned, not just the winner). */
  candidates: string[];
}

export function extractManufacturerCode(name: string): ManufacturerCodeMatch | null {
  const upper = name.toUpperCase();
  const matches = [...upper.matchAll(CODE_PATTERN)].map((m) => m[0]);
  const candidates = matches.filter((token) => !KNOWN_NON_CODE_TOKENS.has(token) && !/^\d+MP$/.test(token) && !/^\d+GB$/.test(token) && !/^\d+MM$/.test(token));

  if (candidates.length === 0) return null;
  return { code: candidates[0], candidates };
}
