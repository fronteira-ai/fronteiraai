import { env } from "@/lib/env";

export const SITE_URL = env.NEXT_PUBLIC_SITE_URL;

export function productPath(slug: string): string {
  return `/product/${slug}`;
}

export function productUrl(slug: string): string {
  return `${SITE_URL}${productPath(slug)}`;
}
