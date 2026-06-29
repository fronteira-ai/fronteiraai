import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITrustEventRepository, CreateTrustEventInput } from "../repositories/ITrustEventRepository";
import type { TrustEventRecord } from "../types/trust.types";
import type { TrustEventType } from "../types/enums";

export class SupabaseTrustEventRepository implements ITrustEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByMerchantId(merchantId: string, limit = 50): Promise<TrustEventRecord[]> {
    const { data, error } = await this.client
      .from("merchant_trust_events")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[TrustEventRepository.findByMerchantId]", error);
      return [];
    }
    return (data ?? []) as TrustEventRecord[];
  }

  async findByType(eventType: TrustEventType, limit = 100): Promise<TrustEventRecord[]> {
    const { data, error } = await this.client
      .from("merchant_trust_events")
      .select("*")
      .eq("event_type", eventType)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[TrustEventRepository.findByType]", error);
      return [];
    }
    return (data ?? []) as TrustEventRecord[];
  }

  async create(input: CreateTrustEventInput): Promise<TrustEventRecord | null> {
    const { data, error } = await this.client
      .from("merchant_trust_events")
      .insert({
        merchant_id: input.merchant_id,
        merchant_trust_id: input.merchant_trust_id ?? null,
        event_type: input.event_type,
        source: input.source,
        reason: input.reason ?? null,
        delta: input.delta ?? 0,
        score_before: input.score_before ?? null,
        score_after: input.score_after ?? null,
        metadata: input.metadata ?? {},
        created_by: input.created_by ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[TrustEventRepository.create]", error);
      return null;
    }
    return data as TrustEventRecord;
  }
}
