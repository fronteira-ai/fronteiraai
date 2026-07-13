import { CurrencyPair } from "@/src/domains/exchange";
import type { ExchangeHistoryService, ExchangeRate } from "@/src/domains/exchange";
import type { VolatilityRollupService } from "@/src/domains/market-insights";
import { VolatilityClass, FreshnessClass } from "@/src/domains/realtime-commerce";
import type {
  ComparisonIntelligenceBundle,
  PurchaseTimingResult,
  PurchaseTimingReason,
  PurchaseTimingVerdict,
  ExchangeTrendContext,
} from "../types/buyer-intelligence.types";

// Release 2.0 — Wave 3 (Experience Iteration 3 — Should I Buy Now). Same
// discipline as BestDealComposer (Wave 2): takes an already-built
// ComparisonIntelligenceBundle and adds exactly two new I/O calls
// (VolatilityRollupService.getCanonicalVolatility, ExchangeHistoryService.
// getRange) — both to services that already existed. No price math is
// reinvented anywhere in this file; every reason traces to a field another
// service already computed. See docs/product/PURCHASE_TIMING_DECISION.md
// for the full signal inventory and every documented threshold.

// The same 10% band CATEGORY_INVENTORY/SearchIntelligenceComposer (Wave 1)
// and IntelligenceBadges (Wave 1) already used for "belowAveragePrice" —
// reused symmetrically here (0.9x below / 1.1x above), not a new number.
const MEDIAN_BAND_RATIO = 0.1;
// The window CanonicalVolatilityProfile/VolatilityRollupService already
// defaults to (DEFAULT_WINDOW_DAYS in that file) — reused here for the
// exchange-rate lookback too, so "recent" means the same thing across both
// signals instead of two different arbitrary periods.
const LOOKBACK_DAYS = 30;
// A rate move smaller than this is "stable", not favorable/unfavorable —
// mirrors CanonicalPriceHistoryService's own TREND_TOLERANCE_PERCENT (2%)
// for the same reason: avoid noisy flips from tiny daily jitter.
const EXCHANGE_TREND_TOLERANCE_PERCENT = 2;

function buildExchangeTrend(rates: ExchangeRate[]): ExchangeTrendContext | null {
  if (rates.length < 2) return null;
  const sorted = [...rates].sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime());
  const fromRate = sorted[0];
  const toRate = sorted[sorted.length - 1];
  if (fromRate.rate === 0) return null;

  const changePercent = ((toRate.rate - fromRate.rate) / fromRate.rate) * 100;
  // USD/BRL falling means fewer Reais needed per dollar — favorable for a
  // buyer paying in BRL for a USD-priced offer.
  const direction: ExchangeTrendContext["direction"] =
    Math.abs(changePercent) <= EXCHANGE_TREND_TOLERANCE_PERCENT ? "stable" : changePercent < 0 ? "favorable" : "unfavorable";

  return { direction, fromRate, toRate, changePercent };
}

interface VoteResult {
  reasons: PurchaseTimingReason[];
  buyNowVotes: number;
  waitVotes: number;
}

function evaluateSignals(bundle: ComparisonIntelligenceBundle, exchangeTrend: ExchangeTrendContext | null): VoteResult {
  const reasons: PurchaseTimingReason[] = [];
  let buyNowVotes = 0;
  let waitVotes = 0;

  const { trend, variationPercent, lastPriceUSD } = bundle.priceAggregation;

  if (trend === "down") {
    reasons.push({
      factor: "price-trend",
      label: "Preço em queda",
      evidence: `Variação recente de ${variationPercent?.toFixed(1) ?? "?"}% no histórico deste produto`,
    });
    buyNowVotes++;
  } else if (trend === "up") {
    reasons.push({
      factor: "price-trend",
      label: "Preço em alta",
      evidence: `Variação recente de +${variationPercent?.toFixed(1) ?? "?"}% no histórico deste produto`,
    });
    waitVotes++;
  } else if (trend === "stable") {
    reasons.push({
      factor: "price-trend",
      label: "Preço estável",
      evidence: `Variação recente de apenas ${variationPercent?.toFixed(1) ?? "0"}% — dentro da margem de estabilidade`,
    });
  }

  const median = bundle.priceStatistics?.medianPriceUSD;
  if (median && median > 0 && lastPriceUSD !== null) {
    if (lastPriceUSD < median * (1 - MEDIAN_BAND_RATIO)) {
      reasons.push({
        factor: "price-vs-median",
        label: "Preço abaixo da média",
        evidence: `USD ${lastPriceUSD.toFixed(2)} vs. mediana de USD ${median.toFixed(2)} entre ${bundle.priceStatistics!.storeCount} loja(s)`,
      });
      buyNowVotes++;
    } else if (lastPriceUSD > median * (1 + MEDIAN_BAND_RATIO)) {
      reasons.push({
        factor: "price-vs-median",
        label: "Preço acima da média",
        evidence: `USD ${lastPriceUSD.toFixed(2)} vs. mediana de USD ${median.toFixed(2)} entre ${bundle.priceStatistics!.storeCount} loja(s)`,
      });
      waitVotes++;
    }
  }

  if (exchangeTrend?.direction === "favorable") {
    reasons.push({
      factor: "exchange-trend",
      label: "Câmbio favorável",
      evidence: `USD/BRL caiu ${Math.abs(exchangeTrend.changePercent).toFixed(1)}% nos últimos ${LOOKBACK_DAYS} dias`,
    });
    buyNowVotes++;
  }

  return { reasons, buyNowVotes, waitVotes };
}

