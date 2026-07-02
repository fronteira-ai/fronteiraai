import type { SupabaseClient } from "@supabase/supabase-js";
import type { IMerchantStoreLinkRepository } from "../repositories/IMerchantStoreLinkRepository";

export class SupabaseMerchantStoreLinkRepository implements IMerchantStoreLinkRepository {
  constructor(private readonly client: SupabaseClient) {}

  async link(merchantId: string, storeId: string): Promise<void> {
    const { error } = await this.client
      .from("merchant_stores")
      .upsert({ merchant_id: merchantId, store_id: storeId, is_primary: true }, { onConflict: "merchant_id,store_id" });
    if (error) throw new Error(`merchant store link: ${error.message}`);
  }

  async unlink(merchantId: string, storeId: string): Promise<void> {
    const { error } = await this.client.from("merchant_stores").delete().eq("merchant_id", merchantId).eq("store_id", storeId);
    if (error) throw new Error(`merchant store unlink: ${error.message}`);
  }

  async isLinked(merchantId: string, storeId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("merchant_stores")
      .select("id")
      .eq("merchant_id", merchantId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseMerchantStoreLinkRepository.isLinked]", error.message);
      return false;
    }
    return data !== null;
  }
}
