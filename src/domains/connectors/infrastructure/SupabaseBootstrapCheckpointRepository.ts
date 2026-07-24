import type { SupabaseClient } from "@supabase/supabase-js";
import type { BootstrapCheckpoint, BootstrapCheckpointStatus } from "../domain/BootstrapCheckpoint";
import type { IBootstrapCheckpointRepository, UpdateProgressInput } from "../repositories/IBootstrapCheckpointRepository";

const TABLE = "canonical_bootstrap_checkpoint";

function toDomain(row: Record<string, unknown>): BootstrapCheckpoint {
  return {
    id: row.id as string,
    runKey: row.run_key as string,
    status: row.status as BootstrapCheckpointStatus,
    lastProductId: (row.last_product_id as string | null) ?? null,
    processedCount: row.processed_count as number,
    createdCount: row.created_count as number,
    linkedCount: row.linked_count as number,
    enqueuedCount: row.enqueued_count as number,
    failedCount: row.failed_count as number,
    lastError: (row.last_error as string | null) ?? null,
    startedAt: row.started_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export class SupabaseBootstrapCheckpointRepository implements IBootstrapCheckpointRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByRunKey(runKey: string): Promise<BootstrapCheckpoint | null> {
    const { data, error } = await this.client.from(TABLE).select("*").eq("run_key", runKey).maybeSingle();
    if (error) {
      console.error("[SupabaseBootstrapCheckpointRepository.findByRunKey]", error.message);
      return null;
    }
    return data ? toDomain(data) : null;
  }

  async findOrCreate(runKey: string): Promise<BootstrapCheckpoint> {
    const existing = await this.findByRunKey(runKey);
    if (existing) return existing;

    const { data, error } = await this.client.from(TABLE).insert({ run_key: runKey }).select("*").single();
    if (error) {
      // Race: another caller created the same runKey between our lookup
      // and this insert. Read-back instead of failing — same idempotent
      // discipline as CanonicalProductService.bootstrapFromProduct.
      if (error.code === "23505") {
        const raced = await this.findByRunKey(runKey);
        if (raced) return raced;
      }
      throw new Error(`bootstrap checkpoint findOrCreate: ${error.message}`);
    }
    return toDomain(data);
  }

  async updateProgress(id: string, input: UpdateProgressInput): Promise<void> {
    const { error } = await this.client
      .from(TABLE)
      .update({
        last_product_id: input.lastProductId,
        processed_count: input.processedCount,
        created_count: input.createdCount,
        linked_count: input.linkedCount,
        enqueued_count: input.enqueuedCount,
        failed_count: input.failedCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(`bootstrap checkpoint updateProgress: ${error.message}`);
  }

  async markStatus(id: string, status: BootstrapCheckpointStatus, lastError?: string): Promise<void> {
    const isTerminal = status === "completed" || status === "cancelled" || status === "failed";
    const { error } = await this.client
      .from(TABLE)
      .update({
        status,
        last_error: lastError ?? null,
        updated_at: new Date().toISOString(),
        ...(isTerminal ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", id);
    if (error) throw new Error(`bootstrap checkpoint markStatus: ${error.message}`);
  }

  async requestCancel(runKey: string): Promise<boolean> {
    const { data, error } = await this.client
      .from(TABLE)
      .update({ status: "cancel_requested", updated_at: new Date().toISOString() })
      .eq("run_key", runKey)
      .in("status", ["running", "paused"])
      .select("id");
    if (error) throw new Error(`bootstrap checkpoint requestCancel: ${error.message}`);
    return (data ?? []).length > 0;
  }
}
