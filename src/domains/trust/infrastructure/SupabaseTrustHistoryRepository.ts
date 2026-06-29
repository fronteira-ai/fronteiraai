import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITrustHistoryRepository } from "../repositories/ITrustHistoryRepository";
import type { TrustHistoryRecord } from "../types/trust.types";

export class SupabaseTrustHistoryRepository implements ITrustHistoryRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByMerchantId(merchantId: string, limit = 30): Promise<TrustHistoryRecord[]> {
    const { data, error } = await this.client
      .from("trust_history")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("snapshot_date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[TrustHistoryRepository.findByMerchantId]", error);
      return [];
    }
    return (data ?? []) as TrustHistoryRecord[];
  }

  async findLatest(merchantId: string): Promise<TrustHistoryRecord | null> {
    const { data, error } = await this.client
      .from("trust_history")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[TrustHistoryRepository.findLatest]", error);
      return null;
    }
    return data as TrustHistoryRecord | null;
  }

  async createSnapshot(
    merchantId: string,
    trustScore: number,
    status: string,
    badgeLevel: string | null,
    eventCount: number,
    verificationCount: number
  ): Promise<TrustHistoryRecord | null> {
    const snapshotDate = new Date().toISOString().split("T")[0];

    const { data, error } = await this.client
      .from("trust_history")
      .upsert(
        {
          merchant_id: merchantId,
          snapshot_date: snapshotDate,
          trust_score: trustScore,
          status,
          badge_level: badgeLevel,
          event_count: eventCount,
          verification_count: verificationCount,
        },
        { onConflict: "merchant_id,snapshot_date" }
      )
      .select()
      .single();

    if (error) {
      console.error("[TrustHistoryRepository.createSnapshot]", error);
      return null;
    }
    return data as TrustHistoryRecord;
  }
}
