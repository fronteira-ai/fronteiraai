import { supabase } from "@/lib/supabase";

export async function searchEverything(search: string) {
  if (!search.trim()) {
    return {
      products: [],
      stores: [],
      brands: [],
    };
  }

  const [products, stores, brands] = await Promise.all([

    supabase
      .from("products")
      .select("*")
      .ilike("name", `%${search}%`),

    supabase
      .from("stores")
      .select("*")
      .ilike("name", `%${search}%`),

    supabase
      .from("brands")
      .select("*")
      .ilike("name", `%${search}%`),

  ]);

  return {

    products: products.data ?? [],

    stores: stores.data ?? [],

    brands: brands.data ?? [],

  };
}