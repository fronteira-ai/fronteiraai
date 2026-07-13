import { supabase } from "@/lib/supabase";
import { SearchResponse } from "@/types/search";
import { ProductCatalogItem, ProductWithRelations } from "@/types/product";
import { Store } from "@/types/store";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";
import { escapeLikePattern } from "@/utils/search";

// Release 2.0 — Wave 1 (Quick Wins). Closes the gap named in
// docs/product/BUYER_INTELLIGENCE_MAP.md: search results never showed price.
// Same offers!left join pattern already used by getProductsCatalog
// (services/product.service.ts) — offers!left so a product without any
// offer yet still appears (never hidden), just without a price badge.
type SearchProductRow = ProductWithRelations & { offers: { price_usd: number; in_stock: boolean; store_id: string }[] };

const RESULTS_PER_SECTION = 8;

function emptyResponse(query: string, durationMs = 0): SearchResponse {
  return {
    query,
    products: [],
    stores: [],
    brands: [],
    categories: [],
    total: 0,
    durationMs,
  };
}

export async function searchEverything(search: string): Promise<SearchResponse> {
  const query = search.trim();

  if (!query) {
    return emptyResponse(query);
  }

  const startedAt = Date.now();
  const pattern = `%${escapeLikePattern(query)}%`;

  const [productsResult, storesResult, brandsResult, categoriesResult] =
    await Promise.all([
      supabase
        .from("products")
        .select("*, brand:brands(*), category:categories(*), offers!left(price_usd, in_stock, store_id)")
        .ilike("name", pattern)
        .limit(RESULTS_PER_SECTION),

      supabase
        .from("stores")
        .select("*")
        .ilike("name", pattern)
        .limit(RESULTS_PER_SECTION),

      supabase
        .from("brands")
        .select("*")
        .ilike("name", pattern)
        .limit(RESULTS_PER_SECTION),

      supabase
        .from("categories")
        .select("*")
        .ilike("name", pattern)
        .limit(RESULTS_PER_SECTION),
    ]);

  const results = [productsResult, storesResult, brandsResult, categoriesResult];
  const allFailed = results.every((result) => result.error);

  if (allFailed) {
    results.forEach((result) => console.error(result.error));
    throw new Error("Não foi possível completar a busca. Tente novamente.");
  }

  results.forEach((result) => {
    if (result.error) console.error(result.error);
  });

  const productRows = (productsResult.data ?? []) as unknown as SearchProductRow[];
  const products: ProductCatalogItem[] = productRows.map((row) => {
    const { offers, ...product } = row;
    const validOffers = (offers ?? []).filter((offer) => typeof offer.price_usd === "number");
    const lowestOffer = validOffers.reduce<(typeof validOffers)[number] | null>(
      (lowest, offer) => (!lowest || offer.price_usd < lowest.price_usd ? offer : lowest),
      null
    );
    return {
      ...product,
      lowestPriceUSD: lowestOffer?.price_usd ?? null,
      inStock: (offers ?? []).some((offer) => offer.in_stock),
      // Release 2.0 — Wave 4 (Trust Experience) — the store behind the
      // displayed price, for TrustComposer.composeCompactForStores.
      lowestPriceStoreId: lowestOffer?.store_id ?? null,
    };
  });
  const stores = (storesResult.data ?? []) as Store[];
  const brands = (brandsResult.data ?? []) as Brand[];
  const categories = (categoriesResult.data ?? []) as Category[];

  return {
    query,
    products,
    stores,
    brands,
    categories,
    total: products.length + stores.length + brands.length + categories.length,
    durationMs: Date.now() - startedAt,
  };
}
