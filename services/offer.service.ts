import { supabase } from "@/lib/supabase";
import { Offer, OfferWithStore } from "@/types/offer";

export async function getOffers(): Promise<Offer[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data as Offer[];
}

export async function getOffersByProduct(
  productId: string
): Promise<OfferWithStore[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*, store:stores(*)")
    .eq("product_id", productId)
    .order("price", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data as OfferWithStore[];
}