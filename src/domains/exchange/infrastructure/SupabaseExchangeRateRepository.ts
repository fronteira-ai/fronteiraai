import type { SupabaseClient } from "@supabase/supabase-js";
import type { IExchangeRateRepository, CreateExchangeRateInput } from "../repositories/IExchangeRateRepository";
import type { ExchangeRate } from "../types/Money";
import type { CurrencyPair } from "../enums/CurrencyPair";

interface RateRow {
  pair: string;
  rate: number;
  source: string;
  captured_at: string;
}

function toDomain(row: RateRow): ExchangeRate {
  return { pair: row.pair as CurrencyPair, rate: row.rate, source: row.source, capturedAt: row.captured_at };
}

export class SupabaseExchangeRateRepository implements IExchangeRateRepository {
  constructor(private readonly client: SupabaseClient) {}

  async insert(input: CreateExchangeRateInput): Promise<ExchangeRate | null> {
    const { data, error } = await this.client
      .from("exchange_rates")
      .insert({ pair: input.pair, rate: input.rate, source: input.source })
      .select("pair, rate, source, captured_at")
      .single();

    if (error || !data) {
      console.error("[SupabaseExchangeRateRepository.insert]", error?.message);
      return null;
    }
    return toDomain(data as RateRow);
  }

  async getLatest(pair: CurrencyPair): Promise<ExchangeRate | null> {
    const { data } = await this.client
      .from("exchange_rates")
      .select("pair, rate, source, captured_at")
      .eq("pair", pair)
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? toDomain(data as RateRow) : null;
  }

  async getRateAt(pair: CurrencyPair, at: Date): Promise<ExchangeRate | null> {
    const { data } = await this.client
      .from("exchange_rates")
      .select("pair, rate, source, captured_at")
      .eq("pair", pair)
      .lte("captured_at", at.toISOString())
      .order("captured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data ? toDomain(data as RateRow) : null;
  }

  async getRange(pair: CurrencyPair, from: Date, to: Date): Promise<ExchangeRate[]> {
    const { data } = await this.client
      .from("exchange_rates")
      .select("pair, rate, source, captured_at")
      .eq("pair", pair)
      .gte("captured_at", from.toISOString())
      .lte("captured_at", to.toISOString())
      .order("captured_at", { ascending: true });

    return ((data ?? []) as RateRow[]).map(toDomain);
  }
}
