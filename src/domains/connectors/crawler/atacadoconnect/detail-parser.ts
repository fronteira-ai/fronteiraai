import type { RawOffer } from "../../types/raw.types";

export interface ParsedDetail {
  offer: RawOffer | null;
  error?: string;
}

interface ProductJsonLd {
  name?: string;
  description?: string;
  image?: string;
  brand?: { name?: string };
  offers?: { priceCurrency?: string; price?: number; availability?: string };
}

const JSON_LD_RE = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/;

/** URL shape: /produto/{category}/{slug}/{id} — category is the only field
 * the JSON-LD block doesn't carry, so it's read straight from the URL
 * instead of scraping a breadcrumb. */
function categoryFromUrl(url: string): string {
  const match = /\/produto\/([^/]+)\//.exec(url);
  return match ? decodeURIComponent(match[1]).replace(/-/g, " ") : "Geral";
}

/**
 * Live audit (Program D — Wave 1): atacadoconnect.com (Next.js) embeds a
 * full schema.org Product `application/ld+json` block on every product
 * page — name, description, image, brand, price, currency and stock, all
 * as parsed JSON. No HTML scraping needed at all — the cleanest of the 4
 * sitemap-driven connectors (Source Discovery Policy's "Structured Data"
 * tier). The displayed BRL price column is confirmed broken (always shows
 * "0,00", per the original site audit) — never used; `priceCurrency` here
 * is always "USD" in practice, confirmed live.
 */
export function parseDetailPage(html: string, url: string, storeSlug: string, externalId: string): ParsedDetail {
  const match = JSON_LD_RE.exec(html);
  if (!match) return { offer: null, error: `No JSON-LD product block found at ${url}` };

  let data: ProductJsonLd;
  try {
    data = JSON.parse(match[1]);
  } catch (err) {
    return { offer: null, error: `Invalid JSON-LD at ${url}: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!data.name) return { offer: null, error: `No product name in JSON-LD at ${url}` };

  const priceUSD = data.offers?.price ?? 0;
  if (priceUSD <= 0) return { offer: null, error: `No valid price in JSON-LD at ${url}` };

  const currency = data.offers?.priceCurrency ?? "USD";
  const inStock = (data.offers?.availability ?? "").includes("InStock");

  const offer: RawOffer = {
    product: {
      externalId,
      name: data.name,
      description: data.description || undefined,
      brand: data.brand?.name || undefined,
      category: categoryFromUrl(url),
      imageUrl: data.image || undefined,
    },
    storeSlug,
    priceUSD,
    currency,
    inStock,
    productUrl: url,
  };

  return { offer };
}
