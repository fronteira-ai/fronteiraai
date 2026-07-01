import { parse } from "node-html-parser";

export interface ListingProduct {
  url: string;
  slug: string;
  externalId: string;
}

export function parseListingPage(html: string, baseUrl: string): ListingProduct[] {
  const root = parse(html);
  const results: ListingProduct[] = [];
  const seen = new Set<string>();

  const links = root.querySelectorAll("a[href*='/producto/']");

  for (const link of links) {
    const href = link.getAttribute("href") ?? "";
    if (!href.startsWith("/producto/")) continue;

    const fullUrl = `${baseUrl}${href}`;
    if (seen.has(fullUrl)) continue;
    seen.add(fullUrl);

    // slug pattern: /producto/some-product-name-12345
    const match = /\/producto\/(.+)-(\d+)$/.exec(href);
    if (!match) continue;

    results.push({
      url: fullUrl,
      slug: match[1],
      externalId: match[2],
    });
  }

  return results;
}
