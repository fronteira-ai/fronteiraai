import type { SupabaseClient } from "@supabase/supabase-js";
import type { MergeExecution } from "../domain/MergeExecution";
import { MergeExecutionStatus } from "../types/enums";
import type { CreateMergeExecutionInput, IMergeExecutionRepository } from "../repositories/IMergeExecutionRepository";
import type { PaginatedResult, PaginationParams } from "../types/canonical-catalog.types";

function toMergeExecution(row: Record<string, unknown>): MergeExecution {
  return {
    id: row.id as string,
    mergeCandidateId: row.merge_candidate_id as string,
    sourceCanonicalProductId: row.source_canonical_product_id as string,
    targetCanonicalProductId: row.target_canonical_product_id as string,
    movedOfferIds: (row.moved_offer_ids as string[] | null) ?? [],
    status: row.status as MergeExecutionStatus,
    executedAt: row.executed_at as string,
    executedBy: (row.executed_by as string | null) ?? null,
    rolledBackAt: (row.rolled_back_at as string | null) ?? null,
    rolledBackBy: (row.rolled_back_by as string | null) ?? null,
  };
}

export class SupabaseMergeExecutionRepository implements IMergeExecutionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateMergeExecutionInput): Promise<MergeExecution> {
    const { data, error } = await this.client
      .from("merge_executions")
      .insert({
        merge_candidate_id: input.mergeCandidateId,
        source_canonical_product_id: input.sourceCanonicalProductId,
        target_canonical_product_id: input.targetCanonicalProductId,
        moved_offer_ids: input.movedOfferIds,
        executed_by: input.executedBy,
        status: MergeExecutionStatus.Executed,
      })
      .select("*")
      .single();

    if (error) throw new Error(`merge execution insert: ${error.message}`);
    return toMergeExecution(data);
  }

  async findById(id: string): Promise<MergeExecution | null> {
    const { data, error } = await this.client.from("merge_executions").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("[SupabaseMergeExecutionRepository.findById]", error.message);
      return null;
    }
    return data ? toMergeExecution(data) : null;
  }

  async findByCandidateId(mergeCandidateId: string): Promise<MergeExecution | null> {
    const { data, error } = await this.client
      .from("merge_executions")
      .select("*")
      .eq("merge_candidate_id", mergeCandidateId)
      .maybeSingle();
    if (error) {
      console.error("[SupabaseMergeExecutionRepository.findByCandidateId]", error.message);
      return null;
    }
    return data ? toMergeExecution(data) : null;
  }

  async findByStatus(status: MergeExecutionStatus, pagination: PaginationParams): Promise<PaginatedResult<MergeExecution>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("merge_executions")
      .select("*", { count: "exact" })
      .eq("status", status)
      .order("executed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseMergeExecutionRepository.findByStatus]", error.message);
      return { items: [], total: 0 };
    }
    return { items: (data ?? []).map(toMergeExecution), total: count ?? 0 };
  }

  async markRolledBack(id: string, rolledBackBy: string | null): Promise<void> {
    const { error } = await this.client
      .from("merge_executions")
      .update({ status: MergeExecutionStatus.RolledBack, rolled_back_at: new Date().toISOString(), rolled_back_by: rolledBackBy })
      .eq("id", id);
    if (error) throw new Error(`merge execution rollback update: ${error.message}`);
  }
}
