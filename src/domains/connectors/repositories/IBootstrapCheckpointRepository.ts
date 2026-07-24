import type { BootstrapCheckpoint, BootstrapCheckpointStatus } from "../domain/BootstrapCheckpoint";

export interface UpdateProgressInput {
  lastProductId: string | null;
  processedCount: number;
  createdCount: number;
  linkedCount: number;
  enqueuedCount: number;
  failedCount: number;
}

export interface IBootstrapCheckpointRepository {
  findByRunKey(runKey: string): Promise<BootstrapCheckpoint | null>;

  /** Idempotent — returns the existing row for `runKey` if one already
   * exists (resume), otherwise creates a fresh 'running' checkpoint at
   * lastProductId=null (start from the beginning). Never creates a second
   * row for the same runKey (enforced by the UNIQUE constraint on
   * run_key). */
  findOrCreate(runKey: string): Promise<BootstrapCheckpoint>;

  /** Writes ABSOLUTE counts (never deltas) — the service always computes
   * its own running totals in memory and persists the current snapshot,
   * so writing the same snapshot twice (a retried batch) is a no-op in
   * effect, never a double-count. */
  updateProgress(id: string, input: UpdateProgressInput): Promise<void>;

  markStatus(id: string, status: BootstrapCheckpointStatus, lastError?: string): Promise<void>;

  /** Operator-facing safe-cancellation signal — only transitions a
   * currently running/paused checkpoint to 'cancel_requested'; a no-op
   * (returns false) for any other current status. The service itself
   * checks for this status between batches and stops cleanly, never mid-item. */
  requestCancel(runKey: string): Promise<boolean>;
}
