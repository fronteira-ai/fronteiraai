import type { SupabaseClient } from "@supabase/supabase-js";

// Shared by ConnectorCertificationService and ConnectorObservabilityService
// (Release 1.8 — Program A — Wave 5) — one query for "this store's offers
// joined with their product," not two near-identical copies.
export interface StoreOfferCatalogRow {
  id: string;
  in_stock: boolean;
  price_usd: number;
  currency: string;
  canonical_product_id: string | null;
  products: {
    id: string;
    name: string;
    image_url: string | null;
    category_id: string | null;
    brand_id: string | null;
    description: string | null;
  };
}

export async function fetchStoreOfferCatalog(client: SupabaseClient, storeId: string): Promise<StoreOfferCatalogRow[]> {
  const { data, error } = await client
    .from("offers")
    .select("id, in_stock, price_usd, currency, canonical_product_id, products!inner(id, name, image_url, category_id, brand_id, description)")
    .eq("store_id", storeId);

  if (error) {
    console.error("[fetchStoreOfferCatalog]", error.message);
    return [];
  }
  return (data ?? []) as unknown as StoreOfferCatalogRow[];
}
