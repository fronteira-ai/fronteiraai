import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  IExchangeConversionLogRepository,
  CreateConversionLogInput,
} from "../repositories/IExchangeConversionLogRepository";

export class SupabaseExchangeConversionLogRepository implements IExchangeConversionLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async log(input: CreateConversionLogInput): Promise<void> {
    const { error } = await this.client.from("exchange_conversion_log").insert({
      from_currency: input.fromCurrency,
      to_currency: input.toCurrency,
      amount: input.amount,
    });

    if (error) {
      console.error("[SupabaseExchangeConversionLogRepository.log]", error.message);
    }
  }

  async countInRange(from: Date, to: Date): Promise<number> {
    const { count } = await this.client
      .from("exchange_conversion_log")
      .select("id", { count: "exact", head: true })
      .gte("converted_at", from.toISOString())
      .lte("converted_at", to.toISOString());

    return count ?? 0;
  }
}
