// Mission Ω-Gatekeeper (Catalog Integrity Firewall). The exact literal
// values audited as real production junk (Ω-Identity/Ω-Data: "Outros",
// "GENERAL", "SEM MARCA", "GENERICO"/"Genérico", "Diversos" — plus every
// equivalent commonly seen in PT/ES/EN e-commerce data) — never a value a
// connector or an operator is allowed to write as a permanent brand or
// category name. Checked AFTER normalization (case/diacritics/punctuation
// insensitive), so "Outros", "OUTROS", "outros " all match the same entry.

const FORBIDDEN_VALUES = new Set([
  "general",
  "geral",
  "outros",
  "outro",
  "generico",
  "genérico",
  "diversos",
  "diverso",
  "sem marca",
  "sem categoria",
  "unknown",
  "n/a",
  "na",
  "null",
  "undefined",
  "none",
  "vacio",
  "empty",
  "-",
  "",
]);

function normalizeForComparison(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function isForbiddenValue(value: string | null | undefined): boolean {
  if (!value) return true;
  return FORBIDDEN_VALUES.has(normalizeForComparison(value));
}

// A single generic token, alone, is never enough evidence to accept a value
// as a real brand/category — e.g. "Camara"/"H.tv" already sitting in
// production's `brands` table (Ω-Data audit) are exactly this failure mode:
// a common noun or truncated fragment that was never validated at write
// time. This is deliberately NOT the same list as FORBIDDEN_VALUES (those
// are placeholder markers; these are real words that just aren't brand/
// category names on their own).
const GENERIC_TOKENS = new Set([
  "camara", "camera", "producto", "product", "item", "articulo", "artigo",
  "accesorio", "acessorio", "accessory", "kit", "set", "combo", "pack",
]);

export function isGenericToken(value: string): boolean {
  return GENERIC_TOKENS.has(normalizeForComparison(value));
}
