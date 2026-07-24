// Mission Ω-Hardening. Durable checkpoint for HistoricalCanonicalBootstrapService
// — one row per named run, never a single global row, so past runs stay
// auditable side by side (same discipline as merge_executions/knowledge_history:
// history is never overwritten away).
export type BootstrapCheckpointStatus = "running" | "paused" | "cancel_requested" | "cancelled" | "completed" | "failed";

export interface BootstrapCheckpoint {
  id: string;
  runKey: string;
  status: BootstrapCheckpointStatus;
  lastProductId: string | null;
  processedCount: number;
  createdCount: number;
  linkedCount: number;
  enqueuedCount: number;
  failedCount: number;
  lastError: string | null;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
}
