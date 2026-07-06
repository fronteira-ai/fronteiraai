import { parse } from "node-html-parser";
import type { RawOffer } from "../../types/raw.types";
import { parseAmountUSFormat, cleanText } from "../../sdk/parsing/textParsing";

export interface ParsedDetail {
  offer: RawOffer | null;
  error?: string;
}

const FALLBACK_CATEGORY_NAME = "Geral";

/**
 * Live audit (Program D — Wave 1): megaeletronicos.com is a structured,
 * template-driven site (unlike Shopping China's ad-hoc text scan) — price,
 * category, brand and stock all come from stable CSS selectors, not regex
 * over the whole page text. Prices use US-style formatting ("U$ 146.75",
 * "R$ 1,031.55") — see `parseAmountUSFormat` in the SDK.
 */
export function parseDetailPage(html: string, url: string, storeSlug: string, externalId: string): ParsedDetail {
  try {
    const root = parse(html);

    const name = cleanText(root.querySelector("h2.title-product")?.text ?? "");
    if (!name) return { offer: null, error: `No product name found at ${url}` };

    const usdText = root.querySelector(".product-detail-price h2.principal-br b")?.text ?? "";
    const usdMatch = /U\$\s*([\d.,]+)/.exec(usdText);
    const priceUSD = usdMatch ? parseAmountUSFormat(usdMatch[1]) : 0;
    if (priceUSD <= 0) return { offer: null, error: `No valid USD price at ${url}` };

    const brlText = root.querySelector(".product-detail-price h3.secundario b")?.text ?? "";
    const brlMatch = /R\$\s*([\d.,]+)/.exec(brlText);
    const priceBRL = brlMatch ? parseAmountUSFormat(brlMatch[1]) : null;

    const categoryLink = root.querySelector("a[href*='/producto/categoria/']");
    const category = categoryLink ? cleanText(categoryLink.text) : FALLBACK_CATEGORY_NAME;

    const brandLink = root.querySelector("a[href*='/producto/marca/']");
    const brand = brandLink ? cleanText(brandLink.text) : undefined;

    const stockText = cleanText(root.querySelector(".rd.stock")?.text ?? "");
    const inStock = stockText.toLowerCase().includes("estoque") && !stockText.toLowerCase().includes("esgotado");

    const imageEl = root.querySelector(".swiper_main .swiper-slide img");
    const imageUrl = imageEl?.getAttribute("src") ?? undefined;

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
      priceBRL,
      currency: "USD",
      inStock,
      productUrl: url,
    };

    return { offer };
  } catch (err) {
    return { offer: null, error: err instanceof Error ? err.message : String(err) };
  }
}