function addConfidenceReasons(
  reasons: PurchaseTimingReason[],
  bundle: ComparisonIntelligenceBundle,
  volatility: PurchaseTimingResult["volatility"]
): void {
  const recommendedOffer = bundle.offers.find((o) => o.rank === 1);
  const freshness = recommendedOffer?.freshness ?? null;

  if (freshness?.classification === FreshnessClass.Live || freshness?.classification === FreshnessClass.Fresh) {
    reasons.push({ factor: "freshness", label: "Atualização recente", evidence: "Preço confirmado recentemente pela loja recomendada" });
  } else if (freshness?.classification === FreshnessClass.Old || freshness?.classification === FreshnessClass.Stale) {
    reasons.push({
      factor: "freshness",
      label: "Baixa confiança temporal",
      evidence: `Dado da loja recomendada não é confirmado há um tempo (classificação: ${freshness.classification})`,
    });
  }

  if (volatility && volatility.classification === VolatilityClass.MuitoVolatil) {
    reasons.push({
      factor: "volatility",
      label: "Baixa confiança temporal",
      evidence: `Histórico de preço muito volátil recentemente (pontuação ${volatility.score}/100) — a tendência atual pode não durar`,
    });
  }
}

export class PurchaseTimingComposer {
  constructor(
    private readonly volatilityRollupService: VolatilityRollupService,
    private readonly exchangeHistoryService: ExchangeHistoryService
  ) {}

  async compose(bundle: ComparisonIntelligenceBundle): Promise<PurchaseTimingResult> {
    const errors: PurchaseTimingResult["errors"] = { ...bundle.errors };

    // Objetivo 6 — the one deliberate "não há dados suficientes" gate: no
    // price history at all. CanonicalPriceHistoryService itself already
    // returns trend="unknown" only when there are zero historical/live
    // price points to compare (computePriceAggregation) — this composer
    // does not invent a second insufficiency rule on top of that.
    if (bundle.priceAggregation.trend === "unknown") {
      return {
        canonicalProductId: bundle.canonicalProduct.id,
        verdict: "insufficient_data",
        reasons: [
          {
            factor: "history-depth",
            label: "Não há dados suficientes",
            evidence: "Nenhum histórico de preço registrado ainda para este produto",
          },
        ],
        priceAggregation: bundle.priceAggregation,
        priceStatistics: bundle.priceStatistics,
        volatility: null,
        exchangeTrend: null,
        errors,
      };
    }

    let volatility: PurchaseTimingResult["volatility"] = null;
    try {
      volatility = await this.volatilityRollupService.getCanonicalVolatility(bundle.canonicalProduct.id, LOOKBACK_DAYS);
    } catch (err) {
      errors.volatility = err instanceof Error ? err.message : String(err);
    }

    let exchangeTrend: ExchangeTrendContext | null = null;
    try {
      const to = new Date();
      const from = new Date(to.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
      const rates = await this.exchangeHistoryService.getRange(CurrencyPair.UsdBrl, from, to);
      exchangeTrend = buildExchangeTrend(rates);
    } catch (err) {
      errors.exchangeTrend = err instanceof Error ? err.message : String(err);
    }

    const { reasons, buyNowVotes, waitVotes } = evaluateSignals(bundle, exchangeTrend);
    addConfidenceReasons(reasons, bundle, volatility);

    // Simple majority over named, existing signals — no score, no weights.
    // A tie (including the all-"stable" case) is deliberately "can_wait",
    // never a coin-flip toward buy_now or better_wait.
    let verdict: PurchaseTimingVerdict = "can_wait";
    if (buyNowVotes > waitVotes) verdict = "buy_now";
    else if (waitVotes > buyNowVotes) verdict = "better_wait";

    return {
      canonicalProductId: bundle.canonicalProduct.id,
      verdict,
      reasons,
      priceAggregation: bundle.priceAggregation,
      priceStatistics: bundle.priceStatistics,
      volatility,
      exchangeTrend,
      errors,
    };
  }
}
