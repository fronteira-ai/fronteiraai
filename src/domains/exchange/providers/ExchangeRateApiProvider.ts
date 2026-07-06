import { CurrencyPair } from "../enums/CurrencyPair";
import type { IExchangeRateProvider } from "./IExchangeRateProvider";
import type { RawRateQuote } from "../types/Money";
import { fetchJson } from "../infrastructure/ExchangeRateApiHttpClient";

interface ExchangeRateApiResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
}

// ADR-043 — the one provider decided for this Wave (ExchangeRate-API.com,
// Business plan, 125k req/mo, 5-min cadence). A single call with base=USD
// returns every rate needed; BRL/PYG is triangulated by ExchangeRateService,
// not here (cross-pair math doesn't belong to a single-provider adapter).
//
// The API key is read directly from process.env, not through lib/env.ts's
// eager `required()` object — same precedent as CRON_SECRET
// (lib/cron-auth.ts): a secret needed only for a specific, lazily-invoked
// operation shouldn't crash every unrelated import of the shared env module
// in environments that don't have it configured yet.
export class ExchangeRateApiProvider implements IExchangeRateProvider {
  readonly id = "exchangerate-api";
  readonly name = "ExchangeRate-API.com";
  readonly priority = 1;

  async fetchRates(): Promise<RawRateQuote[]> {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "EXCHANGE_RATE_API_KEY não configurada — defina em .env.local (ver .env.example) ou nas variáveis de ambiente do Vercel."
      );
    }

    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
    const result = await fetchJson<ExchangeRateApiResponse>(url);

    if (!result.ok || !result.data) {
      throw new Error(`ExchangeRate-API.com falhou: ${result.error ?? `HTTP ${result.status}`}`);
    }

    if (result.data.result !== "success") {
      throw new Error(`ExchangeRate-API.com retornou resultado inesperado: ${result.data.result}`);
    }

    const { PYG, BRL } = result.data.conversion_rates ?? {};
    if (typeof PYG !== "number" || typeof BRL !== "number") {
      throw new Error("ExchangeRate-API.com não retornou PYG/BRL na resposta — resposta malformada.");
    }

    return [
      { pair: CurrencyPair.UsdPyg, rate: PYG },
      { pair: CurrencyPair.UsdBrl, rate: BRL },
    ];
  }
}
