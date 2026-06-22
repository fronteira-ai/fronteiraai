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
