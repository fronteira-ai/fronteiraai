import type { RawOffer } from "../../types/raw.types";
import { MOBILE_ZONE_CONFIG as CFG } from "./config";

// Shape confirmed by live fetch of https://products-api-dns.mobilezone.com.py/api/products?offset=0&limit=1
interface ApiProduct {
  id_product: number;
  stock: number;
  price: string;
  name_py: string;
  productHasCategories?: { id_category: number; name_py: string }[];
  productHasImages?: { url_image: string }[];
  productHasBrands?: { id_brand: number; name_py: string }[];
}

export interface ParsedProduct {
  offer: RawOffer | null;
  error?: string;
}

export function mapApiProduct(p: ApiProduct): ParsedProduct {
  if (!p.name_py) return { offer: null, error: `Product ${p.id_product} has no name` };

  const priceUSD = parseFloat(p.price);
  if (!Number.isFinite(priceUSD) || priceUSD <= 0) {
    return { offer: null, error: `Product ${p.id_product} has invalid price: ${p.price}` };
  }

  // "GENERAL" is a catch-all bucket present on every product alongside a
  // real subcategory — prefer the most specific (last) category the API
  // lists, falling back to "Geral" only if the array is empty.
  const categories = p.productHasCategories ?? [];
  const category = categories.length > 0 ? categories[categories.length - 1].name_py : "Geral";

  const imagePath = p.productHasImages?.[0]?.url_image;
  const imageUrl = imagePath ? `${CFG.imageBaseUrl}${imagePath}` : undefined;

  const brand = p.productHasBrands?.[0]?.name_py;

  const offer: RawOffer = {
    product: {
      externalId: String(p.id_product),
      name: p.name_py,
      brand: brand || undefined,
      category,
      imageUrl,
    },
    storeSlug: CFG.storeSlug,
    // Assumption, not independently verified against a second source (see
    // capabilities.ts) — treated as USD by the same convention as
    // Mega Eletrônicos/Atacado Connect until confirmed otherwise.
    priceUSD,
    currency: "USD",
    inStock: p.stock > 0,
    stockQuantity: p.stock,
    productUrl: `${CFG.baseUrl}/producto/${p.id_product}/`,
  };

  return { offer };
}
