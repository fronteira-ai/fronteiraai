import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CanonicalPriceHistoryPoint,
  ICanonicalPriceHistoryRepository,
} from "../repositories/ICanonicalPriceHistoryRepository";

export class SupabaseCanonicalPriceHistoryRepository implements ICanonicalPriceHistoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByCanonicalProductId(canonicalProductId: string): Promise<CanonicalPriceHistoryPoint[]> {
    // price_history has no canonical_product_id column (and doesn't need
    // one — offer_id is still its only FK, ADR-017/018 schema untouched).
    // Supabase's embedded filter reaches through offers to scope by
    // canonical_product_id in one query.
    const { data, error } = await this.client
      .from("price_history")
      .select("offer_id, price_usd, recorded_at, offers!inner(canonical_product_id)")
      .eq("offers.canonical_product_id", canonicalProductId)
      .order("recorded_at", { ascending: true });

    if (error) {
      console.error("[SupabaseCanonicalPriceHistoryRepository.findByCanonicalProductId]", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      offerId: row.offer_id as string,
      priceUSD: row.price_usd as number,
      recordedAt: row.recorded_at as string,
    }));
  }
}
