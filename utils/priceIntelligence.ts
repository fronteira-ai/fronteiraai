// Price Intelligence — modelo determinístico e explicável (PRICE INTELLIGENCE UI).
//
// Responde "este preço está bom ou é melhor esperar?" SEM LLM, SEM promessa
// financeira, resistente a outliers e sempre testável. A entrada é a série
// histórica de preços de um PRODUTO (melhor preço disponível por amostra);
// a saída é um conjunto de indicadores + uma classificação de compra simples.
//
// Semântica (explícita — não inventa histórico):
//  - Se a série não tem observações suficientes (MINIST observations) OU
//    span mínimo, os indicadores de histórico NÃO são computados e o chamador
//    mostra um estado honesto discreto ("dados insuficientes").
//  - `currentPriceUSD` é SEMPRE o último valor (preço atual), separado do
//    histórico.
//  - Regras deterministas e documentadas; nada de "compre agora!".

export interface PricePoint {
  recordedAt: string;
  priceUSD: number;
}

export interface PriceIntelligenceResult {
  status: "insufficient" | "ok";
  /** Último preço (atual) da série. */
  currentPriceUSD: number | null;
  /** Observações mínimas exigidas para qualquer indicador de histórico. */
  reason: string | null;
  /** Presentes apenas quando status === "ok". */
  minPriceUSD?: number;
  maxPriceUSD?: number;
  averagePriceUSD?: number;
  /** Variação % do último vs. o mais antigo na janela. */
  delta?: number | null;
  /** Delta em janela de 7 dias (null se não houver). */
  delta7dPercent?: number | null;
  /** Delta em janela de 30 dias (null se não houver). */
  delta30dPercent?: number | null;
  /** Tendência determinística: "down" | "flat" | "up". */
  trend?: "down" | "flat" | "up";
  /** Posição do preço atual no intervalo histórico [0..1] (0=menor, 1=maior). */
  positionInRange?: number;
  /** Classificação de compra. */
  classification?: "best" | "good" | "normal" | "high";
  /** Mensagem explicável (pt-BR). */
  message?: string;
}

export const MIN_OBSERVATIONS = 3;
/** Span mínimo (ms) da série para considerar há "histórico suficiente". */
export const MIN_SPAN_MS = 3 * 24 * 60 * 60 * 1000;
/** Faixa em torno da média (fração) que define "PREÇO NORMAL". */
const NORMAL_BAND = 0.03;
/** Quão perto do menor histórico conta como "próximo do piso". */
const FLOOR_TOLERANCE = 0.02;

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

/** Série temporal válida: ordenada por tempo e sem duplicar timestamp consecutivo.
 * Retorna pontos com preços > 0. */
export function normalizeSeries(points: PricePoint[]): PricePoint[] {
  const valid = points
    .filter((p) => typeof p.priceUSD === "number" && p.priceUSD >= 0 && typeof p.recordedAt === "string")
    .slice()
    .sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : a.recordedAt > b.recordedAt ? 1 : 0));
  // dedupe pelo menor preço por timestamp (melhor preço disponível naquele instante)
  const byTime = new Map<string, number>();
  for (const p of valid) {
    const cur = byTime.get(p.recordedAt);
    if (cur === undefined || p.priceUSD < cur) byTime.set(p.recordedAt, p.priceUSD);
  }
  return [...byTime.entries()].map(([recordedAt, priceUSD]) => ({ recordedAt, priceUSD })).sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
}

function firstAfter(points: PricePoint[], cutoffMs: number): PricePoint | null {
  const cutoff = new Date(cutoffMs).toISOString();
  return points.find((p) => p.recordedAt >= cutoff) ?? null;
}

function lastBefore(points: PricePoint[], cutoffMs: number): PricePoint | null {
  const cutoff = new Date(cutoffMs).toISOString();
  const before = points.filter((p) => p.recordedAt <= cutoff);
  return before.length ? before[before.length - 1] : null;
}

