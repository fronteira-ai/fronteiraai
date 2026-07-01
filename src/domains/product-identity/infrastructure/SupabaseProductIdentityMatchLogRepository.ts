import type { SupabaseClient } from "@supabase/supabase-js";
import type { IProductIdentityMatchLogRepository, MatchLogEntry } from "../repositories/IProductIdentityMatchLogRepository";

export class SupabaseProductIdentityMatchLogRepository implements IProductIdentityMatchLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async record(entry: MatchLogEntry): Promise<void> {
    const { error } = await this.client.from("product_identity_match_log").insert({
      batch_id: entry.batchId,
      connector_id: entry.connectorId,
      candidate_slug: entry.candidateSlug,
      candidate_store_slug: entry.candidateStoreSlug,
      suggested_product_id: entry.suggestedProductId,
      suggested_product_slug: entry.suggestedProductSlug,
      algorithm_version: entry.algorithmVersion,
      confidence_score: entry.confidenceScore,
      tier: entry.tier,
      strategy: entry.strategy,
      matched_attributes: entry.matchedAttributes,
      mismatched_attributes: entry.mismatchedAttributes,
      penalties: entry.penalties,
      final_decision: entry.finalDecision,
      explainability_reason: entry.explainabilityReason,
      processing_time_ms: entry.processingTimeMs,
    });
    if (error) console.error("[SupabaseProductIdentityMatchLogRepository.record]", error.message);
  }
}
