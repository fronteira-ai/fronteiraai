import type { SupabaseClient } from "@supabase/supabase-js";
import type { MerchantAttributePattern } from "../domain/MerchantAttributePattern";
import type { IMerchantAttributePatternRepository } from "../repositories/IMerchantAttributePatternRepository";
import type { MerchantAttributePatternInput } from "../types/marketplace-memory.types";
import { MerchantAttributePatternMapper } from "../mappers/MerchantAttributePatternMapper";

export class SupabaseMerchantAttributePatternRepository implements IMerchantAttributePatternRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByStoreId(storeId: string): Promise<MerchantAttributePattern[]> {
    const { data, error } = await this.client.from("merchant_attribute_patterns").select("*").eq("store_id", storeId);
    if (error) {
      console.error("[SupabaseMerchantAttributePatternRepository.findByStoreId]", error.message);
      return [];
    }
    return (data ?? []).map(MerchantAttributePatternMapper.toDomain);
  }

  async findByStoreAndKey(storeId: string, rawKey: string): Promise<MerchantAttributePattern | null> {
    const { data, error } = await this.client
      .from("merchant_attribute_patterns")
      .select("*")
      .eq("store_id", storeId)
      .eq("raw_key", rawKey)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseMerchantAttributePatternRepository.findByStoreAndKey]", error.message);
      return null;
    }
    return data ? MerchantAttributePatternMapper.toDomain(data) : null;
  }

  async upsert(input: MerchantAttributePatternInput, occurrences: number): Promise<MerchantAttributePattern> {
    const { data, error } = await this.client
      .from("merchant_attribute_patterns")
      .upsert(MerchantAttributePatternMapper.toRow(input, occurrences), { onConflict: "store_id,raw_key" })
      .select("*")
      .single();

    if (error) throw new Error(`merchant attribute pattern upsert: ${error.message}`);
    return MerchantAttributePatternMapper.toDomain(data);
  }

  async countTotal(): Promise<number> {
    const { count, error } = await this.client.from("merchant_attribute_patterns").select("*", { count: "exact", head: true });
    if (error) {
      console.error("[SupabaseMerchantAttributePatternRepository.countTotal]", error.message);
      return 0;
    }
    return count ?? 0;
  }
}
