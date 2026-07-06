import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IExchangeProviderRunRepository,
  CreateProviderRunInput,
  ProviderRun,
  ProviderRunStatus,
} from "../repositories/IExchangeProviderRunRepository";

interface RunRow {
  id: string;
  provider_id: string;
  status: string;
  response_time_ms: number | null;
  error_message: string | null;
  attempted_at: string;
}

function toDomain(row: RunRow): ProviderRun {
  return {
    id: row.id,
    providerId: row.provider_id,
    status: row.status as ProviderRunStatus,
    responseTimeMs: row.response_time_ms,
    errorMessage: row.error_message,
    attemptedAt: row.attempted_at,
  };
}

export class SupabaseExchangeProviderRunRepository implements IExchangeProviderRunRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(input: CreateProviderRunInput): Promise<ProviderRun | null> {
    const { data, error } = await this.client
      .from("exchange_provider_runs")
      .insert({
        provider_id: input.providerId,
        status: input.status,
        response_time_ms: input.responseTimeMs,
        error_message: input.errorMessage,
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("[SupabaseExchangeProviderRunRepository.create]", error?.message);
      return null;
    }
    return toDomain(data as RunRow);
  }

  async findByProvider(providerId: string, limit = 20): Promise<ProviderRun[]> {
    const { data } = await this.client
      .from("exchange_provider_runs")
      .select("*")
      .eq("provider_id", providerId)
      .order("attempted_at", { ascending: false })
      .limit(limit);

    return ((data ?? []) as RunRow[]).map(toDomain);
  }
}
