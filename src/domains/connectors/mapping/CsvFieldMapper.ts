import type { IFieldMapper } from "./IFieldMapper";
import type { ConnectorBatch, RawOffer } from "../types/raw.types";

export interface CsvFieldMap {
  productName?: string;
  description?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  priceUSD?: string;
  priceBRL?: string;
  oldPriceUSD?: string;
  inStock?: string;
  stockQuantity?: string;
  condition?: string;
  warranty?: string;
  cashback?: string;
  productUrl?: string;
  currency?: string;
  storeSlug?: string;
  externalId?: string;
}

const DEFAULT_MAP: Required<CsvFieldMap> = {
  productName: "name",
  description: "description",
  brand: "brand",
  category: "category",
  imageUrl: "image_url",
  priceUSD: "price_usd",
  priceBRL: "price_brl",
  oldPriceUSD: "old_price_usd",
  inStock: "in_stock",
  stockQuantity: "stock_quantity",
  condition: "condition",
  warranty: "warranty",
  cashback: "cashback",
  productUrl: "product_url",
  currency: "currency",
  storeSlug: "store_slug",
  externalId: "external_id",
};

export class CsvFieldMapper implements IFieldMapper {
  readonly format = "csv";

  constructor(private readonly fieldMap: CsvFieldMap = {}) {}

  parse(content: string, connectorId: string, storeSlug: string): ConnectorBatch {
    const map = { ...DEFAULT_MAP, ...this.fieldMap };
    const rows = parseCSV(content);

    if (rows.length < 2) {
      return { connectorId, connectorVersion: "1.0", fetchedAt: new Date().toISOString(), items: [] };
    }

    const [headers, ...dataRows] = rows;
    const offers: RawOffer[] = dataRows
      .filter((row) => row.some((cell) => cell.trim() !== ""))
      .map((row) => {
        const get = (field: string) => {
          const idx = headers.indexOf(field);
          return idx >= 0 ? row[idx]?.trim() ?? "" : "";
        };

        const parseNum = (v: string) => {
          const n = parseFloat(v);
          return isNaN(n) ? undefined : n;
        };

        const parseBool = (v: string) => {
          if (!v) return undefined;
          return v.toLowerCase() === "true" || v === "1";
        };

        return {
          product: {
            externalId: get(map.externalId) || undefined,
            name: get(map.productName),
            description: get(map.description) || undefined,
            brand: get(map.brand) || undefined,
            category: get(map.category) || undefined,
            imageUrl: get(map.imageUrl) || undefined,
          },
          storeSlug: get(map.storeSlug) || storeSlug,
          priceUSD: parseNum(get(map.priceUSD)) ?? 0,
          priceBRL: parseNum(get(map.priceBRL)),
          oldPriceUSD: parseNum(get(map.oldPriceUSD)),
          inStock: parseBool(get(map.inStock)),
          stockQuantity: parseNum(get(map.stockQuantity)),
          condition: get(map.condition) || undefined,
          warranty: get(map.warranty) || undefined,
          cashback: parseNum(get(map.cashback)),
          productUrl: get(map.productUrl) || undefined,
          currency: get(map.currency) || "USD",
        };
      });

    return {
      connectorId,
      connectorVersion: "1.0",
      fetchedAt: new Date().toISOString(),
      items: offers,
    };
  }
}

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  const push = () => { row.push(cell); cell = ""; };
  const flush = () => { push(); rows.push(row); row = []; };

  while (i < content.length) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i += 2; continue; }
      if (ch === '"') { inQuotes = false; i++; continue; }
      cell += ch; i++; continue;
    }

    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { push(); i++; continue; }
    if (ch === "\r" && next === "\n") { flush(); i += 2; continue; }
    if (ch === "\n" || ch === "\r") { flush(); i++; continue; }
    cell += ch; i++;
  }

  if (cell || row.length > 0) flush();
  return rows;
}
