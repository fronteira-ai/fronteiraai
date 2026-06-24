import { supabase } from "@/lib/supabase";
import { Offer, OfferWithStore, OfferWithProduct } from "@/types/offer";

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
    .order("price_usd", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data as OfferWithStore[];
}

export async function getOffersByStore(
  storeId: string
): Promise<OfferWithProduct[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*, product:products(*)")
    .eq("store_id", storeId)
    .order("price_usd", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data as OfferWithProduct[];
}