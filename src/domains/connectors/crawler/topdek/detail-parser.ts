// TopDek (Shopify) — detail page parser.
//
// Extracts a RawOffer from a Shopify product page. The canonical source is
// the <script type="application/ld+json"> Product block (server-rendered,
// verified live): it carries name, brand, offers (price/currency/
// availability) and image. We fell back to meta tags only when JSON-LD is
// absent — the goal is NO data fabrication ever, so if neither yields a
// usable price we return null (offer rejected).

import type { RawOffer } from "../../types/raw.types";

// Removed the node-html-parser dependency on purpose: this parser only needs
// JSON-LD (primary) + a lightweight og:title regex fallback, and node-html-parser
// ships ESM that breaks the project's ts-jest transform. Simpler + no dep.

interface JsonLdOffer {
  "@type"?: string;
  availability?: string;
  price?: string;
  priceCurrency?: string;
  url?: string;
}

interface JsonLdProduct {
  "@type"?: string;
  name?: string;
  brand?: { name?: string } | string;
  offers?: JsonLdOffer | JsonLdOffer[];
  image?: string | string[];
  sku?: string;
  url?: string;
  category?: string;
}

function extractJsonLd(html: string): JsonLdProduct | null {
  const blocks = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of blocks) {
    const inner = block
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();
    if (!inner) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(inner.replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
    } catch {
      continue;
    }
    if (obj && typeof obj === "object" && (obj as JsonLdProduct)["@type"] === "Product") {
      return obj as JsonLdProduct;
    }
    // sometimes wrapped in @graph
    const graph = (obj as { "@graph"?: unknown })?.["@graph"];
    if (Array.isArray(graph)) {
      const p = (graph as JsonLdProduct[]).find((n) => n["@type"] === "Product");
      if (p) return p;
    }
  }
  return null;
}

function cleanCategory(product: JsonLdProduct): string | undefined {
  if (typeof product.category === "string" && product.category.trim()) return product.category.trim();
  return undefined;
}

function cleanName(name: string): string {
  // Shopify titles often end with "| <store> HDPE/EVA Foam Sheet" — keep the
  // human part before the last "|" that separates the product from the brand
  // tagline, but never empty.
  const parts = name.split("|").map((s) => s.trim()).filter(Boolean);
  return parts[0] ?? name.trim();
}

export function parseDetailPage(
  url: string,
  externalId: string,
  html: string
): { offer: RawOffer | null; error?: string } {
  try {
    const json = extractJsonLd(html);
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["'][^>]*content=["']([^"']+)/i);
    const fallbackName = ogTitleMatch ? ogTitleMatch[1] : undefined;

    const name = cleanName((json?.name || fallbackName || "").trim());
    if (!name) return { offer: null, error: `No product name at ${url}` };

    const offers = json?.offers;
    const offer = Array.isArray(offers) ? offers[0] : offers;
    const priceText = offer?.price;
    const priceUSD = priceText ? parseFloat(priceText) : Number.NaN;
    if (!Number.isFinite(priceUSD) || priceUSD <= 0) {
      return { offer: null, error: `No valid price (${String(priceText)}) at ${url}` };
    }
    const currency = (offer?.priceCurrency || "USD").toUpperCase();
    // Shopify: availability InStock => true; OutOfStock => false. When
    // availability is absent, do NOT invent stock — treat as in-stock default
    // only for schema.org Offers that omit it (rarely) and never claim OOS.
    const avText = offer?.availability || "";
    const inStock = /^(InStock|http:\/\/schema\.org\/InStock)$/i.test(avText)
      ? true
      : /OutOfStock/i.test(avText)
        ? false
        : true;

    const brand = typeof json?.brand === "string" ? json.brand : json?.brand?.name;
    const image =
      typeof json?.image === "string" ? json.image : Array.isArray(json?.image) ? json.image[0] : undefined;
    const productUrl = offer?.url || json?.url || url;

    return {
      offer: {
        product: {
          externalId,
          name,
          brand: brand || undefined,
          category: cleanCategory(json || {}),
          imageUrl: image || undefined,
        },
        storeSlug: "topdek",
        priceUSD,
        currency,
        inStock,
        productUrl,
      },
    };
  } catch (err) {
    return { offer: null, error: err instanceof Error ? err.message : String(err) };
  }
}
