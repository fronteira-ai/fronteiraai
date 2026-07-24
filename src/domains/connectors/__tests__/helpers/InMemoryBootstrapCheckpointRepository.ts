import type { BootstrapCheckpoint, BootstrapCheckpointStatus } from "../../domain/BootstrapCheckpoint";
import type { IBootstrapCheckpointRepository, UpdateProgressInput } from "../../repositories/IBootstrapCheckpointRepository";

export class InMemoryBootstrapCheckpointRepository implements IBootstrapCheckpointRepository {
  rows: BootstrapCheckpoint[] = [];
  private nextId = 1;

  async findByRunKey(runKey: string): Promise<BootstrapCheckpoint | null> {
    return this.rows.find((r) => r.runKey === runKey) ?? null;
  }

  async findOrCreate(runKey: string): Promise<BootstrapCheckpoint> {
    const existing = await this.findByRunKey(runKey);
    if (existing) return existing;

    const now = new Date().toISOString();
    const checkpoint: BootstrapCheckpoint = {
      id: `checkpoint-${this.nextId++}`,
      runKey,
      status: "running",
      lastProductId: null,
      processedCount: 0,
      createdCount: 0,
      linkedCount: 0,
      enqueuedCount: 0,
      failedCount: 0,
      lastError: null,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
    };
    this.rows.push(checkpoint);
    return checkpoint;
  }

  async updateProgress(id: string, input: UpdateProgressInput): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`no such checkpoint: ${id}`);
    row.lastProductId = input.lastProductId;
    row.processedCount = input.processedCount;
    row.createdCount = input.createdCount;
    row.linkedCount = input.linkedCount;
    row.enqueuedCount = input.enqueuedCount;
    row.failedCount = input.failedCount;
    row.updatedAt = new Date().toISOString();
  }

  async markStatus(id: string, status: BootstrapCheckpointStatus, lastError?: string): Promise<void> {
    const row = this.rows.find((r) => r.id === id);
    if (!row) throw new Error(`no such checkpoint: ${id}`);
    row.status = status;
    row.lastError = lastError ?? null;
    row.updatedAt = new Date().toISOString();
    if (status === "completed" || status === "cancelled" || status === "failed") row.completedAt = new Date().toISOString();
  }

  async requestCancel(runKey: string): Promise<boolean> {
    const row = this.rows.find((r) => r.runKey === runKey);
    if (!row || (row.status !== "running" && row.status !== "paused")) return false;
    row.status = "cancel_requested";
    row.updatedAt = new Date().toISOString();
    return true;
  }
}
