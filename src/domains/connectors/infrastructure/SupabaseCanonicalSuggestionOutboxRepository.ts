import type { SupabaseClient } from "@supabase/supabase-js";
import type { CanonicalSuggestionOutboxEntry, CanonicalSuggestionOutboxStatus, CanonicalSuggestionPriority } from "../domain/CanonicalSuggestionOutboxEntry";
import { PRIORITY_RANK } from "../domain/CanonicalSuggestionOutboxEntry";
import type {
  CompletionSample,
  CompletionWindowCounts,
  ICanonicalSuggestionOutboxRepository,
  MarkDeadLetterInput,
  MarkFailedForRetryInput,
} from "../repositories/ICanonicalSuggestionOutboxRepository";

const TABLE = "canonical_suggestion_outbox";
const STATUSES: CanonicalSuggestionOutboxStatus[] = ["pending", "processing", "done", "failed", "dead_letter", "expired"];
// Mission Ω-Hardening: how many due candidates are fetched (cheaply, by the
// existing next_attempt_at/claimed_at indexes) before sorting by priority
// in application code and slicing to the caller's requested limit — see
// claimBatch's own doc comment for why this stays in JS rather than a
// native Postgres ORDER BY (consistency with this codebase's text+CHECK
// status-column convention, never a native pg ENUM type).
const CANDIDATE_FETCH_CAP = 500;

