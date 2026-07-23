import type { SupabaseClient } from "@supabase/supabase-js";
import type { KnowledgeRecord } from "../domain/KnowledgeRecord";
import type { IKnowledgeRepository } from "../repositories/IKnowledgeRepository";
import type { KnowledgeScope, KnowledgeType } from "../types/enums";
import type { KnowledgeRecordInput, PaginatedResult, PaginationParams } from "../types/knowledge-engine.types";
import { KnowledgeRecordMapper } from "../mappers/KnowledgeRecordMapper";

const TABLE = "knowledge_history";

export class SupabaseKnowledgeRepository implements IKnowledgeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findLatestByKey(knowledgeKey: string): Promise<KnowledgeRecord | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("knowledge_key", knowledgeKey)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseKnowledgeRepository.findLatestByKey]", error.message);
      return null;
    }
    return data ? KnowledgeRecordMapper.toDomain(data) : null;
  }

  async findHistoryByKey(knowledgeKey: string): Promise<KnowledgeRecord[]> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("knowledge_key", knowledgeKey).order("version", { ascending: true });

    if (error) {
      console.error("[SupabaseKnowledgeRepository.findHistoryByKey]", error.message);
      return [];
    }
    return (data ?? []).map(KnowledgeRecordMapper.toDomain);
  }

  async findLocalByTypeAndResolvedValue(knowledgeType: KnowledgeType, resolvedValue: string): Promise<KnowledgeRecord[]> {
    // Latest-per-key: fetch all versions for the (type, resolvedValue, local)
    // slice then keep only the highest version per knowledgeKey — avoids a
    // second round trip per key, cheap because this is scoped to one value.
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("knowledge_type", knowledgeType)
      .eq("resolved_value", resolvedValue)
      .eq("scope", "local")
      .order("version", { ascending: false });

    if (error) {
      console.error("[SupabaseKnowledgeRepository.findLocalByTypeAndResolvedValue]", error.message);
      return [];
    }
    return this.dedupeLatestPerKey(data ?? []);
  }

  async append(input: KnowledgeRecordInput, version: number): Promise<KnowledgeRecord> {
    const { data, error } = await this.client.from(TABLE).insert(KnowledgeRecordMapper.toRow(input, version)).select("*").single();
    if (error) throw new Error(`knowledge history append: ${error.message}`);
    return KnowledgeRecordMapper.toDomain(data);
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<KnowledgeRecord>> {
    const { limit, offset } = pagination;
    const { data, error, count } = await this.client
      .from(TABLE)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[SupabaseKnowledgeRepository.findAll]", error.message);
      return { items: [], total: 0 };
    }
    return { items: (data ?? []).map(KnowledgeRecordMapper.toDomain), total: count ?? 0 };
  }

  async findLatestByScope(scope: KnowledgeScope): Promise<KnowledgeRecord[]> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("scope", scope).order("version", { ascending: false });
    if (error) {
      console.error("[SupabaseKnowledgeRepository.findLatestByScope]", error.message);
      return [];
    }
    return this.dedupeLatestPerKey(data ?? []);
  }

  async findLatestByStore(storeId: string): Promise<KnowledgeRecord[]> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("store_id", storeId).order("version", { ascending: false });
    if (error) {
      console.error("[SupabaseKnowledgeRepository.findLatestByStore]", error.message);
      return [];
    }
    return this.dedupeLatestPerKey(data ?? []);
  }

  private dedupeLatestPerKey(rows: Record<string, unknown>[]): KnowledgeRecord[] {
    const latestByKey = new Map<string, KnowledgeRecord>();
    for (const row of rows) {
      const rec = KnowledgeRecordMapper.toDomain(row);
      if (!latestByKey.has(rec.knowledgeKey)) latestByKey.set(rec.knowledgeKey, rec);
    }
    return [...latestByKey.values()];
  }

  async countDistinctKeys(): Promise<number> {
    const { data, error } = await this.client.from(TABLE).select("knowledge_key");
    if (error) {
      console.error("[SupabaseKnowledgeRepository.countDistinctKeys]", error.message);
      return 0;
    }
    return new Set((data ?? []).map((r: { knowledge_key: string }) => r.knowledge_key)).size;
  }

  async countTotalVersions(): Promise<number> {
    const { count, error } = await this.client.from(TABLE).select("*", { count: "exact", head: true });
    if (error) {
      console.error("[SupabaseKnowledgeRepository.countTotalVersions]", error.message);
      return 0;
    }
    return count ?? 0;
  }
}
