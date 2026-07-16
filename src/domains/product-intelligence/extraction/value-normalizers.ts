// Program Κ — Mission Κ-3, Objetivo 5. Pure normalization functions — every
// one returns `null` (never a guess) when the input doesn't match a
// recognizable pattern, per the Quality Gate ("nenhum atributo poderá ser
// inventado"). Grounded in real value samples from
// scripts/kappa3-attribute-audit.ts (2026-07-15).

// "512 GB" / "512GB" / "512 G" / "1TB" / "1.5TB" → integer GB.
export function normalizeCapacityToGb(raw: string): number | null {
  const match = raw.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(TB|GB|G)\b/i);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "TB") return Math.round(amount * 1024);
  return Math.round(amount);
}

// "127V ~ 60Hz" / "220V" / "110-220V ~ 50/60Hz" / "DC 5V" → the set of
// distinct voltage numbers found, joined ("127V" or "110V-220V" for
// bivolt). Never invents "bivolt" as a label — only reports numbers
// actually present in the text. Handles the real "A - BV" range shape
// (measured: "110 - 220V ~ 50/60 Hz") where only the upper bound carries
// the unit — the "V" applying to both sides of a dash-joined range is a
// standard notation convention, not an invented value, the same way
// "10-20kg" implies kg on both ends.
export function normalizeVoltage(raw: string): string | null {
  const withRangesExpanded = raw.replace(/(\d{2,3})\s*[-~]\s*(\d{2,3})\s*V\b/gi, "$1V-$2V");
  const matches = [...withRangesExpanded.matchAll(/(\d{2,3})\s*V\b/gi)].map((m) => parseInt(m[1], 10));
  if (matches.length === 0) return null;
  const distinct = [...new Set(matches)].sort((a, b) => a - b);
  return distinct.map((v) => `${v}V`).join("-");
}

// "900 watts" / "60 watts" / "1600W" / "10W" → integer watts. Takes the
// first number found — real values like "4 de 100 watts RMS em 4 Ohms..."
// describe a multi-channel spec this function deliberately doesn't attempt
// to fully parse (would require inventing a channel-summing rule not
// present in the source text).
export function normalizePowerW(raw: string): number | null {
  const match = raw.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(?:watts?|w)\b/i);
  if (!match) return null;
  return Math.round(parseFloat(match[1]));
}

// EAN/GTIN-13 — validates a 13-digit numeric barcode. Real values measured
// under "Código de barras" are plain 13-digit strings (e.g. "8801046989869")
// — this only strips whitespace and validates length/digits, never
// computes or repairs a checksum (that would risk fabricating a code).
export function normalizeEan(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 13) return null;
  return digits;
}

// "Titânio Preto" / "Titanium Black" / "Black Titanium" → a single
// canonical token. Case/diacritic/whitespace-insensitive; word ORDER is
// deliberately preserved as found (never reordered), because reordering
// "Black Titanium" vs "Titanium Black" without a verified equivalence
// table would be inventing an equivalence, not measuring one. Compound
// per-part colors (e.g. "Relógio: Red Pink - Pulseira: Mango", a real
// value found in the audit) are deliberately NOT normalized — returns
// null, since guessing which part is "the" color would be fabricating a
// simplification the source data doesn't support.
export function normalizeColorToken(raw: string): string | null {
  if (raw.includes(":") || raw.includes("-") || raw.includes("/")) return null;
  const cleaned = raw
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned.length > 0 ? cleaned : null;
}

// "Cabo USB-C - Manual" / "Cable de audio Jack 3.5mm | AirTag x4" → an
// array of trimmed items, splitting on the delimiters actually observed
// (" - ", "|", ",") — never a semantic classification of what each item
// is, just a normalized list.
export function normalizeBundleIncludes(raw: string): string[] | null {
  const items = raw
    .split(/\s+-\s+|\||,/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return items.length > 0 ? items : null;
}
