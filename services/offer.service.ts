import { supabase } from "@/lib/supabase";
import { Offer, OfferWithStore, OfferWithProduct } from "@/types/offer";
import { OfferPriceMetrics, PriceChangeSource, PriceUpdateResult } from "@/types/priceHistory";

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

// Único caminho de escrita para preço de oferta (ADR-013/ADR-017) — Admin
// (Release 0.7) e Crawler (Release 0.8) devem chamar esta função, nunca
// fazer `supabase.from("offers").update({ price_usd: ... })` diretamente,
// para que todo histórico passe sempre por `price_history`. Não-op (sem
// gravar histórico nem atualizar a oferta) quando o preço não muda de fato.
export async function updateOfferPrice(
  offerId: string,
  newPriceUSD: number,
  newPriceBRL: number | null,
  source: PriceChangeSource = "manual"
): Promise<PriceUpdateResult | null> {
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("price_usd, price_brl")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    console.error(offerError);
    return null;
  }

  if (offer.price_usd === newPriceUSD && offer.price_brl === newPriceBRL) {
    return { offerId, previousPriceUSD: offer.price_usd, newPriceUSD, changed: false };
  }

  const { error: historyError } = await supabase.from("price_history").insert({
    offer_id: offerId,
    price_usd: newPriceUSD,
    price_brl: newPriceBRL,
    old_price_usd: offer.price_usd,
    source,
  });

  if (historyError) {
    console.error(historyError);
    return null;
  }

  const { data: updateData, error: updateError } = await supabase
    .from("offers")
    .update({ price_usd: newPriceUSD, price_brl: newPriceBRL, old_price: offer.price_usd })
    .eq("id", offerId)
    .select("id");

  if (updateError) {
    console.error(updateError);
    return null;
  }
  if (!updateData || updateData.length === 0) {
    console.error(`updateOfferPrice: UPDATE de offers.${offerId} não afetou nenhuma linha (RLS?)`);
    return null;
  }

  return { offerId, previousPriceUSD: offer.price_usd, newPriceUSD, changed: true };
}

// Insumo direto do futuro /compare (ADR-013) — `lowestPriceUSD`/
// `highestPriceUSD`/`priceChangePercent`/`lastPriceChangeAt` dependem de
// `price_history` (migration proposta, ainda não aplicada — ver
// database/migrations/0006_proposed_price_history.sql); degrada para esses
// 4 campos `null` em vez de lançar enquanto a tabela não existir, porque
// `currentPriceUSD` (de `offers`, sempre real) já é útil por si só.
export async function getOfferPriceMetrics(offerId: string): Promise<OfferPriceMetrics | null> {
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .select("price_usd")
    .eq("id", offerId)
    .maybeSingle();

  if (offerError || !offer) {
    console.error(offerError);
    return null;
  }

  const { data: history, error: historyError } = await supabase
    .from("price_history")
    .select("price_usd, recorded_at")
    .eq("offer_id", offerId)
    .order("recorded_at", { ascending: true });

  if (historyError) {
    console.error(historyError);
    return {
      offerId,
      currentPriceUSD: offer.price_usd,
      lowestPriceUSD: null,
      highestPriceUSD: null,
      priceChangePercent: null,
      lastPriceChangeAt: null,
    };
  }

  const entries = history ?? [];
  const prices = [...entries.map((entry) => entry.price_usd), offer.price_usd];
  const firstPrice = entries[0]?.price_usd ?? null;
  const lastEntry = entries[entries.length - 1] ?? null;

  return {
    offerId,
    currentPriceUSD: offer.price_usd,
    lowestPriceUSD: Math.min(...prices),
    highestPriceUSD: Math.max(...prices),
    priceChangePercent:
      firstPrice && firstPrice !== 0 ? ((offer.price_usd - firstPrice) / firstPrice) * 100 : null,
    lastPriceChangeAt: lastEntry ? lastEntry.recorded_at : null,
  };
}