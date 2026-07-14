import { CurrencyPair } from "../enums/CurrencyPair";
import type { IExchangeRateProvider } from "./IExchangeRateProvider";
import type { RawRateQuote } from "../types/Money";
import { fetchJson } from "../infrastructure/ExchangeRateApiHttpClient";

interface OpenExchangeRatesResponse {
  base: string;
  rates: Record<string, number>;
}

// Program ΔR — Mission ΔR-1.1 (Objetivo 7). Second provider, priority 2 —
// ExchangeRateService.refresh() only reaches this one when
// ExchangeRateApiProvider (priority 1) fails, giving the failover mechanism
// (already built, ADR-043) an actual second provider to fall over to for
// the first time. Chosen over AwesomeAPI (no formal SLA, PYG coverage not
// guaranteed), Banco Central/Frankfurter (neither quotes PYG at all — see
// docs/architecture/EXCHANGE_DOMAIN_ARCHITECTURE.md §5), and ExchangeRate.host
// (now requires a paid key with no clear advantage over this one).
//
// Free "Developer" tier locks `base` to USD and does not support a
// `symbols` filter — the full `rates` map is returned and PYG/BRL are read
// out of it, same shape ExchangeRateApiProvider already returns.
export class OpenExchangeRatesProvider implements IExchangeRateProvider {
  readonly id = "open-exchange-rates";
  readonly name = "Open Exchange Rates";
  readonly priority = 2;

  async fetchRates(): Promise<RawRateQuote[]> {
    const appId = process.env.OPEN_EXCHANGE_RATES_APP_ID;
    if (!appId) {
      throw new Error(
        "OPEN_EXCHANGE_RATES_APP_ID não configurada — defina em .env.local (ver .env.example) ou nas variáveis de ambiente do Vercel."
      );
    }

    const url = `https://openexchangerates.org/api/latest.json?app_id=${appId}`;
    const result = await fetchJson<OpenExchangeRatesResponse>(url);

    if (!result.ok || !result.data) {
      throw new Error(`Open Exchange Rates falhou: ${result.error ?? `HTTP ${result.status}`}`);
    }

    const { PYG, BRL } = result.data.rates ?? {};
    if (typeof PYG !== "number" || typeof BRL !== "number") {
      throw new Error("Open Exchange Rates não retornou PYG/BRL na resposta — resposta malformada.");
    }

    return [
      { pair: CurrencyPair.UsdPyg, rate: PYG },
      { pair: CurrencyPair.UsdBrl, rate: BRL },
    ];
  }
}
