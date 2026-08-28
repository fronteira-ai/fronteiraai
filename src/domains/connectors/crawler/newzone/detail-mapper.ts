// New Zone — enriquecimento via product_get_one (público): brand + category
// + stock reais. Necessário p/ o Gatekeeper (Catalog Integrity Firewall)
// confirmar brand/category e persistir a oferta — sem isso a oferta vai para
// catalog_pending_review (correto: "nunca Raw Value → INSERT").

import type { RawOffer } from "../../types/raw.types";
import { graphql } from "./graphql-client";
import { NEW_ZONE_CONFIG as CFG } from "./config";

interface DetailCategory { id_category?: number; name?: string }
interface DetailProduct {
  stock?: number | null;
  brand?: { name?: string } | null;
  categories?: DetailCategory[] | null;
  price?: number | null;
}
interface DetailResp { product_get_one: DetailProduct | null }

const DETAIL_QUERY = `
query GetProduct($productGetOneId: Int!) {
  product_get_one(id: $productGetOneId) {
    stock brand { name __typename } categories { id_category name __typename } __typename
  }
}`;

/** Enriquece um RawOffer com brand/category/stock reais (público). Best-effort. */
export async function enrichOffer(offer: RawOffer): Promise<void> {
  const id = Number(offer.product.externalId);
  if (!id) return;
  try {
    const res = await graphql<DetailResp>("GetProduct", DETAIL_QUERY, { productGetOneId: id });
    const p = res.data?.product_get_one;
    if (!p) return;
    if (p.brand?.name && !offer.product.brand) offer.product.brand = p.brand.name.trim();
    if ((p.categories?.length ?? 0) > 0 && !offer.product.category) {
      // pega a categoria mais específica (a de maior id sugestiva) ou a primeira nomeada
      const cat = p.categories!.find((c) => c.name) ?? p.categories![0];
      if (cat?.name) offer.product.category = cat.name.trim();
    }
    if (typeof p.stock === "number") offer.inStock = p.stock > 0;
    // price do detail (mais preciso) só quando o listing não deu
    if (typeof p.price === "number" && p.price > 0 && offer.priceUSD <= 0) offer.priceUSD = p.price;
  } catch (e) {
    console.warn(`[NewZone] enrich failed ${id}: ${(e as Error).message.slice(0, 60)}`);
  }
}

export const detailDelayMs = CFG.requestDelayMs;
