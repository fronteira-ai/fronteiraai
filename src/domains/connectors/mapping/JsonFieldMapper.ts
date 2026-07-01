import type { IFieldMapper } from "./IFieldMapper";
import type { ConnectorBatch, RawOffer } from "../types/raw.types";

export class JsonFieldMapper implements IFieldMapper {
  readonly format = "json";

  parse(content: string, connectorId: string, storeSlug: string): ConnectorBatch {
    const data: unknown = JSON.parse(content);
    const items = Array.isArray(data) ? data : [data];

    const offers: RawOffer[] = items.map((item) => {
      const row = item as Record<string, unknown>;
      return this.toRawOffer(row, storeSlug);
    });

    return {
      connectorId,
      connectorVersion: "1.0",
      fetchedAt: new Date().toISOString(),
      items: offers,
    };
  }

  private toRawOffer(row: Record<string, unknown>, storeSlug: string): RawOffer {
    const product = row.product as Record<string, unknown> | undefined;

    return {
      product: {
        externalId: this.str(row.externalId),
        name: this.str(product?.name ?? row.name) ?? "",
        description: this.str(product?.description ?? row.description),
        brand: this.str(product?.brand ?? row.brand),
        category: this.str(product?.category ?? row.category),
        imageUrl: this.str(product?.imageUrl ?? row.imageUrl ?? row.image_url),
        specifications: this.record(product?.specifications ?? row.specifications),
      },
      storeSlug: this.str(row.storeSlug) ?? storeSlug,
      priceUSD: this.num(row.priceUSD ?? row.price_usd) ?? 0,
      priceBRL: this.num(row.priceBRL ?? row.price_brl),
      oldPriceUSD: this.num(row.oldPriceUSD ?? row.old_price_usd),
      inStock: this.bool(row.inStock ?? row.in_stock),
      stockQuantity: this.num(row.stockQuantity ?? row.stock_quantity),
      condition: this.str(row.condition),
      warranty: this.str(row.warranty),
      cashback: this.num(row.cashback),
      productUrl: this.str(row.productUrl ?? row.product_url),
      currency: this.str(row.currency) ?? "USD",
    };
  }

  private str(v: unknown): string | undefined {
    return v !== null && v !== undefined && v !== "" ? String(v) : undefined;
  }

  private num(v: unknown): number | undefined {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  }

  private bool(v: unknown): boolean | undefined {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "boolean") return v;
    if (v === "true" || v === "1" || v === 1) return true;
    if (v === "false" || v === "0" || v === 0) return false;
    return undefined;
  }

  private record(v: unknown): Record<string, string> | undefined {
    if (v === null || v === undefined || typeof v !== "object") return undefined;
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = String(val);
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
}
