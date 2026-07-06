import type { SupabaseClient } from "@supabase/supabase-js";

export interface BrainVolumeMetrics {
  brainEvents: number;
  /** Knowledge Graph relations are derived per-merchant on read (KnowledgeGraphService,
   * Release 1.5), never persisted as a marketplace-wide count — null here is an honest
   * "not aggregated", not a fabricated zero. See docs/engineering/TECH_DEBT.md. */
  knowledgeRelations: number | null;
}

export async function getBrainVolumeMetrics(client: SupabaseClient): Promise<BrainVolumeMetrics> {
  const { count } = await client.from("merchant_trust_events").select("id", { count: "exact", head: true });

  return {
    brainEvents: count ?? 0,
    knowledgeRelations: null,
  };
}
