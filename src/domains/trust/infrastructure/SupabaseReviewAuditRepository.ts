import type { SupabaseClient } from "@supabase/supabase-js";
import type { IReviewAuditRepository } from "../repositories/IReviewAuditRepository";
import type { ReviewAuditRecord } from "../types/trust.types";

export class SupabaseReviewAuditRepository implements IReviewAuditRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByReviewId(reviewId: string): Promise<ReviewAuditRecord[]> {
    const { data, error } = await this.client
      .from("review_history")
      .select("*")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[ReviewAuditRepository.findByReviewId]", error);
      return [];
    }
    return (data ?? []) as ReviewAuditRecord[];
  }

  async findByMerchantId(merchantId: string, limit = 50): Promise<ReviewAuditRecord[]> {
    const { data, error } = await this.client
      .from("review_history")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[ReviewAuditRepository.findByMerchantId]", error);
      return [];
    }
    return (data ?? []) as ReviewAuditRecord[];
  }

  async create(input: Omit<ReviewAuditRecord, "id" | "created_at">): Promise<ReviewAuditRecord | null> {
    const { data, error } = await this.client
      .from("review_history")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("[ReviewAuditRepository.create]", error);
      return null;
    }
    return data as ReviewAuditRecord;
  }
}
