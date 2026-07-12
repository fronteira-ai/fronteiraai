// FASE 2 — Sprint 2.5 — Objetivo 1. Maps the free-text category name each
// connector scrapes from its own site's taxonomy to a shared canonical name,
// at ingestion time, before it reaches `upsertCategory`. This is a static
// synonym lookup, not an inference — every entry here was confirmed as the
// same real-world category by direct observation of production data
// (docs/product/CATEGORY_NORMALIZATION_REPORT.md §2, Sprint 2.4). Only the
// clusters that report rated "Alta"/"Média-Alta" confidence are mapped;
// GENERAL/Outros fallbacks and the console/jogo/acessório gaming cluster are
// deliberately left untouched (§3 of that report — those need product-level
// reclassification or hierarchy, not a flat synonym merge).
//
// Does not touch ProductIdentityEngine, Shadow Mode, or the database schema
// — `categories` keeps being upserted exactly as before, just with a more
// consistent `name`/`slug` input across connectors.

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeKey(rawCategoryName: string): string {
  return stripAccents(rawCategoryName).toLowerCase().trim();
}

const CATEGORY_SYNONYMS: Record<string, string> = {
  // Celulares e Smartphones
  smartphones: "Celulares e Smartphones",
  celular: "Celulares e Smartphones",
  celulares: "Celulares e Smartphones",
  iphone: "Celulares e Smartphones",
  "iphone swap": "Celulares e Smartphones",

  // Fones de Ouvido
  "fones de ouvido": "Fones de Ouvido",
  auriculares: "Fones de Ouvido",
  headsets: "Fones de Ouvido",
  headset: "Fones de Ouvido",
  "fone de ouvido sem fio": "Fones de Ouvido",

  // Tablets
  tablet: "Tablets",
  "tablet & ipad": "Tablets",
  "tablets e readers": "Tablets",

  // Cartões de Memória
  "cartao de memoria e sd": "Cartões de Memória",
  "cartões de memória": "Cartões de Memória",

  // Video Games (genérico — não inclui console/jogo/acessório específicos,
  // ver comentário do módulo)
  videogames: "Video Games",
  "video games": "Video Games",
  jogos: "Video Games",
};

/** Returns the canonical category name for a known synonym, or the input
 * unchanged when there's no mapping (e.g. "Outros", "GENERAL", or any
 * category not yet audited). */
export function normalizeCategoryName(rawCategoryName: string): string {
  const canonical = CATEGORY_SYNONYMS[normalizeKey(rawCategoryName)];
  return canonical ?? rawCategoryName;
}
