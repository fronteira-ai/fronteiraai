import type { SupabaseClient } from "@supabase/supabase-js";
import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { MerchantTrustRecord, PaginationOptions, PaginatedResult } from "../types/trust.types";
import type { TrustStatus, TrustBadge } from "../types/enums";

export class SupabaseTrustRepository implements ITrustRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByMerchantId(merchantId: string): Promise<MerchantTrustRecord | null> {
    const { data, error } = await this.client
      .from("merchant_trust")
      .select("*")
      .eq("merchant_id", merchantId)
      .single();

    if (error) {
      console.error("[TrustRepository.findByMerchantId]", error);
      return null;
    }
    return data as MerchantTrustRecord;
  }

  async findAll(options: PaginationOptions = {}): Promise<PaginatedResult<MerchantTrustRecord>> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await this.client
      .from("merchant_trust")
      .select("*", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[TrustRepository.findAll]", error);
      return { data: [], total: 0, page, perPage, totalPages: 0 };
    }

    const total = count ?? 0;
    return {
      data: (data ?? []) as MerchantTrustRecord[],
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }

  async create(merchantId: string): Promise<MerchantTrustRecord | null> {
    const { data, error } = await this.client
      .from("merchant_trust")
      .insert({ merchant_id: merchantId })
      .select()
      .single();

    if (error) {
      console.error("[TrustRepository.create]", error);
      return null;
    }
    return data as MerchantTrustRecord;
  }

  async updateStatus(merchantId: string, status: TrustStatus): Promise<MerchantTrustRecord | null> {
    const { data, error } = await this.client
      .from("merchant_trust")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("merchant_id", merchantId)
      .select()
      .single();

    if (error) {
      console.error("[TrustRepository.updateStatus]", error);
      return null;
    }
    return data as MerchantTrustRecord;
  }

  async updateBadge(merchantId: string, badgeLevel: TrustBadge): Promise<MerchantTrustRecord | null> {
    const { data, error } = await this.client
      .from("merchant_trust")
      .update({ badge_level: badgeLevel, updated_at: new Date().toISOString() })
      .eq("merchant_id", merchantId)
      .select()
      .single();

    if (error) {
      console.error("[TrustRepository.updateBadge]", error);
      return null;
    }
    return data as MerchantTrustRecord;
  }

  async touch(merchantId: string): Promise<void> {
    const { error } = await this.client
      .from("merchant_trust")
      .update({ last_event_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("merchant_id", merchantId);

    if (error) {
      console.error("[TrustRepository.touch]", error);
    }
  }
}
