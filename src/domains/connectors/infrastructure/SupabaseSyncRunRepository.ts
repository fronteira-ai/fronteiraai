import type { SupabaseClient } from "@supabase/supabase-js";
import type { ISyncRunRepository, CreateSyncRunInput, UpdateSyncRunInput } from "../repositories/ISyncRunRepository";
import type { SyncRun } from "../domain/SyncRun";

function toSyncRun(row: Record<string, unknown>): SyncRun {
  return {
    id: row.id as string,
    connectorId: row.connector_id as string,
    connectorKey: row.connector_key as string,
    merchantId: (row.merchant_id as string | null) ?? null,
    batchId: row.batch_id as string,
    dryRun: row.dry_run as boolean,
    status: row.status as SyncRun["status"],
    totals: (row.totals as Record<string, unknown>) ?? {},
    errors: (row.errors as unknown[] | null) ?? null,
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string | null) ?? null,
  };
}

export class SupabaseSyncRunRepository implements ISyncRunRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateSyncRunInput): Promise<SyncRun | null> {
    const { data, error } = await this.client
      .from("connector_sync_runs")
      .insert({
        connector_id: input.connectorId,
        connector_key: input.connectorKey,
        merchant_id: input.merchantId ?? null,
        batch_id: input.batchId,
        dry_run: input.dryRun,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[SupabaseSyncRunRepository.create]", error.message);
      return null;
    }
    return toSyncRun(data as Record<string, unknown>);
  }

  async update(id: string, input: UpdateSyncRunInput): Promise<SyncRun | null> {
    const payload: Record<string, unknown> = { status: input.status };
    if (input.totals !== undefined) payload.totals = input.totals;
    if (input.errors !== undefined) payload.errors = input.errors;
    if (input.completedAt !== undefined) payload.completed_at = input.completedAt;

    const { data, error } = await this.client
      .from("connector_sync_runs")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[SupabaseSyncRunRepository.update]", error.message);
      return null;
    }
    return toSyncRun(data as Record<string, unknown>);
  }

  async findByConnector(connectorId: string, limit = 20): Promise<SyncRun[]> {
    const { data, error } = await this.client
      .from("connector_sync_runs")
      .select("*")
      .eq("connector_id", connectorId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[SupabaseSyncRunRepository.findByConnector]", error.message);
      return [];
    }
    return (data ?? []).map((row) => toSyncRun(row as Record<string, unknown>));
  }

  async findByMerchant(merchantId: string, limit = 20): Promise<SyncRun[]> {
    const { data, error } = await this.client
      .from("connector_sync_runs")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("started_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[SupabaseSyncRunRepository.findByMerchant]", error.message);
      return [];
    }
    return (data ?? []).map((row) => toSyncRun(row as Record<string, unknown>));
  }
}
