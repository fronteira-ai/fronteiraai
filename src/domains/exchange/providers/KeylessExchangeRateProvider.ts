import { CurrencyPair } from "../enums/CurrencyPair";
import type { IExchangeRateProvider } from "./IExchangeRateProvider";
import type { RawRateQuote } from "../types/Money";
import { fetchJson } from "../infrastructure/ExchangeRateApiHttpClient";

// ─────────────────────────────────────────────────────────────────────────────
// Mission 05.19 — provider SEM CHAVE, com validação cruzada de duas fontes
//
// Problema: os dois providers existentes exigem credencial
// (`EXCHANGE_RATE_API_KEY`, `OPEN_EXCHANGE_RATES_APP_ID`) e nenhuma existe hoje
// em nenhum ambiente (Mission 05.17/05.18). Resultado medido: `exchange_rates`
// com 0 linhas.
//
// Fontes escolhidas (verificadas da máquina de desenvolvimento em 14/10/2026,
// NÃO da produção — nenhuma chamada externa foi feita a partir do VPS):
//
//  1. https://open.er-api.com/v6/latest/USD
//     → HTTP 200 em 208 ms, `rates.PYG = 5710.95`, `rates.BRL = 5.015062`,
//       com `time_last_update_utc`/`time_next_update_utc` (metadados de frescor).
//     → **Sem chave.** Cobre PYG (o que a Frankfurter/ECB NÃO cobre: ela devolve
//       `rates` com BRL e **PYG ausente** — verificada e descartada só por isso).
//  2. https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json
//     → HTTP 200 em 103 ms, taxas em `usd.brl`/`usd.pyg` (a raiz é `usd`, não
//       `rates`). Espelho Cloudflare: https://latest.currency-api.pages.dev/v1/currencies/usd.json
//
// Por que PRIORIDADE 3 (a última): com nenhuma chave configurada, os providers
// 1 e 2 falham e o failover de `ExchangeRateService.refresh()` cai neste — ou
// seja, o sistema passa a ter câmbio **sem nenhuma configuração nova**. Se um dia
// uma chave for definida, o provider pago volta a ter precedência, sem tocar em
// código.
//
// Garantias de confiabilidade (é aqui que "não publicar conversão sem dado
// confiável" vira código, não promessa):
//  • sanidade por faixa: uma taxa fora de [USD_PYG_MIN, USD_PYG_MAX] /
//    [USD_BRL_MIN, USD_BRL_MAX] é tratada como **resposta ruim**, não como taxa;
//  • validação cruzada: se as duas fontes respondem e **divergem mais de**
//    MAX_CROSS_DIVERGENCE, NADA é retornado — o provider lança erro, o serviço o
//    marca indisponível e a conversão continua oculta em vez de mentir;
//  • se só uma fonte responde (a outra caiu), a taxa única ainda precisa passar
//    pela faixa de sanidade para ser aceita.
// ─────────────────────────────────────────────────────────────────────────────

/** Faixas de sanidade (14/10/2026: USD→PYG ≈ 5711, USD→BRL ≈ 5,02). Largas de
 *  propósito: o objetivo é rejeitar resposta corrompida/HTML de portal cativo,
 *  não congelar a política cambial. */
export const USD_PYG_MIN = 4000;
export const USD_PYG_MAX = 12000;
export const USD_BRL_MIN = 3;
export const USD_BRL_MAX = 12;

/** Divergência relativa máxima tolerada entre as duas fontes (2%). */
export const MAX_CROSS_DIVERGENCE = 0.02;

export const OPEN_ER_API_URL = "https://open.er-api.com/v6/latest/USD";
export const CURRENCY_API_URL =
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
export const CURRENCY_API_MIRROR_URL =
  "https://latest.currency-api.pages.dev/v1/currencies/usd.json";

interface OpenErApiResponse {
  result?: string;
  base_code?: string;
  rates?: Record<string, number>;
  time_last_update_utc?: string;
}

interface CurrencyApiResponse {
  date?: string;
  usd?: Record<string, number>;
}

export interface RateQuadruple {
  usdPyg: number;
  usdBrl: number;
  /** rótulo da fonte, para log/diagnóstico (nunca é gravado no banco). */
  source: string;
}

