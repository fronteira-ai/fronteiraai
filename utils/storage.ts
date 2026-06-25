const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const CATALOG_BUCKET = "catalog";

function buildUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${CATALOG_BUCKET}/${path}`;
}

export const catalogStorage = {
  productImage(slug: string, filename = "main.webp"): string {
    return buildUrl(`products/${slug}/${filename}`);
  },

  productGalleryImage(slug: string, index: number): string {
    return buildUrl(`products/${slug}/gallery/${index}.webp`);
  },

  storeCover(slug: string): string {
    return buildUrl(`stores/${slug}/cover.webp`);
  },

  storeLogo(slug: string): string {
    return buildUrl(`stores/${slug}/logo.webp`);
  },

  brandLogo(slug: string): string {
    return buildUrl(`brands/${slug}/logo.webp`);
  },
};

export function resolveImageUrl(
  storedUrl: string | null | undefined,
  fallbackType: "product" | "store" | "brand",
  slug: string
): string | null {
  if (storedUrl && storedUrl.startsWith("http")) return storedUrl;

  switch (fallbackType) {
    case "product":
      return catalogStorage.productImage(slug);
    case "store":
      return catalogStorage.storeCover(slug);
    case "brand":
      return catalogStorage.brandLogo(slug);
  }
}
