import { parse } from "node-html-parser";
import type { RawOffer } from "../../types/raw";

export interface ParsedDetail {
  offer: RawOffer | null;
  error?: string;
}

function cleanPrice(raw: string): number {
  // Handles "91.000", "1.234.567", "13,00" → number
  return parseFloat(raw.replace(/\./g, "").replace(",", ".")) || 0;
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function parseDetailPage(
  html: string,
  url: string,
  storeSlug: string,
  categoryName: string,
  externalId: string
): ParsedDetail {
  try {
    const root = parse(html);

    // Product name — typically in <h1>
    const h1 = root.querySelector("h1");
    const name = cleanText(h1?.text ?? "");
    if (!name) return { offer: null, error: `No product name found at ${url}` };

    // Prices — scan all text nodes for "U$" and "Gs." patterns
    const pageText = root.text;

    // USD price: "U$ 13,00" or "U$13.00"
    let priceUSD = 0;
    const usdMatch = /U\$\s*([\d.,]+)/.exec(pageText);
    if (usdMatch) priceUSD = cleanPrice(usdMatch[1]);

    // Guarani price: "Gs. 91.000"
    let priceGs = 0;
    const gsMatch = /Gs\.\s*([\d.]+)/.exec(pageText);
    if (gsMatch) priceGs = cleanPrice(gsMatch[1]);

    // Old price (discounted original) — look for second Gs. occurrence
    let oldPriceUSD: number | undefined;
    const gsMatches = [...pageText.matchAll(/Gs\.\s*([\d.]+)/g)];
    if (gsMatches.length >= 2) {
      const p1 = cleanPrice(gsMatches[0][1]);
      const p2 = cleanPrice(gsMatches[1][1]);
      // The higher is the original, lower is current
      if (p1 > p2 && p2 > 0) { priceGs = p2; oldPriceUSD = p1; }
      else if (p2 > p1 && p1 > 0) { priceGs = p1; oldPriceUSD = p2; }
    }

    // Use USD price if available; otherwise store Gs price with PYG currency
    const finalPriceUSD = priceUSD > 0 ? priceUSD : priceGs;
    const currency = priceUSD > 0 ? "USD" : "PYG";

    if (finalPriceUSD <= 0) return { offer: null, error: `No valid price at ${url}` };

    // Brand — look for "Marca:" label in page, or first breadcrumb segment
    let brand = "";
    const brandMatch = /Marca:\s*([^\n<]+)/i.exec(html);
    if (brandMatch) brand = cleanText(brandMatch[1]);

    // Category — from breadcrumb
    let category = categoryName;
    const breadcrumbItems = root.querySelectorAll("nav a, .breadcrumb a, [aria-label='breadcrumb'] a");
    if (breadcrumbItems.length >= 2) {
      const last = cleanText(breadcrumbItems[breadcrumbItems.length - 1].text);
      if (last) category = last;
    }

    // Description — look for a description block
    const descEl = root.querySelector("[class*='description'], [class*='descripcion'], p.desc, .product-description");
    const description = cleanText(descEl?.text ?? "");

    // Images — look for CDN image URLs in the page
    const imgTags = root.querySelectorAll(`img[src*="${externalId}"]`);
    const imageUrl = imgTags.length > 0
      ? (imgTags[0].getAttribute("src") ?? null)
      : null;

    const offer: RawOffer = {
      product: {
        externalId,
        name,
        description: description || undefined,
        brand: brand || undefined,
        category: category || undefined,
        imageUrl: imageUrl || undefined,
      },
      storeSlug,
      priceUSD: finalPriceUSD,
      oldPriceUSD: oldPriceUSD,
      currency,
      inStock: true, // default; no explicit stock indicator found
      productUrl: url,
    };

    return { offer };
  } catch (err) {
    return { offer: null, error: err instanceof Error ? err.message : String(err) };
  }
}