/** Uma taxa é aceitável se for número finito e estiver dentro da faixa. */
export function isWithinSanityBounds(usdPyg: number, usdBrl: number): boolean {
  const ok = (v: number, min: number, max: number) =>
    Number.isFinite(v) && v >= min && v <= max;
  return ok(usdPyg, USD_PYG_MIN, USD_PYG_MAX) && ok(usdBrl, USD_BRL_MIN, USD_BRL_MAX);
}

/** Divergência relativa simétrica entre duas taxas. */
export function relativeDivergence(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return Infinity;
  return Math.abs(a - b) / Math.max(a, b);
}

export class KeylessExchangeRateProvider implements IExchangeRateProvider {
  readonly id = "keyless-open-er-api";
  readonly name = "open.er-api.com + currency-api (sem chave)";
  readonly priority = 3;

  async fetchRates(): Promise<RawRateQuote[]> {
    const [primary, secondary] = await Promise.all([
      this.trySource("open.er-api.com", () => this.fromOpenErApi()),
      this.trySource("currency-api", async () => {
        try {
          return await this.fromCurrencyApi(CURRENCY_API_URL);
        } catch {
          return this.fromCurrencyApi(CURRENCY_API_MIRROR_URL);
        }
      }),
    ]);

    if (!primary && !secondary) {
      throw new Error(
        "Nenhuma fonte sem chave retornou taxas válidas (open.er-api.com e currency-api indisponíveis ou fora da faixa de sanidade) — nenhuma taxa será publicada."
      );
    }

    // Uma única fonte disponível: aceita, desde que saneada.
    const chosen = primary ?? secondary!;
    if (primary && secondary) {
      const dPyg = relativeDivergence(primary.usdPyg, secondary.usdPyg);
      const dBrl = relativeDivergence(primary.usdBrl, secondary.usdBrl);
      if (dPyg > MAX_CROSS_DIVERGENCE || dBrl > MAX_CROSS_DIVERGENCE) {
        throw new Error(
          `Fontes sem chave divergem acima do tolerado (PYG: ${(dPyg * 100).toFixed(2)}%, BRL: ${(dBrl * 100).toFixed(2)}%; limite ${MAX_CROSS_DIVERGENCE * 100}%) — nenhuma taxa será publicada.`
        );
      }
    }

    return [
      { pair: CurrencyPair.UsdPyg, rate: chosen.usdPyg },
      { pair: CurrencyPair.UsdBrl, rate: chosen.usdBrl },
    ];
  }

  /** Executa uma fonte e devolve `null` (sem lançar) quando ela não serve. */
  private async trySource(
    label: string,
    fn: () => Promise<RateQuadruple>
  ): Promise<RateQuadruple | null> {
    try {
      const q = await fn();
      if (!isWithinSanityBounds(q.usdPyg, q.usdBrl)) {
        console.error(
          `[exchange] ${label} fora da faixa de sanidade (PYG=${q.usdPyg}, BRL=${q.usdBrl}) — descartado`
        );
        return null;
      }
      return q;
    } catch (error) {
      console.error(
        `[exchange] ${label} indisponível:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  private async fromOpenErApi(): Promise<RateQuadruple> {
    const result = await fetchJson<OpenErApiResponse>(OPEN_ER_API_URL);
    if (!result.ok || !result.data) {
      throw new Error(`open.er-api.com falhou: ${result.error ?? `HTTP ${result.status}`}`);
    }
    if (result.data.result && result.data.result !== "success") {
      throw new Error(`open.er-api.com retornou resultado inesperado: ${result.data.result}`);
    }
    const { PYG, BRL } = result.data.rates ?? {};
    if (typeof PYG !== "number" || typeof BRL !== "number") {
      throw new Error("open.er-api.com não retornou PYG/BRL — resposta malformada.");
    }
    return { usdPyg: PYG, usdBrl: BRL, source: "open.er-api.com" };
  }

  private async fromCurrencyApi(url: string): Promise<RateQuadruple> {
    const result = await fetchJson<CurrencyApiResponse>(url);
    if (!result.ok || !result.data) {
      throw new Error(`currency-api falhou: ${result.error ?? `HTTP ${result.status}`}`);
    }
    const { pyg, brl } = result.data.usd ?? {};
    if (typeof pyg !== "number" || typeof brl !== "number") {
      throw new Error("currency-api não retornou pyg/brl — resposta malformada.");
    }
    return { usdPyg: pyg, usdBrl: brl, source: "currency-api" };
  }
}
