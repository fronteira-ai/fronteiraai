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
    //
    // Mission 05.6 — offers-first. This used to be ONE embedded query
    // (`price_history` + `offers!inner(canonical_product_id)` + `order` on the
    // parent), which PostgREST renders as `INNER JOIN LATERAL ... ORDER BY
    // price_history.recorded_at`. The planner cannot push the
    // canonical_product_id filter into that LATERAL, so it walked all 72,651
    // `price_history` rows in order and ran one lateral probe per row (72,651
    // Memoize probes, 52,683 of them misses) to return a single canonical
    // product's history — measured in production: 651,4 ms and 207.233
    // buffers. Resolving the offers first and then reading their history keeps
    // the same filter and the same ordering, and measures 0,329 ms / 10
    // buffers.
    const { data: offerRows, error: offerError } = await this.client
      .from("offers")
      .select("id")
      .eq("canonical_product_id", canonicalProductId);

    if (offerError) {
      console.error("[SupabaseCanonicalPriceHistoryRepository.findByCanonicalProductId] offers:", offerError.message);
      return [];
    }

    const offerIds = ((offerRows ?? []) as { id: string }[]).map((row) => row.id);
    // No offer for this canonical product ⇒ no history. Same as the previous
    // INNER join returning zero rows.
    if (offerIds.length === 0) return [];

    const { data, error } = await this.client
      .from("price_history")
      .select("offer_id, price_usd, recorded_at")
      .in("offer_id", offerIds)
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
