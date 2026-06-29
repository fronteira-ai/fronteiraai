import type { SupabaseClient } from "@supabase/supabase-js";
import type { IReviewReportRepository } from "../repositories/IReviewReportRepository";
import type { ReviewReportRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import type { ReviewReportStatus } from "../types/enums";

export class SupabaseReviewReportRepository implements IReviewReportRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByReviewId(reviewId: string): Promise<ReviewReportRecord[]> {
    const { data, error } = await this.client
      .from("review_reports")
      .select("*")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ReviewReportRepository.findByReviewId]", error);
      return [];
    }
    return (data ?? []) as ReviewReportRecord[];
  }

  async findPending(options: PaginationOptions = {}): Promise<PaginatedResult<ReviewReportRecord>> {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await this.client
      .from("review_reports")
      .select("*", { count: "exact" })
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("[ReviewReportRepository.findPending]", error);
      return { data: [], total: 0, page, perPage, totalPages: 0 };
    }
    const total = count ?? 0;
    return { data: (data ?? []) as ReviewReportRecord[], total, page, perPage, totalPages: Math.ceil(total / perPage) };
  }

  async findById(id: string): Promise<ReviewReportRecord | null> {
    const { data, error } = await this.client
      .from("review_reports")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[ReviewReportRepository.findById]", error);
      return null;
    }
    return data as ReviewReportRecord;
  }

  async findByReporterAndReview(reporterId: string, reviewId: string): Promise<ReviewReportRecord | null> {
    const { data, error } = await this.client
      .from("review_reports")
      .select("*")
      .eq("reporter_id", reporterId)
      .eq("review_id", reviewId)
      .single();

    if (error) return null;
    return data as ReviewReportRecord;
  }

  async create(
    input: Omit<ReviewReportRecord, "id" | "created_at" | "reviewed_by" | "reviewed_at" | "action_taken">
  ): Promise<ReviewReportRecord | null> {
    const { data, error } = await this.client
      .from("review_reports")
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error("[ReviewReportRepository.create]", error);
      return null;
    }
    return data as ReviewReportRecord;
  }

  async updateStatus(
    id: string,
    status: ReviewReportStatus,
    reviewedBy: string,
    actionTaken?: string
  ): Promise<ReviewReportRecord | null> {
    const { data, error } = await this.client
      .from("review_reports")
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        ...(actionTaken ? { action_taken: actionTaken } : {}),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[ReviewReportRepository.updateStatus]", error);
      return null;
    }
    return data as ReviewReportRecord;
  }
}
