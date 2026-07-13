import type { SupabaseClient } from "@supabase/supabase-js";
import type { IBadgeRepository } from "../repositories/IBadgeRepository";
import type { MerchantBadgeRecord } from "../types/trust.types";
import type { TrustBadge } from "../types/enums";

export class SupabaseBadgeRepository implements IBadgeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByMerchantId(merchantId: string): Promise<MerchantBadgeRecord[]> {
    const { data, error } = await this.client
      .from("merchant_badges")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("[BadgeRepository.findByMerchantId]", error);
      return [];
    }
    return (data ?? []) as MerchantBadgeRecord[];
  }

  async findActiveBadge(merchantId: string): Promise<MerchantBadgeRecord | null> {
    const { data, error } = await this.client
      .from("merchant_badges")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("is_active", true)
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[BadgeRepository.findActiveBadge]", error);
      return null;
    }
    return data as MerchantBadgeRecord | null;
  }

  async findActiveBadgesByMerchantIds(merchantIds: string[]): Promise<Map<string, MerchantBadgeRecord>> {
    if (merchantIds.length === 0) return new Map();
    const { data, error } = await this.client
      .from("merchant_badges")
      .select("*")
      .in("merchant_id", merchantIds)
      .eq("is_active", true)
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("[BadgeRepository.findActiveBadgesByMerchantIds]", error);
      return new Map();
    }
    // Rows are ordered newest-first; a Map keeps only the first (most
    // recent) badge seen per merchant_id, matching findActiveBadge's
    // single-row semantics.
    const map = new Map<string, MerchantBadgeRecord>();
    for (const row of (data ?? []) as MerchantBadgeRecord[]) {
      if (!map.has(row.merchant_id)) map.set(row.merchant_id, row);
    }
    return map;
  }

  async grant(
    merchantId: string,
    badgeType: TrustBadge,
    grantedBy: string,
    expiresAt?: string
  ): Promise<MerchantBadgeRecord | null> {
    const { data, error } = await this.client
      .from("merchant_badges")
      .insert({
        merchant_id: merchantId,
        badge_type: badgeType,
        granted_by: grantedBy,
        expires_at: expiresAt ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[BadgeRepository.grant]", error);
      return null;
    }
    return data as MerchantBadgeRecord;
  }

  async revoke(id: string, revokedBy: string, reason: string): Promise<MerchantBadgeRecord | null> {
    const { data, error } = await this.client
      .from("merchant_badges")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoke_reason: reason,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[BadgeRepository.revoke]", error);
      return null;
    }
    void revokedBy;
    return data as MerchantBadgeRecord;
  }

  async deactivateAll(merchantId: string): Promise<void> {
    const { error } = await this.client
      .from("merchant_badges")
      .update({ is_active: false })
      .eq("merchant_id", merchantId)
      .eq("is_active", true);

    if (error) {
      console.error("[BadgeRepository.deactivateAll]", error);
    }
  }
}
