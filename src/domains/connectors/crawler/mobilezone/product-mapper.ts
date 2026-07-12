import type { RawOffer } from "../../types/raw.types";
import { MOBILE_ZONE_CONFIG as CFG } from "./config";

// Shape confirmed by live fetch of https://products-api-dns.mobilezone.com.py/api/products?offset=0&limit=1
//
// FASE 2 — Sprint 2.5 — Objetivo 2. `productHasDetails`/`productHasColors`
// were present in every live response inspected during Sprint 2.4's audit
// (docs/product/DATA_QUALITY_AUDIT.md §6) but never declared on this
// interface — silently discarded. Adding them here requires zero new HTTP
// requests: both fields already arrive in the same list/detail responses
// this connector already fetches.
interface ApiProductDetail {
  name_py: string;
  detail?: { name_py: string };
}

interface ApiProductColor {
  name_py: string;
}

interface ApiProduct {
  id_product: number;
  stock: number;
  price: string;
  name_py: string;
  productHasCategories?: { id_category: number; name_py: string }[];
  productHasImages?: { url_image: string }[];
  productHasBrands?: { id_brand: number; name_py: string }[];
  productHasDetails?: ApiProductDetail[];
  productHasColors?: ApiProductColor[];
}

// Each entry pairs a label (`detail.name_py`, e.g. "Capacidad de
// almacenamiento") with a value (`name_py`). Entries missing either half are
// skipped rather than defaulted — a partial label/value pair is not usable
// evidence for Product Identity's `specifications` comparison.
function buildSpecifications(product: ApiProduct): Record<string, string> {
  const specs: Record<string, string> = {};

  for (const detail of product.productHasDetails ?? []) {
    const label = detail.detail?.name_py?.trim();
    const value = detail.name_py?.trim();
    if (label && value) specs[label] = value;
  }

  const color = product.productHasColors?.[0]?.name_py?.trim();
  if (color) specs["Color"] = color;

  return specs;
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
  const specifications = buildSpecifications(p);

  const offer: RawOffer = {
    product: {
      externalId: String(p.id_product),
      name: p.name_py,
      brand: brand || undefined,
      category,
      imageUrl,
      specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
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
