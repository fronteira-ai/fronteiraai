import { parse } from "node-html-parser";
import type { RawOffer } from "../../types/raw.types";
import { cleanText } from "../../sdk/parsing/textParsing";

export interface ParsedDetail {
  offer: RawOffer | null;
  error?: string;
}

const FALLBACK_CATEGORY_NAME = "Geral";

/**
 * Live audit (Program D — Wave 1): romapy.com's WooCommerce theme emits
 * Open Graph product meta tags (`product:price:amount`, `product:price:
 * currency`, `product:availability`, `og:image`) — the cleanest, most
 * locale-independent signal of the three new connectors (Source Discovery
 * Policy's "Structured Data" tier, one level above plain sitemap). No
 * regex-over-page-text needed for price, unlike Shopping China/Mega
 * Eletrônicos.
 */
export function parseDetailPage(html: string, url: string, storeSlug: string): ParsedDetail {
  try {
    const root = parse(html);

    const name = cleanText(root.querySelector(".product_title")?.text ?? root.querySelector("h1")?.text ?? "");
    if (!name) return { offer: null, error: `No product name found at ${url}` };

    const priceMeta = root.querySelector('meta[property="product:price:amount"]');
    const currencyMeta = root.querySelector('meta[property="product:price:currency"]');
    const priceUSD = parseFloat(priceMeta?.getAttribute("content") ?? "0") || 0;
    const currency = currencyMeta?.getAttribute("content") ?? "USD";

    if (priceUSD <= 0) return { offer: null, error: `No valid price at ${url}` };

    const availabilityMeta = root.querySelector('meta[property="product:availability"]');
    const inStock = (availabilityMeta?.getAttribute("content") ?? "instock").toLowerCase() === "instock";

    const skuText = cleanText(root.querySelector(".sku")?.text ?? "");
    const externalId = skuText || undefined;

    const categoryLink = root.querySelector(".posted_in a");
    const category = categoryLink ? cleanText(categoryLink.text) : FALLBACK_CATEGORY_NAME;

    const brandLink = root.querySelector('[itemprop="brand"] a');
    const brand = brandLink ? cleanText(brandLink.text) : undefined;

    const imageMeta = root.querySelector('meta[property="og:image"]');
    const imageUrl = imageMeta?.getAttribute("content") ?? undefined;

    const offer: RawOffer = {
      product: {
        externalId,
        name,
        brand,
        category,
        imageUrl,
      },
      storeSlug,
      priceUSD,
      currency,
      inStock,
      productUrl: url,
    };

    return { offer };
  } catch (err) {
    return { offer: null, error: err instanceof Error ? err.message : String(err) };
  }
}
