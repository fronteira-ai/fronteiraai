import { supabase } from "@/lib/supabase";
import { SearchResponse } from "@/types/search";
import { Product } from "@/types/product";
import { Store } from "@/types/store";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";

const RESULTS_PER_SECTION = 8;

// Escapa os caracteres especiais do LIKE/ILIKE do Postgres (% e _) para que
// o termo do usuário seja tratado como texto literal, não como wildcard.
function escapeLikePattern(value: string): string {
  return value.replace(/[%_]/g, (char) => `\\${char}`);
}

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
        .select("*")
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

  const products = (productsResult.data ?? []) as Product[];
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
