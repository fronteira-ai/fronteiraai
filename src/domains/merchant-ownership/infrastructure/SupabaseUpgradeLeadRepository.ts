import type { SupabaseClient } from "@supabase/supabase-js";
import type { IUpgradeLeadRepository, UpgradeLead } from "../repositories/IUpgradeLeadRepository";

function toUpgradeLead(row: Record<string, unknown>): UpgradeLead {
  return {
    id: row.id as string,
    merchantId: row.merchant_id as string,
    triggerContext: row.trigger_context as string,
    createdAt: row.created_at as string,
  };
}

export class SupabaseUpgradeLeadRepository implements IUpgradeLeadRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(merchantId: string, triggerContext: string): Promise<UpgradeLead> {
    const { data, error } = await this.client
      .from("merchant_upgrade_leads")
      .insert({ merchant_id: merchantId, trigger_context: triggerContext })
      .select("*")
      .single();
    if (error) throw new Error(`upgrade lead insert: ${error.message}`);
    return toUpgradeLead(data);
  }

  async findByMerchantId(merchantId: string): Promise<UpgradeLead[]> {
    const { data, error } = await this.client
      .from("merchant_upgrade_leads")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[SupabaseUpgradeLeadRepository.findByMerchantId]", error.message);
      return [];
    }
    return (data ?? []).map(toUpgradeLead);
  }
}
