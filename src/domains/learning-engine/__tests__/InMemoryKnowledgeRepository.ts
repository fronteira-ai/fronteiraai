import type { KnowledgeRecord } from "../domain/KnowledgeRecord";
import type { IKnowledgeRepository } from "../repositories/IKnowledgeRepository";
import type { KnowledgeScope, KnowledgeType } from "../types/enums";
import type { KnowledgeRecordInput, PaginatedResult, PaginationParams } from "../types/knowledge-engine.types";

/** Test double — same role as the in-memory fakes marketplace-memory's own
 * tests use (jest.fn()-based), but a real in-memory store because this
 * domain's append-only/versioning behavior is exactly what needs exercising,
 * not just "was this called with these args". */
export class InMemoryKnowledgeRepository implements IKnowledgeRepository {
  rows: KnowledgeRecord[] = [];
  private nextId = 1;

  async findLatestByKey(knowledgeKey: string): Promise<KnowledgeRecord | null> {
    const matches = this.rows.filter((r) => r.knowledgeKey === knowledgeKey);
    if (matches.length === 0) return null;
    return matches.reduce((a, b) => (b.version > a.version ? b : a));
  }

  async findHistoryByKey(knowledgeKey: string): Promise<KnowledgeRecord[]> {
    return this.rows.filter((r) => r.knowledgeKey === knowledgeKey).sort((a, b) => a.version - b.version);
  }

  async findLocalByTypeAndResolvedValue(knowledgeType: KnowledgeType, resolvedValue: string): Promise<KnowledgeRecord[]> {
    const candidates = this.rows.filter((r) => r.knowledgeType === knowledgeType && r.resolvedValue === resolvedValue && r.scope === "local");
    const latestByKey = new Map<string, KnowledgeRecord>();
    for (const r of candidates) {
      const cur = latestByKey.get(r.knowledgeKey);
      if (!cur || r.version > cur.version) latestByKey.set(r.knowledgeKey, r);
    }
    return [...latestByKey.values()];
  }

  async append(input: KnowledgeRecordInput, version: number): Promise<KnowledgeRecord> {
    // Real append-only guarantee, same as the DB UNIQUE(knowledge_key, version).
    if (this.rows.some((r) => r.knowledgeKey === input.knowledgeKey && r.version === version)) {
      throw new Error(`duplicate version ${version} for key ${input.knowledgeKey}`);
    }
    const rec: KnowledgeRecord = {
      id: `rec-${this.nextId++}`,
      knowledgeKey: input.knowledgeKey,
      knowledgeType: input.knowledgeType,
      scope: input.scope,
      storeId: input.storeId,
      rawValue: input.rawValue,
      resolvedValue: input.resolvedValue,
      confidence: input.confidence,
      occurrences: input.occurrences,
      distinctStoreCount: input.distinctStoreCount,
      version,
      sourceSystem: input.sourceSystem,
      sourceId: input.sourceId,
      reason: input.reason,
      isConflict: input.isConflict,
      algorithmVersion: input.algorithmVersion,
      createdAt: new Date().toISOString(),
    };
    this.rows.push(rec);
    return rec;
  }

  async findAll(pagination: PaginationParams): Promise<PaginatedResult<KnowledgeRecord>> {
    const sorted = [...this.rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { items: sorted.slice(pagination.offset, pagination.offset + pagination.limit), total: sorted.length };
  }

  async findLatestByScope(scope: KnowledgeScope): Promise<KnowledgeRecord[]> {
    return this.dedupe(this.rows.filter((r) => r.scope === scope));
  }

  async findLatestByStore(storeId: string): Promise<KnowledgeRecord[]> {
    return this.dedupe(this.rows.filter((r) => r.storeId === storeId));
  }

  private dedupe(rows: KnowledgeRecord[]): KnowledgeRecord[] {
    const byKey = new Map<string, KnowledgeRecord>();
    for (const r of rows) {
      const cur = byKey.get(r.knowledgeKey);
      if (!cur || r.version > cur.version) byKey.set(r.knowledgeKey, r);
    }
    return [...byKey.values()];
  }

  async countDistinctKeys(): Promise<number> {
    return new Set(this.rows.map((r) => r.knowledgeKey)).size;
  }

  async countTotalVersions(): Promise<number> {
    return this.rows.length;
  }
}
