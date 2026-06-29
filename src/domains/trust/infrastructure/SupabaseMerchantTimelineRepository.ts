import type { SupabaseClient } from "@supabase/supabase-js";
import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";
import type { MerchantTimelineRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { TimelineEventCategory, TimelineVisibility } from "../types/enums";

export class SupabaseMerchantTimelineRepository implements IMerchantTimelineRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByMerchantId(
    merchantId: string,
    options: PaginationOptions & { category?: TimelineEventCategory; visibility?: TimelineVisibility } = {}
  ): Promise<PaginatedResult<MerchantTimelineRecord>> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = this.client
      .from("merchant_timeline")
      .select("*", { count: "exact" })
      .eq("merchant_id", merchantId);

    if (options.category) query = query.eq("category", options.category);
    if (options.visibility) query = query.eq("visibility", options.visibility);

    const { data, error, count } = await query
      .order("occurred_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[MerchantTimelineRepository.findByMerchantId]", error);
      return { data: [], total: 0, page, perPage, totalPages: 0 };
    }
    const total = count ?? 0;
    return { data: (data ?? []) as MerchantTimelineRecord[], total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findPublicByMerchantId(merchantId: string, limit = 20): Promise<MerchantTimelineRecord[]> {
    const { data, error } = await this.client
      .from("merchant_timeline")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("visibility", "public")
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[MerchantTimelineRepository.findPublicByMerchantId]", error);
      return [];
    }
    return (data ?? []) as MerchantTimelineRecord[];
  }

  async create(input: Omit<MerchantTimelineRecord, "id" | "created_at">): Promise<MerchantTimelineRecord | null> {
    const { data, error } = await this.client
      .from("merchant_timeline")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("[MerchantTimelineRepository.create]", error);
      return null;
    }
    return data as MerchantTimelineRecord;
  }
}
