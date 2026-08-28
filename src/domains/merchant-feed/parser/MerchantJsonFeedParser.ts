/**
 * Merchant Feed Platform — JSON feed parser (declarative).
 *
 * Mapeia JSON de um lojista para o MESMO contrato downstream do XML (RawOffer
 * → Gatekeeper → canonical → offer → price history → freshness). Suporta:
 *   - array raiz:        [ {...}, {...} ]
 *   - objeto com lista:  { "products": [...] } (via rootPath, ex.: "products")
 *   - paths aninhados:   "product.id", "pricing.usd", "inventory.quantity",
 *                        "images.primary.url"
 *   - field mapping configurável (product.codigo / id / sku / variant_id ...)
 *   - itens com falta de campo → isolados (erro), item bom NÃO derruba feed.
 *
 * Segurança: resolve apenas caminhos planos (sem eval); reutiliza o mesmo
 * validador de preço/estoque do XML (`rowToOffer`).
 */

import type { RawOffer } from "../../connectors/types/raw.types";
import type { MerchantFeedParseResult } from "./MerchantFeedParser";
import {
  extractItems,
  resolvePath,
  validateMerchantSourceConfig,
  normalizeFieldMapping,
  type MerchantSourceConfig,
  type MerchantFieldSlot,
} from "../config/MerchantSourceConfig";
import { rowToOffer } from "./rowNormalizer";

export class MerchantJsonFeedParser {
  /**
   * @param cfg config declarativa (rootPath + fieldMapping). Validada antes de parse.
   */
  constructor(private readonly cfg: MerchantSourceConfig) {
    validateMerchantSourceConfig(cfg);
  }

  /** Faz o parse de um documento JSON e retorna as ofertas normalizadas. */
  parse(jsonText: string): MerchantFeedParseResult {
    const offers: RawOffer[] = [];
    const errors: Array<{ codigo?: string; reason: string }> = [];
    let totalItems = 0;

    let json: unknown;
    try {
      json = JSON.parse(jsonText);
    } catch (e) {
      return {
        offers,
        totalItems: 0,
        validItems: 0,
        invalidItems: 0,
        errors: [{ reason: `JSON_PARSE_ERROR: ${(e as Error).message.slice(0, 120)}` }],
      };
    }

    const items = extractItems(json, this.cfg.rootPath);
    totalItems = items.length;

    for (const item of items) {
      if (item === null || typeof item !== "object") {
        errors.push({ reason: "INVALID_ITEM_NOT_OBJECT" });
        continue;
      }
      const read = this.makeFieldReader(item as Record<string, unknown>, this.cfg);
      const forceCurrency = this.cfg.currency === "force_usd" ? "USD" : this.cfg.currency === "force_pyg" ? "PYG" : undefined;
      const res = rowToOffer(read, { forceCurrency });
      if (res.reason || !res.offer) {
        errors.push({ codigo: res.codigo, reason: res.reason ?? "INVALID" });
        continue;
      }
      offers.push(res.offer);
    }

    return {
      offers,
      totalItems,
      validItems: offers.length,
      invalidItems: totalItems - offers.length,
      errors,
    };
  }

  private makeFieldReader(item: Record<string, unknown>, cfg: MerchantSourceConfig) {
    const mapping = normalizeFieldMapping(cfg.fieldMapping);
    return (slot: MerchantFieldSlot): string | undefined => {
      const path = mapping[slot];
      if (!path) return undefined;
      const raw = resolvePath(item, path);
      if (raw === null || raw === undefined) return undefined;
      return typeof raw === "object" ? undefined : String(raw);
    };
  }
}
