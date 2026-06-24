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

export function storePath(slug: string): string {
  return `/store/${slug}`;
}

export function storeUrl(slug: string): string {
  return `${SITE_URL}${storePath(slug)}`;
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
