// Deliberately self-contained (no import from the app-level `@/types/offer`)
// — canonical-catalog/ defines its own minimal read-model shapes, same
// convention already used by connectors/ and product-identity/ for their
// own domain boundaries.
export interface CanonicalOfferView {
  offerId: string;
  storeId: string;
  storeSlug: string;
  priceUSD: number;
  inStock: boolean;
  stockQuantity: number | null;
  updatedAt: string;
  condition: string | null;
  warranty: string | null;
  productUrl: string | null;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface CanonicalProductInput {
  canonicalSlug: string;
  name: string;
  brandId: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  specifications: Record<string, string> | null;
}
