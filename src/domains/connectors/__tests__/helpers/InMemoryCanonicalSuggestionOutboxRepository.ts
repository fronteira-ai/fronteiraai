import type {
  CanonicalSuggestionOutboxEntry,
  CanonicalSuggestionOutboxStatus,
  CanonicalSuggestionPriority,
} from "../../domain/CanonicalSuggestionOutboxEntry";
import { PRIORITY_RANK } from "../../domain/CanonicalSuggestionOutboxEntry";
import type {
  CompletionSample,
  CompletionWindowCounts,
  ICanonicalSuggestionOutboxRepository,
  MarkDeadLetterInput,
  MarkFailedForRetryInput,
} from "../../repositories/ICanonicalSuggestionOutboxRepository";

const STATUSES: CanonicalSuggestionOutboxStatus[] = ["pending", "processing", "done", "failed", "dead_letter", "expired"];

/** Real in-memory behavior (not jest.fn() stubs) — mirrors
 * SupabaseCanonicalSuggestionOutboxRepository's semantics closely enough
 * (partial-uniqueness on enqueue, priority+createdAt claim ordering,
 * retention/expiration WHERE-clause scoping) to exercise the actual rules
 * this Mission hardens, the same testing discipline
 * InMemoryKnowledgeRepository (learning-engine/) already established. */
export class InMemoryCanonicalSuggestionOutboxRepository implements ICanonicalSuggestionOutboxRepository {
  rows: CanonicalSuggestionOutboxEntry[] = [];
  private nextId = 1;
  private nextCreatedAtMs = Date.parse("2026-07-01T00:00:00.000Z");

  private freshTimestamp(): string {
    // Strictly increasing per row, even within the same test tick — keeps
    // createdAt-based tie-break ordering deterministic in tests.
    this.nextCreatedAtMs += 1000;
    return new Date(this.nextCreatedAtMs).toISOString();
  }

  async enqueue(canonicalProductId: string, source: string, priority: CanonicalSuggestionPriority = "normal"): Promise<void> {
    const activeExists = this.rows.some((r) => r.canonicalProductId === canonicalProductId && (r.status === "pending" || r.status === "processing"));
    if (activeExists) return;

    const now = this.freshTimestamp();
    this.rows.push({
      id: `entry-${this.nextId++}`,
      canonicalProductId,
      status: "pending",
      priority,
      attempts: 0,
      lastError: null,
      lastAttemptedAt: null,
      nextAttemptAt: now,
      claimedAt: null,
      algorithmVersion: null,
      source,
      enqueuedAt: now,
      completedAt: null,
      createdAt: now,
    });
  }

  async claimBatch(limit: number, staleClaimMs: number): Promise<CanonicalSuggestionOutboxEntry[]> {
    const nowMs = Date.now();
    const staleBefore = nowMs - staleClaimMs;

    const candidates = this.rows.filter(
      (r) =>
        (r.status === "pending" && Date.parse(r.nextAttemptAt) <= nowMs) ||
        (r.status === "processing" && r.claimedAt !== null && Date.parse(r.claimedAt) < staleBefore)
    );

    candidates.sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
    });

    const toClaim = candidates.slice(0, limit);
    const claimedAt = new Date().toISOString();
    for (const entry of toClaim) {
      entry.status = "processing";
      entry.claimedAt = claimedAt;
    }
    return toClaim.map((e) => ({ ...e }));
  }

  private find(id: string): CanonicalSuggestionOutboxEntry {
    const entry = this.rows.find((r) => r.id === id);
    if (!entry) throw new Error(`no such outbox entry: ${id}`);
    return entry;
  }

  async markDone(id: string, algorithmVersion: string): Promise<void> {
    const entry = this.find(id);
    entry.status = "done";
    entry.completedAt = new Date().toISOString();
    entry.algorithmVersion = algorithmVersion;
    entry.lastAttemptedAt = new Date().toISOString();
  }

  async markFailedForRetry(id: string, input: MarkFailedForRetryInput): Promise<void> {
    const entry = this.find(id);
    entry.status = "pending";
    entry.attempts = input.attempts;
    entry.nextAttemptAt = input.nextAttemptAt;
    entry.lastError = input.lastError;
    entry.algorithmVersion = input.algorithmVersion;
    entry.lastAttemptedAt = new Date().toISOString();
    entry.claimedAt = null;
  }

  async markDeadLetter(id: string, input: MarkDeadLetterInput): Promise<void> {
    const entry = this.find(id);
    entry.status = "dead_letter";
    entry.attempts = input.attempts;
    entry.lastError = input.lastError;
    entry.algorithmVersion = input.algorithmVersion;
    entry.lastAttemptedAt = new Date().toISOString();
  }

  async countByStatus(): Promise<Record<CanonicalSuggestionOutboxStatus, number>> {
    const result = {} as Record<CanonicalSuggestionOutboxStatus, number>;
    for (const status of STATUSES) result[status] = this.rows.filter((r) => r.status === status).length;
    return result;
  }

  async oldestPendingNextAttemptAt(): Promise<string | null> {
    const pending = this.rows.filter((r) => r.status === "pending").sort((a, b) => (a.nextAttemptAt < b.nextAttemptAt ? -1 : 1));
    return pending[0]?.nextAttemptAt ?? null;
  }

  async countRetrying(): Promise<number> {
    return this.rows.filter((r) => r.status === "pending" && r.attempts > 0).length;
  }

  async averageAttempts(statuses: CanonicalSuggestionOutboxStatus[]): Promise<number> {
    const rows = this.rows.filter((r) => statuses.includes(r.status));
    if (rows.length === 0) return 0;
    return rows.reduce((sum, r) => sum + r.attempts, 0) / rows.length;
  }

  async recentCompletionSamples(limit: number): Promise<CompletionSample[]> {
    return this.rows
      .filter((r) => r.status === "done" && r.claimedAt && r.completedAt)
      .sort((a, b) => (b.completedAt! < a.completedAt! ? -1 : 1))
      .slice(0, limit)
      .map((r) => ({ claimedAt: r.claimedAt!, completedAt: r.completedAt! }));
  }

  async countCompletedSince(sinceIso: string): Promise<CompletionWindowCounts> {
    const sinceMs = Date.parse(sinceIso);
    const inWindow = (r: CanonicalSuggestionOutboxEntry) => r.lastAttemptedAt !== null && Date.parse(r.lastAttemptedAt) >= sinceMs;
    return {
      done: this.rows.filter((r) => r.status === "done" && inWindow(r)).length,
      deadLetter: this.rows.filter((r) => r.status === "dead_letter" && inWindow(r)).length,
      expired: this.rows.filter((r) => r.status === "expired" && inWindow(r)).length,
    };
  }

  async deleteDoneOlderThan(cutoffIso: string): Promise<number> {
    const cutoffMs = Date.parse(cutoffIso);
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !(r.status === "done" && Date.parse(r.createdAt) < cutoffMs));
    return before - this.rows.length;
  }

  async expireStaleRetries(cutoffIso: string, reason: string): Promise<number> {
    const cutoffMs = Date.parse(cutoffIso);
    let count = 0;
    for (const r of this.rows) {
      if (r.status === "pending" && Date.parse(r.enqueuedAt) < cutoffMs) {
        r.status = "expired";
        r.lastError = reason;
        r.lastAttemptedAt = new Date().toISOString();
        count++;
      }
    }
    return count;
  }
}
