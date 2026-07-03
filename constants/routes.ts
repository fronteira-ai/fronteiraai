import { env } from "@/lib/env";

export const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

export function productPath(slug: string): string {
  return `/product/${slug}`;
}

export function productUrl(slug: string): string {
  return `${SITE_URL}${productPath(slug)}`;
}

export function searchPath(query?: string): string {
  return query ? `/search?q=${encodeURIComponent(query)}` : "/search";
}

export function searchUrl(query?: string): string {
  return `${SITE_URL}${searchPath(query)}`;
}

// Release 1.8 — Sprint 0.1 (Canonical Route Audit): /lojas/[slug] is the
// canonical public store page — /store/[slug] was a duplicate, older
// implementation, now a permanent (308) redirect via next.config.ts. Any
// new internal link to a store page should use lojaPath()/lojaUrl(), never
// hardcode `/store/` or `/lojas/` directly.
export function lojaPath(slug: string): string {
  return `/lojas/${slug}`;
}

export function lojaUrl(slug: string): string {
  return `${SITE_URL}${lojaPath(slug)}`;
}

export interface ProductsQueryParams {
  q?: string;
  category?: string;
  brand?: string;
  store?: string;
  minPrice?: string;
  maxPrice?: string;
  availability?: string;
  sort?: string;
  page?: string;
}

// Ordem fixa dos parâmetros, para que a mesma combinação de filtros sempre
// gere a mesma URL (canonical estável, independente da ordem em que o
// usuário interagiu com os filtros na UI).
const PRODUCTS_PARAM_ORDER: (keyof ProductsQueryParams)[] = [
  "q",
  "category",
  "brand",
  "store",
  "minPrice",
  "maxPrice",
  "availability",
  "sort",
  "page",
];

export function productsPath(params: ProductsQueryParams = {}): string {
  const search = new URLSearchParams();

  for (const key of PRODUCTS_PARAM_ORDER) {
    const value = params[key];
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/products?${query}` : "/products";
}

export function productsUrl(params: ProductsQueryParams = {}): string {
  return `${SITE_URL}${productsPath(params)}`;
}

export function comparePath(slug: string): string {
  return `/compare/${slug}`;
}

export function compareUrl(slug: string): string {
  return `${SITE_URL}${comparePath(slug)}`;
}

export function merchantPassportPath(merchantId: string): string {
  return `/lojistas/${merchantId}`;
}

export function merchantPassportUrl(merchantId: string): string {
  return `${SITE_URL}${merchantPassportPath(merchantId)}`;
}
