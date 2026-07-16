// Program Κ — Mission Κ-3, Objetivo 1/2. Real key fragmentation found in
// `canonical_products.specifications` (scripts/kappa3-attribute-audit.ts,
// 2026-07-15, 18.010 rows, 323 distinct keys, 63.5% non-empty): the same
// concept is stored under 2-3 differently-cased/language-variant keys, so
// ProductIdentityEngine's `specifications` factor (exact key+value match,
// src/domains/product-identity/domain/ProductIdentityEngine.ts specOverlap)
// silently never compares two offers that BOTH have color info if one says
// "COR" and the other "Color" — this map is what fixes that blindness.
//
// Deliberately conservative: only keys whose meaning is stable across every
// category were mapped. Keys like "TAMANHO"/"Tamaño"/"Capacidad" were
// measured and explicitly excluded — their meaning is category-dependent
// (watch case size vs. cable length vs. liquid volume vs. screen size) and
// mapping them flat would silently conflate different physical quantities,
// which Product Signature's confidence discipline forbids. See
// docs/engineering/ATTRIBUTE_EXTRACTION.md §3 for the full excluded list.
export const ATTRIBUTE_KEY_ALIASES: Record<string, string> = {
  // color — measured: COR (3228), Color (3135)
  COR: "color",
  Color: "color",
  cor: "color",

  // model — measured: Modelo (5231), MODELO (5115)
  Modelo: "model",
  MODELO: "model",
  modelo: "model",

  // ram_gb — measured: MEMÓRIA RAM (733)
  "MEMÓRIA RAM": "ram_gb",
  ram: "ram_gb",

  // capacity_gb — measured: MEMÓRIA INTERNA (703), Capacidad de almacenamiento (498)
  "MEMÓRIA INTERNA": "capacity_gb",
  "Capacidad de almacenamiento": "capacity_gb",
  armazenamento: "capacity_gb",

  // voltage — measured: VOLTAGEM (1088), Energía / Voltaje (495)
  VOLTAGEM: "voltage",
  "Energía / Voltaje": "voltage",

  // power_w — measured: POTÊNCIA (845), Potencia (738), POTÊNCIA NOMINAL (132)
  POTÊNCIA: "power_w",
  Potencia: "power_w",
  "POTÊNCIA NOMINAL": "power_w",

  // processor — measured: PROCESSADOR CPU (756), Procesador (533). Bare
  // "PROCESSADOR"/"CPU"/"chip" deliberately excluded — measured at far
  // lower frequency with ambiguous non-computing usage in the same sample
  // (e.g. blender/appliance "motor" listings), so mapping them risked a
  // false positive the higher-frequency, unambiguous keys don't have.
  "PROCESSADOR CPU": "processor",
  Procesador: "processor",

  // gpu — measured: GPU (388)
  GPU: "gpu",

  // ean — measured: "Código de barras" (376), real 13-digit EAN/GTIN values
  "Código de barras": "ean",

  // bundle_includes — measured: INCLUI (2760), Incluye (212)
  INCLUI: "bundle_includes",
  Incluye: "bundle_includes",

  // screen_size_in — measured: TELA (832). "Tamaño"/"TAMANHO" excluded, see
  // header comment — TELA is unambiguously screen-context, "Tamanho" is not.
  TELA: "screen_size_in",
};

export function resolveOfficialKey(rawKey: string): string | null {
  return ATTRIBUTE_KEY_ALIASES[rawKey] ?? null;
}