/** Etiqueta de classificação (determinística, explicável). */
export function classifyPrice(current: number, minP: number, maxP: number, avg: number): PriceIntelligenceResult["classification"] {
  const range = maxP - minP;
  const position = range > 0 ? (current - minP) / range : 0.5;
  if (current <= minP * (1 + FLOOR_TOLERANCE) || (range > 0 && position <= 0.05)) return "best";
  if (current <= avg * (1 - NORMAL_BAND)) return "good";
  if (current >= avg * (1 + NORMAL_BAND) && position >= 0.65) return "high";
  return "normal";
}

/**
 * Calcula inteligência de preço determinística de uma série de pontos.
 * Retorna status "insufficient" quando não há histórico suficiente.
 */
export function computePriceIntelligence(points: PricePoint[]): PriceIntelligenceResult {
  const series = normalizeSeries(points);
  const current = series.length ? series[series.length - 1].priceUSD : null;
  if (series.length < MIN_OBSERVATIONS || current === null) {
    return { status: "insufficient", currentPriceUSD: current, reason: "insufficient_observations" };
  }
  const span = new Date(series[series.length - 1].recordedAt).getTime() - new Date(series[0].recordedAt).getTime();
  if (span < MIN_SPAN_MS) {
    return { status: "insufficient", currentPriceUSD: current, reason: "insufficient_span" };
  }

  const prices = series.map((p) => p.priceUSD);
  const minPriceUSD = Math.min(...prices);
  const maxPriceUSD = Math.max(...prices);
  const averagePriceUSD = median(prices); // mediana resiste a outliers

  const oldest = series[0].priceUSD;
  const delta = oldest > 0 ? ((current - oldest) / oldest) * 100 : null;

  const nowMs = Date.now();
  const p7 = firstAfter(series, nowMs - 7 * 24 * 60 * 60 * 1000);
  const p30 = firstAfter(series, nowMs - 30 * 24 * 60 * 60 * 1000);
  const window7 = lastBefore(series, nowMs - 7 * 24 * 60 * 60 * 1000);
  const window30 = lastBefore(series, nowMs - 30 * 24 * 60 * 60 * 1000);
  const delta7dPercent = p7 && window7 && window7.priceUSD > 0 ? ((p7.priceUSD - window7.priceUSD) / window7.priceUSD) * 100 : null;
  const delta30dPercent = p30 && window30 && window30.priceUSD > 0 ? ((p30.priceUSD - window30.priceUSD) / window30.priceUSD) * 100 : null;

  // Tendência: compara a segunda metade da série com a primeira.
  const half = Math.floor(series.length / 2);
  const firstHalfAvg = median(series.slice(0, half ? half : 1).map((p) => p.priceUSD));
  const secondHalfAvg = median(series.slice(half).map((p) => p.priceUSD));
  const trendChange = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
  const trend: "down" | "flat" | "up" =
    trendChange < -0.5 ? "down" : trendChange > 0.5 ? "up" : "flat";

  const range = maxPriceUSD - minPriceUSD;
  const positionInRange = range > 0 ? (current - minPriceUSD) / range : 0.5;

  const classification = classifyPrice(current, minPriceUSD, maxPriceUSD, averagePriceUSD);
  const pctVsAvg = averagePriceUSD > 0 ? ((current - averagePriceUSD) / averagePriceUSD) * 100 : 0;
  const message = `Este preço está ${Math.abs(pctVsAvg).toFixed(0)}% ${pctVsAvg <= 0 ? "abaixo" : "acima"} da média do período.`;

  return {
    status: "ok",
    currentPriceUSD: current,
    reason: null,
    minPriceUSD,
    maxPriceUSD,
    averagePriceUSD,
    delta,
    delta7dPercent,
    delta30dPercent,
    trend,
    positionInRange,
    classification,
    message,
  };
}
