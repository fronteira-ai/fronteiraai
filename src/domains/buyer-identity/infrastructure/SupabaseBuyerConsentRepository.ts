import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IBuyerConsentRepository,
  BuyerConsentRecord,
  RecordConsentInput,
} from "../repositories/IBuyerConsentRepository";

interface ConsentRow {
  id: string;
  buyer_id: string;
  consent_type: string;
  granted: boolean;
  metadata: Record<string, unknown>;
  recorded_at: string;
}

function toDomain(row: ConsentRow): BuyerConsentRecord {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    consentType: row.consent_type,
    granted: row.granted,
    metadata: row.metadata ?? {},
    recordedAt: row.recorded_at,
  };
}

export class SupabaseBuyerConsentRepository implements IBuyerConsentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async record(input: RecordConsentInput): Promise<BuyerConsentRecord | null> {
    const { data, error } = await this.client
      .from("buyer_consent_log")
      .insert({
        buyer_id: input.buyerId,
        consent_type: input.consentType,
        granted: input.granted,
        metadata: input.metadata ?? {},
      })
      .select("*")
      .single();
    if (error) {
      console.error("[SupabaseBuyerConsentRepository.record]", error.message);
      return null;
    }
    return toDomain(data as ConsentRow);
  }

  async findByBuyerId(buyerId: string): Promise<BuyerConsentRecord[]> {
    const { data, error } = await this.client
      .from("buyer_consent_log")
      .select("*")
      .eq("buyer_id", buyerId)
      .order("recorded_at", { ascending: false });
    if (error) {
      console.error("[SupabaseBuyerConsentRepository.findByBuyerId]", error.message);
      return [];
    }
    return (data as ConsentRow[]).map(toDomain);
  }

  async findCurrentByBuyerId(buyerId: string): Promise<Map<string, BuyerConsentRecord>> {
    const all = await this.findByBuyerId(buyerId);
    const current = new Map<string, BuyerConsentRecord>();
    // findByBuyerId is already ordered newest-first, so the first entry
    // seen per consentType is the current standing.
    for (const record of all) {
      if (!current.has(record.consentType)) current.set(record.consentType, record);
    }
    return current;
  }
}
