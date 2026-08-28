/**
 * Merchant Feed Platform — row → RawOffer normalizer (compartilhado XML/JSON).
 *
 * Dado um extração de campo (slot → valor string) e uma config declarativa,
 * produz um RawOffer canônico ou um motivo de rejeição. Usado pelos dois
 * parsers (XML e JSON) para que NORMALIZAÇÃO seja um único caminho (REUSE).
 *
 * Regras (iguais às do XML parser V1):
 *   - external_id obrigatório → senão MISSING_EXTERNAL_ID
 *   - preço inválido → INVALID_PRICE (NUNCA zero)
 *   - estoque: UNKNOWN ≠ AVAILABLE; não inventar disponibilidade
 *   - disponibilidade "em estoque"/"0"/"sem estoque" normalizados
 */

import type { RawOffer } from "../../connectors/types/raw.types";
import { parseMerchantPrice } from "./MerchantPriceParser";
import type { MerchantFieldSlot } from "../config/MerchantSourceConfig";

/** Define campos canônicos lidos por slot (string ou número já stringify). */
export interface FieldReader {
  (slot: MerchantFieldSlot): string | undefined;
}

export interface RowNormalizeResult {
  offer?: RawOffer;
  reason?: string;
  codigo?: string;
}

const DISPO_AVAILABLE = new Set(["em estoque", "en stock", "disponible", "disponível", "1", "true", "sim", "si", "yes", "instock"]);
const DISPO_OUT = new Set(["sem estoque", "sin stock", "agotado", "esgotado", "0", "false", "não", "nao", "no", "no disponible"]);

/** Normaliza uma linha (extração de campo) em RawOffer — sem storeSlug (preenchido fora). */
export function rowToOffer(read: FieldReader, opts?: { forceCurrency?: "USD" | "PYG" }): RowNormalizeResult {
  const codigo = (read("external_id") ?? "").trim();
  const reason = validateRow(read, codigo);
  if (reason) return { codigo, reason };

  const price = parseMerchantPrice(read("price"));
  if (!price) return { codigo, reason: `INVALID_PRICE: ${read("price")}` };

  const stockRaw = parseInteger(read("stock"));
  const avail = normalizeAvailability2(read("availability"), stockRaw);

  const titleEs = read("title_es");
  const title = read("title");
  const desc = read("description");
  const name = (titleEs && titleEs.trim()) ? titleEs.trim() : (title ?? "").trim() || "(sem título)";

  const currency = opts?.forceCurrency ?? price.currency;

  const offer: RawOffer = {
    product: {
      externalId: codigo,
      name,
      description: desc?.trim() || undefined,
      brand: read("brand")?.trim() || undefined,
      category: read("category")?.trim() || undefined,
      imageUrl: read("image")?.trim() || undefined,
      specifications: undefined,
    },
    storeSlug: "",
    priceUSD: price.value,
    oldPriceUSD: parseMerchantPrice(read("regular_price"))?.value ?? null,
    inStock: avail,
    stockQuantity: stockRaw,
    productUrl: read("product_url")?.trim() || undefined,
    currency,
    condition: undefined,
    warranty: undefined,
    cashback: undefined,
  };
  return { offer };
}

function validateRow(read: FieldReader, codigo: string): string | null {
  if (!codigo) return "MISSING_EXTERNAL_ID";
  if (/\s/.test(codigo)) return "INVALID_EXTERNAL_ID (u)";
  if (!read("price")?.trim()) return "MISSING_PRICE";
  return null;
}

export function parseInteger(raw: string | undefined | number): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = parseInt(String(raw).replace(/[^\d-]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

export function normalizeAvailability2(dispo: string | undefined, stock: number | null): boolean | undefined {
  if (dispo === undefined || dispo === null) {
    // Sem sinal textual: usar estoque numérico SE explícito (0 → fora; >0 → disponível).
    return stock === null ? undefined : stock > 0;
  }
  const d = dispo.trim().toLowerCase();
  if (!d) return stock === null ? undefined : stock > 0;
  if (DISPO_AVAILABLE.has(d)) return true;
  if (DISPO_OUT.has(d)) return false;
  if (d.includes("stock") || d.includes("estoque")) {
    return d.includes("sem") || d.includes("sin") || d.includes("agot") ? false : true;
  }
  return stock === null ? undefined : stock > 0;
}
