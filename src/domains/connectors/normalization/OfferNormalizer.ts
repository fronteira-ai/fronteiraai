import type { RawOffer } from "../types/raw.types";
import type { NormalizedOffer } from "../types/pipeline.types";
import { slugify } from "@/utils/slug";

const URL_RE = /^https?:\/\/.+/i;

export function normalizeOffer(raw: RawOffer): NormalizedOffer {
  const productName = raw.product.name.trim();
  const brandName = raw.product.brand?.trim() || "Outros";
  const categoryName = raw.product.category?.trim() || "Outros";

  const productSlug = slugify(productName);
  if (!productSlug) throw new Error(`Cannot slugify product name: "${productName}"`);

  const imageUrl = raw.product.imageUrl && URL_RE.test(raw.product.imageUrl) ? raw.product.imageUrl : null;
  const productUrl = raw.productUrl && URL_RE.test(raw.productUrl) ? raw.productUrl : null;
  const priceBRL = raw.priceBRL !== undefined && raw.priceBRL !== null && raw.priceBRL > 0 ? raw.priceBRL : null;

  return {
    raw,
    product: {
      name: productName,
      slug: productSlug,
      description: raw.product.description?.trim() || "",
      brandName,
      brandSlug: slugify(brandName),
      categoryName,
      categorySlug: slugify(categoryName),
      imageUrl,
      specifications: raw.product.specifications ?? {},
    },
    offer: {
      storeSlug: raw.storeSlug.trim(),
      priceUSD: raw.priceUSD,
      priceBRL,
      oldPriceUSD: raw.oldPriceUSD ?? null,
      inStock: raw.inStock ?? false,
      stockQuantity: raw.stockQuantity ?? null,
      condition: raw.condition ?? null,
      warranty: raw.warranty ?? null,
      cashback: raw.cashback ?? null,
      productUrl,
      currency: raw.currency ?? "USD",
    },
    resolvedImageUrl: null,
  };
}
