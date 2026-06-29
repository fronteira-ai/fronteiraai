import type { SupabaseClient } from "@supabase/supabase-js";
import type { IMerchantReviewRepository } from "../repositories/IMerchantReviewRepository";
import type { MerchantReviewRecord, ReviewStats, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { ReviewStatus } from "../types/enums";

export class SupabaseMerchantReviewRepository implements IMerchantReviewRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByMerchantId(
    merchantId: string,
    options: PaginationOptions & { status?: ReviewStatus } = {}
  ): Promise<PaginatedResult<MerchantReviewRecord>> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let query = this.client
      .from("merchant_reviews")
      .select("*", { count: "exact" })
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);

    if (options.status) {
      query = query.eq("status", options.status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[MerchantReviewRepository.findByMerchantId]", error);
      return { data: [], total: 0, page, perPage, totalPages: 0 };
    }
    const total = count ?? 0;
    return { data: (data ?? []) as MerchantReviewRecord[], total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: string): Promise<MerchantReviewRecord | null> {
    const { data, error } = await this.client
      .from("merchant_reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[MerchantReviewRepository.findById]", error);
      return null;
    }
    return data as MerchantReviewRecord;
  }

  async findByReviewerAndMerchant(reviewerId: string, merchantId: string): Promise<MerchantReviewRecord | null> {
    const { data, error } = await this.client
      .from("merchant_reviews")
      .select("*")
      .eq("reviewer_id", reviewerId)
      .eq("merchant_id", merchantId)
      .is("deleted_at", null)
      .single();

    if (error) return null;
    return data as MerchantReviewRecord;
  }

  async create(
    input: Omit<MerchantReviewRecord, "id" | "created_at" | "edit_count" | "helpful_count" | "report_count" | "deleted_at">
  ): Promise<MerchantReviewRecord | null> {
    const { data, error } = await this.client
      .from("merchant_reviews")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("[MerchantReviewRepository.create]", error);
      return null;
    }
    return data as MerchantReviewRecord;
  }

  async update(id: string, patch: Partial<MerchantReviewRecord>): Promise<MerchantReviewRecord | null> {
    const { data, error } = await this.client
      .from("merchant_reviews")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[MerchantReviewRepository.update]", error);
      return null;
    }
    return data as MerchantReviewRecord;
  }

  async softDelete(id: string): Promise<boolean> {
    const { error } = await this.client
      .from("merchant_reviews")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[MerchantReviewRepository.softDelete]", error);
      return false;
    }
    return true;
  }

  async updateStatus(id: string, status: ReviewStatus): Promise<MerchantReviewRecord | null> {
    const { data, error } = await this.client
      .from("merchant_reviews")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[MerchantReviewRepository.updateStatus]", error);
      return null;
    }
    return data as MerchantReviewRecord;
  }

  async incrementHelpful(id: string): Promise<void> {
    const { error } = await this.client.rpc("increment_review_helpful", { review_id: id });
    if (error) console.error("[MerchantReviewRepository.incrementHelpful]", error);
  }

  async incrementReports(id: string): Promise<void> {
    const { error } = await this.client.rpc("increment_review_reports", { review_id: id });
    if (error) console.error("[MerchantReviewRepository.incrementReports]", error);
  }

  async getStats(merchantId: string): Promise<ReviewStats> {
    const { data, error } = await this.client
      .from("merchant_reviews")
      .select("rating, status")
      .eq("merchant_id", merchantId)
      .is("deleted_at", null);

    if (error || !data) {
      console.error("[MerchantReviewRepository.getStats]", error);
      return { total: 0, average: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, approvedCount: 0 };
    }

    const approved = data.filter((r) => r.status === "approved");
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of approved) {
      distribution[r.rating as number] = (distribution[r.rating as number] ?? 0) + 1;
      sum += r.rating as number;
    }
    const average = approved.length > 0 ? Math.round((sum / approved.length) * 10) / 10 : null;
    return { total: data.length, average, distribution, approvedCount: approved.length };
  }
}
