import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearnedFact } from "../domain/LearnedFact";
import type { ILearnedFactRepository } from "../repositories/ILearnedFactRepository";
import type { FactType } from "../types/enums";
import type { LearnedFactInput, PaginatedResult, PaginationParams } from "../types/marketplace-memory.types";
import { LearnedFactMapper } from "../mappers/LearnedFactMapper";

export class SupabaseLearnedFactRepository implements ILearnedFactRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByCanonicalProductId(canonicalProductId: string): Promise<LearnedFact[]> {
    const { data, error } = await this.client
      .from("marketplace_memory_facts")
      .select("*")
      .eq("canonical_product_id", canonicalProductId);

    if (error) {
      console.error("[SupabaseLearnedFactRepository.findByCanonicalProductId]", error.message);
      return [];
    }
    return (data ?? []).map(LearnedFactMapper.toDomain);
  }

  async findByTypeAndValue(factType: FactType, factValue: string): Promise<LearnedFact[]> {
    const { data, error } = await this.client
      .from("marketplace_memory_facts")
      .select("*")
      .eq("fact_type", factType)
      .eq("fact_value", factValue);

    if (error) {
      console.error("[SupabaseLearnedFactRepository.findByTypeAndValue]", error.message);
      return [];
    }
    return (data ?? []).map(LearnedFactMapper.toDomain);
  }

  async upsert(input: LearnedFactInput): Promise<LearnedFact> {
    const { data, error } = await this.client
      .from("marketplace_memory_facts")
      .upsert(LearnedFactMapper.toRow(input), { onConflict: "canonical_product_id,fact_type" })
      .select("*")
      .single();

    if (error) throw new Error(`learned fact upsert: ${error.message}`);
    return LearnedFactMapper.toDomain(data);
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<LearnedFact>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from("marketplace_memory_facts")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseLearnedFactRepository.findAll]", error.message);
      return { items: [], total: 0 };
    }
    return { items: (data ?? []).map(LearnedFactMapper.toDomain), total: count ?? 0 };
  }

  async countByFactType(factType: FactType): Promise<number> {
    const { count, error } = await this.client
      .from("marketplace_memory_facts")
      .select("*", { count: "exact", head: true })
      .eq("fact_type", factType);
    if (error) {
      console.error("[SupabaseLearnedFactRepository.countByFactType]", error.message);
      return 0;
    }
    return count ?? 0;
  }

  async countTotal(): Promise<number> {
    const { count, error } = await this.client.from("marketplace_memory_facts").select("*", { count: "exact", head: true });
    if (error) {
      console.error("[SupabaseLearnedFactRepository.countTotal]", error.message);
      return 0;
    }
    return count ?? 0;
  }
}
