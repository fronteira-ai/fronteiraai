import { supabase } from "@/lib/supabase";
import { Store } from "@/types/store";

export async function getStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("rating", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data as Store[];
}

export async function getStore(id: string) {
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as Store;
}

export async function getRelatedStores(
  excludeStoreId: string,
  limit = 4
): Promise<Store[]> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .neq("id", excludeStoreId)
    .order("rating", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error);
    return [];
  }

  return data as Store[];
}