function toDomain(row: Record<string, unknown>): CanonicalSuggestionOutboxEntry {
  return {
    id: row.id as string,
    canonicalProductId: row.canonical_product_id as string,
    status: row.status as CanonicalSuggestionOutboxStatus,
    priority: (row.priority as CanonicalSuggestionPriority) ?? "normal",
    attempts: row.attempts as number,
    lastError: (row.last_error as string | null) ?? null,
    lastAttemptedAt: (row.last_attempted_at as string | null) ?? null,
    nextAttemptAt: row.next_attempt_at as string,
    claimedAt: (row.claimed_at as string | null) ?? null,
    algorithmVersion: (row.algorithm_version as string | null) ?? null,
    source: row.source as string,
    enqueuedAt: row.enqueued_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export class SupabaseCanonicalSuggestionOutboxRepository implements ICanonicalSuggestionOutboxRepository {
  constructor(private readonly client: SupabaseClient) {}

  async enqueue(canonicalProductId: string, source: string, priority: CanonicalSuggestionPriority = "normal"): Promise<void> {
    const { data: existing, error: findError } = await this.client
      .from(TABLE)
      .select("id")
      .eq("canonical_product_id", canonicalProductId)
      .in("status", ["pending", "processing"])
      .maybeSingle();

    if (findError) throw new Error(`outbox enqueue lookup: ${findError.message}`);
    if (existing) return; // already active — idempotent no-op

    const { error: insertError } = await this.client.from(TABLE).insert({ canonical_product_id: canonicalProductId, source, priority });
    if (insertError) {
      // Race: another caller enqueued the same canonical_product_id between
      // our lookup and this insert. The partial UNIQUE index rejects the
      // duplicate — treated as the same idempotent no-op, never a failure.
      if (insertError.code === "23505") return;
      throw new Error(`outbox enqueue insert: ${insertError.message}`);
    }
  }

  async claimBatch(limit: number, staleClaimMs: number): Promise<CanonicalSuggestionOutboxEntry[]> {
    const staleBefore = new Date(Date.now() - staleClaimMs).toISOString();
    const now = new Date().toISOString();
    const fetchCap = Math.max(limit, CANDIDATE_FETCH_CAP);

    const { data: pendingDue, error: pendingError } = await this.client
      .from(TABLE)
      .select("id, priority, created_at")
      .eq("status", "pending")
      .lte("next_attempt_at", now)
      .order("next_attempt_at", { ascending: true })
      .limit(fetchCap);
    if (pendingError) throw new Error(`outbox claim (select pending): ${pendingError.message}`);

    const { data: staleProcessing, error: staleError } = await this.client
      .from(TABLE)
      .select("id, priority, created_at")
      .eq("status", "processing")
      .lt("claimed_at", staleBefore)
      .order("claimed_at", { ascending: true })
      .limit(fetchCap);
    if (staleError) throw new Error(`outbox claim (select stale): ${staleError.message}`);

    type Candidate = { id: string; priority: CanonicalSuggestionPriority; created_at: string };
    const candidates = [...((pendingDue ?? []) as Candidate[]), ...((staleProcessing ?? []) as Candidate[])];

    // Mission Ω-Hardening: priority first (high < normal < low, via
    // PRIORITY_RANK, the single source of truth for that order), createdAt
    // second — exactly the ordering the Mission specifies, computed in
    // application code over a bounded candidate set fetched cheaply by the
    // existing indexes.
    candidates.sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rankDiff !== 0) return rankDiff;
      return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    });

    const candidateIds = candidates.slice(0, limit).map((c) => c.id);
    if (candidateIds.length === 0) return [];

    // Conditional UPDATE — only rows STILL in a claimable status at the
    // moment this runs are actually claimed. If another sweep run already
    // claimed one between our SELECT and this UPDATE, its status is no
    // longer 'pending'/'processing'-stale-enough, so this UPDATE simply
    // does not affect that row — no error, no double-claim, no need for
    // FOR UPDATE SKIP LOCKED.
    const { data: claimed, error: claimError } = await this.client
      .from(TABLE)
      .update({ status: "processing", claimed_at: now })
      .in("id", candidateIds)
      .in("status", ["pending", "processing"])
      .select("*");
    if (claimError) throw new Error(`outbox claim (update): ${claimError.message}`);

    return (claimed ?? []).map(toDomain);
  }

  async markDone(id: string, algorithmVersion: string): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .update({ status: "done", completed_at: new Date().toISOString(), algorithm_version: algorithmVersion, last_attempted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`outbox markDone: ${error.message}`);
  }

  async markFailedForRetry(id: string, input: MarkFailedForRetryInput): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .update({
        status: "pending",
        attempts: input.attempts,
        next_attempt_at: input.nextAttemptAt,
        last_error: input.lastError,
        algorithm_version: input.algorithmVersion,
        last_attempted_at: new Date().toISOString(),
        claimed_at: null,
      })
      .eq("id", id);
    if (error) throw new Error(`outbox markFailedForRetry: ${error.message}`);
  }

  async markDeadLetter(id: string, input: MarkDeadLetterInput): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .update({
        status: "dead_letter",
        attempts: input.attempts,
        last_error: input.lastError,
        algorithm_version: input.algorithmVersion,
        last_attempted_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(`outbox markDeadLetter: ${error.message}`);
  }

  async countByStatus(): Promise<Record<CanonicalSuggestionOutboxStatus, number>> {
    const result = {} as Record<CanonicalSuggestionOutboxStatus, number>;
    for (const status of STATUSES) {
      const { count, error } = await this.client.from(TABLE).select("*", { count: "exact", head: true }).eq("status", status);
      if (error) {
        console.error(`[SupabaseCanonicalSuggestionOutboxRepository.countByStatus:${status}]`, error.message);
        result[status] = 0;
        continue;
      }
      result[status] = count ?? 0;
    }
    return result;
  }

  async oldestPendingNextAttemptAt(): Promise<string | null> {
    const { data, error } = await this.client.from(TABLE).select("next_attempt_at").eq("status", "pending").order("next_attempt_at", { ascending: true }).limit(1).maybeSingle();
    if (error) {
      console.error("[SupabaseCanonicalSuggestionOutboxRepository.oldestPendingNextAttemptAt]", error.message);
      return null;
    }
    return data ? (data.next_attempt_at as string) : null;
  }

  async countRetrying(): Promise<number> {
    const { count, error } = await this.client.from(TABLE).select("*", { count: "exact", head: true }).eq("status", "pending").gt("attempts", 0);
    if (error) {
      console.error("[SupabaseCanonicalSuggestionOutboxRepository.countRetrying]", error.message);
      return 0;
    }
    return count ?? 0;
  }

  async averageAttempts(statuses: CanonicalSuggestionOutboxStatus[]): Promise<number> {
    if (statuses.length === 0) return 0;
    const { data, error } = await this.client.from(TABLE).select("attempts").in("status", statuses);
    if (error) {
      console.error("[SupabaseCanonicalSuggestionOutboxRepository.averageAttempts]", error.message);
      return 0;
    }
    const rows = (data ?? []) as { attempts: number }[];
    if (rows.length === 0) return 0;
    return rows.reduce((sum, r) => sum + r.attempts, 0) / rows.length;
  }

  async recentCompletionSamples(limit: number): Promise<CompletionSample[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("claimed_at, completed_at")
      .eq("status", "done")
      .not("claimed_at", "is", null)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[SupabaseCanonicalSuggestionOutboxRepository.recentCompletionSamples]", error.message);
      return [];
    }
    return (data ?? []).map((r) => ({ claimedAt: r.claimed_at as string, completedAt: r.completed_at as string }));
  }

  async countCompletedSince(sinceIso: string): Promise<CompletionWindowCounts> {
    const countFor = async (status: CanonicalSuggestionOutboxStatus): Promise<number> => {
      const { count, error } = await this.client.from(TABLE).select("*", { count: "exact", head: true }).eq("status", status).gte("last_attempted_at", sinceIso);
      if (error) {
        console.error(`[SupabaseCanonicalSuggestionOutboxRepository.countCompletedSince:${status}]`, error.message);
        return 0;
      }
      return count ?? 0;
    };
    const [done, deadLetter, expired] = await Promise.all([countFor("done"), countFor("dead_letter"), countFor("expired")]);
    return { done, deadLetter, expired };
  }

  async deleteDoneOlderThan(cutoffIso: string): Promise<number> {
    const { data, error } = await this.client.from(TABLE).delete().eq("status", "done").lt("created_at", cutoffIso).select("id");
    if (error) throw new Error(`outbox retention delete: ${error.message}`);
    return (data ?? []).length;
  }

  async expireStaleRetries(cutoffIso: string, reason: string): Promise<number> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({ status: "expired", last_error: reason, last_attempted_at: new Date().toISOString() })
      .eq("status", "pending")
      .lt("enqueued_at", cutoffIso)
      .select("id");
    if (error) throw new Error(`outbox expire stale retries: ${error.message}`);
    return (data ?? []).length;
  }
}
