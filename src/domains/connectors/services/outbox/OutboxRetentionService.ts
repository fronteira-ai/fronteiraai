import type { ICanonicalSuggestionOutboxRepository } from "../../repositories/ICanonicalSuggestionOutboxRepository";
import { outboxRetentionDays } from "./config";

export interface RetentionResult {
  deletedCount: number;
  durationMs: number;
  cutoffIso: string;
  retentionDays: number;
}

// Mission Ω-Hardening. Deletes ONLY status='done' rows older than
// OUTBOX_RETENTION_DAYS — enforced by the repository's own WHERE clause
// (deleteDoneOlderThan), not just by this service's intent, so a bug here
// can never accidentally sweep pending/processing/dead_letter/expired.
// `done` rows are the only ones this outbox's AT LEAST ONCE DELIVERY
// contract ever considers disposable — every other status is either still
// active or a permanent, explicit audit record (dead_letter/expired) that
// this Mission does not authorize deleting.
export class OutboxRetentionService {
  constructor(private readonly outboxRepo: ICanonicalSuggestionOutboxRepository) {}

  async cleanup(): Promise<RetentionResult> {
    const startedAt = Date.now();
    const retentionDays = outboxRetentionDays();
    const cutoffIso = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const deletedCount = await this.outboxRepo.deleteDoneOlderThan(cutoffIso);

    return { deletedCount, durationMs: Date.now() - startedAt, cutoffIso, retentionDays };
  }
}
