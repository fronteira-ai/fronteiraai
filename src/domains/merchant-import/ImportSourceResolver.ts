/**
 * Merchant Import — resolve RawOffers de CSV/XML/JSON reusando os parsers do
 * Merchant Feed (sem pipeline paralelo). É o ponto único que um operador usa:
 * parse → normalize → lista RawOffer p/ o ImportPlanBuilder/CommitService.
 */

import { MerchantCsvFeedParser } from "../merchant-feed/parser/MerchantCsvFeedParser";
import { MerchantJsonFeedParser } from "../merchant-feed/parser/MerchantJsonFeedParser";
import { MerchantFeedParser } from "../merchant-feed/parser/MerchantFeedParser";
import type { RawOffer } from "../connectors/types/raw.types";
import type { MerchantSourceConfig, MerchantFieldSlot } from "../merchant-feed/config/MerchantSourceConfig";
import type { ExistingProductForMatch } from "./ImportPlanBuilder";

export const DEFAULT_EXISTING_PRODUCTS: ExistingProductForMatch[] = [];

/** Resolve ofertas normalizadas de um conteúdo CSV/XML/JSON (reuso parsers). */
export class SourceParserResolver {
  resolveOffers(content: string, sourceType: "CSV" | "XML" | "JSON", fieldMapping: Record<string, string>, rootPath: string): RawOffer[] {
    if (sourceType === "CSV") {
      // CSV: mapping coluna→slot.
      const columnMapping: Record<string, MerchantFieldSlot> = {};
      for (const [k, v] of Object.entries(fieldMapping)) {
        if (isSlot(v)) columnMapping[k] = v as MerchantFieldSlot;
      }
      const cfg: MerchantSourceConfig = { sourceType: "CSV_FEED", feedUrl: "upload", fieldMapping: {} };
      return new MerchantCsvFeedParser(cfg, columnMapping).parse(content).offers;
    }
    if (sourceType === "JSON") {
      // JSON/XML: fieldMapping slot→path. Se a chave não é um slot, interpreta
      // value→key (auto-flip) para aceitar ambas as orientações do chamador.
      const slots: Record<string, string> = {};
      for (const [k, v] of Object.entries(fieldMapping)) {
        if (isSlot(k)) slots[k] = v;
        else if (isSlot(v)) slots[v] = k;
      }
      const cfg: MerchantSourceConfig = { sourceType: "JSON_FEED", feedUrl: "upload", rootPath, fieldMapping: slots as never };
      return new MerchantJsonFeedParser(cfg).parse(content).offers;
    }
    return new MerchantFeedParser().parse(content).offers;
  }
}

function isSlot(v: string): boolean {
  return ["external_id", "title", "title_es", "description", "brand", "category", "price", "price_iva", "regular_price", "currency", "stock", "availability", "image", "product_url", "updated_at"].includes(v);
}
