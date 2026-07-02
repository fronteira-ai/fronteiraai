import type { SupabaseClient } from "@supabase/supabase-js";
import type { MergeCandidate } from "../domain/MergeCandidate";
import { MergeCandidateStatus } from "../types/enums";
import type { CreateMergeCandidateInput, IMergeCandidateRepository } from "../repositories/IMergeCandidateRepository";
import type { PaginatedResult, PaginationParams } from "../types/canonical-catalog.types";

function toMergeCandidate(row: Record<string, unknown>): MergeCandidate {
  return {
    id: row.id as string,
    sourceCanonicalProductId: row.source_canonical_product_id as string,
    targetCanonicalProductId: row.target_canonical_product_id as string,
    confidence: row.confidence as number,
    algorithmVersion: row.algorithm_version as string,
    matchedAttributes: (row.matched_attributes as string[] | null) ?? [],
    mismatchedAttributes: (row.mismatched_attributes as string[] | null) ?? [],
    penalties: (row.penalties as MergeCandidate["penalties"] | null) ?? [],
    reason: row.reason as string,
    status: row.status as MergeCandidateStatus,
    reviewedAt: (row.reviewed_at as string | null) ?? null,
    reviewedBy: (row.reviewed_by as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export class SupabaseMergeCandidateRepository implements IMergeCandidateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateMergeCandidateInput): Promise<MergeCandidate> {
    const { data, error } = await this.client
      .from("merge_candidates")
      .insert({
        source_canonical_product_id: input.sourceCanonicalProductId,
        target_canonical_product_id: input.targetCanonicalProductId,
        confidence: input.confidence,
        algorithm_version: input.algorithmVersion,
        matched_attributes: input.matchedAttributes,
        mismatched_attributes: input.mismatchedAttributes,
        penalties: input.penalties,
        reason: input.reason,
        status: MergeCandidateStatus.Pending,
      })
      .select("*")
      .single();

    if (error) throw new Error(`merge candidate insert: ${error.message}`);
    return toMergeCandidate(data);
  }

  async findById(id: string): Promise<MergeCandidate | null> {
    const { data, error } = await this.client.from("merge_candidates").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[SupabaseMergeCandidateRepository.findById]", error.message);
      return null;
    }
    return data ? toMergeCandidate(data) : null;
  }

  async findByStatus(
    status: MergeCandidateStatus,
    pagination: PaginationParams
  ): Promise<PaginatedResult<MergeCandidate>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("merge_candidates")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseMergeCandidateRepository.findByStatus]", error.message);
      return { items: [], total: 0 };
    }

    return { items: (data ?? []).map(toMergeCandidate), total: count ?? 0 };
  }

  async findByPair(sourceCanonicalProductId: string, targetCanonicalProductId: string): Promise<MergeCandidate | null> {
    const { data, error } = await this.client
      .from("merge_candidates")
      .select("*")
      .eq("source_canonical_product_id", sourceCanonicalProductId)
      .eq("target_canonical_product_id", targetCanonicalProductId)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseMergeCandidateRepository.findByPair]", error.message);
      return null;
    }
    return data ? toMergeCandidate(data) : null;
  }

  async updateStatus(id: string, status: MergeCandidateStatus, reviewedBy: string | null): Promise<void> {
    const { error } = await this.client
      .from("merge_candidates")
      .update({ status, reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`merge candidate status update: ${error.message}`);
  }
}
