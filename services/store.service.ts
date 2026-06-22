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