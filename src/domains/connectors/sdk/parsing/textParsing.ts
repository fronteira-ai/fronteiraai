// Connector SDK — shared by every Tier 1 connector's detail parser. Most of
// the region (Paraguay/Brazil border) uses "." as the thousands separator
// and "," as the decimal separator (es-PY/pt-BR convention) — Shopping
// China, Roma Shopping (Gs. price) and Atacado Connect (JSON-LD, locale-free)
// all match this. Mega Eletrônicos is the one confirmed exception (live
// audit, Program D Wave 1): its price display uses the opposite (US/
// international) convention — see `parseAmountUSFormat` below.

/** "1.234.567" -> 1234567, "13,00" -> 13, "91.000" -> 91000 */
export function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
}

/**
 * Release 1.8 — Program D — Marketplace Coverage Expansion, Wave 1. Live
 * audit of megaeletronicos.com found its price display uses the opposite
 * (US/international) convention — "," thousands, "." decimal, e.g.
 * "R$ 1,031.55" — falsifying this file's original header comment that one
 * convention covers every Tier 1 connector. Kept as a separate, explicitly
 * named function rather than a locale flag on `parseAmount`: Shopping China
 * (already certified, live in production) keeps calling the original
 * function completely unchanged — zero behavior change to existing
 * connectors, per this Wave's "não alterar arquitetura consolidada" mandate.
 */
export function parseAmountUSFormat(raw: string): number {
  return parseFloat(raw.replace(/,/g, "")) || 0;
}

export function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export interface CurrencyMatch {
  amount: number;
  currency: "USD" | "PYG" | "BRL";
}

/** Scans free text for the first recognized currency-prefixed amount, in
 * priority order — USD first (most directly usable, no conversion needed
 * downstream), then Gs./PYG, then R$/BRL. Returns null when none match,
 * never a fabricated zero. */
export function findFirstCurrencyAmount(text: string): CurrencyMatch | null {
  const usd = /U\$S?\s*([\d.,]+)/i.exec(text);
  if (usd) return { amount: parseAmount(usd[1]), currency: "USD" };

  const gs = /Gs\.?\s*([\d.,]+)/i.exec(text);
  if (gs) return { amount: parseAmount(gs[1]), currency: "PYG" };

  const brl = /R\$\s*([\d.,]+)/i.exec(text);
  if (brl) return { amount: parseAmount(brl[1]), currency: "BRL" };

  return null;
}
