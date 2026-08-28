// New Zone — product family listing → RawOffer (public GraphQL).
// Each family row is a real product: name, image_url, min/max price. Stock
// is NOT in the family listing — we do NOT invent it (unknown ≠ available);
// the connector enriches stock/brand via product_get_one when present.

import type { RawOffer } from "../../types/raw.types";
import { NEW_ZONE_CONFIG as CFG } from "./config";
import { graphql } from "./graphql-client";

export interface FamilyRow {
  id_product_family: number;
  id_product: number;
  name: string;
  image_url: string | null;
  min_price: number | null;
  max_price: number | null;
  min_price_tourist?: number | null;
}

export interface FamilyResponse {
  product_family_get_all: {
    count: number;
    rows: FamilyRow[];
  };
}

const FAMILY_QUERY = `
query Product_family_get_all($filters: ProductRequestInput, $order: OrderByInput) {
  product_family_get_all(filters: $filters, order: $order) {
    count
    rows { id_product_family id_product name image_url min_price max_price __typename }
    __typename
  }
}`;

/** Páginas todas as famílias de uma categoria estratégica (bounded). */
export async function fetchFamiliesByCategory(categoryId: number): Promise<FamilyRow[]> {
  const all: FamilyRow[] = [];
  for (let page = 1; page * CFG.pageSize <= CFG.maxPerCategory + CFG.pageSize; page++) {
    const res = await graphql<FamilyResponse>("Product_family_get_all", FAMILY_QUERY, {
      filters: { id_category: categoryId, limit: CFG.pageSize, page },
      order: { order: "DESC" },
    });
    const rows = res.data?.product_family_get_all?.rows ?? [];
    all.push(...rows);
    const total = res.data?.product_family_get_all?.count ?? rows.length;
    if (rows.length === 0 || all.length >= total || all.length >= CFG.maxPerCategory) break;
  }
  return all.slice(0, CFG.maxPerCategory);
}

/** Mapeia uma família para um RawOffer (preço = min/atual; categoria no nome não inventada). */
export function familyToOffer(family: FamilyRow): RawOffer {
  // min_price é o preço real (USD por padrão do catálogo). Sem inventar.
  const priceUSD = typeof family.min_price === "number" && family.min_price > 0 ? family.min_price : 0;
  return {
    product: {
      externalId: String(family.id_product_family),
      name: (family.name || "New Zone Product").trim().replace(/\s+/g, " "),
      imageUrl: family.image_url || undefined,
    },
    storeSlug: CFG.storeSlug,
    priceUSD,
    currency: "USD",
    inStock: undefined, // unknown — não afirmar disponibilidade (parsing failure ≠ available)
    productUrl: `${CFG.baseUrl}/producto/${family.id_product}/${slugify(family.name)}`,
  };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 80);
}
