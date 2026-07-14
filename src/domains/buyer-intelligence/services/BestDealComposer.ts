import { FreshnessClass } from "@/src/domains/realtime-commerce";
import { CurrencyPair, formatUSD } from "@/src/domains/exchange";
import type { ExchangeRateService } from "@/src/domains/exchange";
import type {
  ComparisonIntelligenceBundle,
  RankedOfferIntelligence,
  BestDealResult,
  BestDealReason,
  NearTieInfo,
} from "../types/buyer-intelligence.types";

// Release 2.0 — Wave 2 (Experience Iteration 2 — Best Deal). This is the
// "Best Deal Composer" named in the mission: it NEVER recalculates
// anything and NEVER queries canonical-catalog/market-insights/
// realtime-commerce/trust directly — its only inputs are (a) a
// ComparisonIntelligenceBundle that ComparisonIntelligenceComposer already
// built (Wave 1) and (b) one already-existing ExchangeRateService call.
// Every number in its output already existed before this file was written;
// this class only selects, labels, and compares them. See
// docs/product/DECISION_LAYER.md for the full architecture and
// docs/product/WHY_THIS_RECOMMENDATION.md for the buyer-facing framing.

// Buyer-facing labels for OfferRankingService's factor names — translation
// only, the factor names/weights/evidence themselves are untouched.
const FACTOR_LABELS: Record<string, string> = {
  price: "Menor preço",
  availability: "Estoque disponível",
  recency: "Atualização recente",
  trust: "Loja de confiança",
  "listing-quality": "Anúncio completo",
};

// Objetivo 6 ("duas ofertas equivalentes"): a threshold comparison on the
// ALREADY-COMPUTED rankScore (OfferRankingService, 0-100 composite scale) —
// not a new score. 5 points on a 100-point scale mirrors the same order of
// magnitude as SearchIntelligenceComposer's existing 0.9x
// "belowAveragePrice" threshold (Wave 1) — a comparison utility, not a new
// signal-generating algorithm. Documented here, not tuned per-product.
const NEAR_TIE_RANKSCORE_GAP = 5;

function buildRankingReasons(offer: RankedOfferIntelligence): BestDealReason[] {
  // Only cite factors that actually contributed (weight > 0) — a factor
  // present with weight 0 (e.g. "availability" when out of stock) is not a
  // reason FOR this offer, it's already reflected in the lower rankScore.
  return offer.factors
    .filter((f) => f.weight > 0)
    .map((f) => ({
      factor: f.factor,
      label: FACTOR_LABELS[f.factor] ?? f.factor,
      evidence: f.evidence,
    }));
}

function buildSavingsReason(
  offer: RankedOfferIntelligence,
  savings: ComparisonIntelligenceBundle["savingsOpportunity"]
): BestDealReason | null {
  if (!savings || savings.maxSavingsUSD <= 0) return null;
  if (savings.cheapestStoreId !== offer.offer.storeId) return null;
  return {
    factor: "savings",
    label: "Economia estimada",
    evidence: `Até ${formatUSD(savings.maxSavingsUSD)} (${savings.maxSavingsPercent.toFixed(0)}%) mais barato que a loja mais cara`,
  };
}

const FRESHNESS_EVIDENCE: Partial<Record<FreshnessClass, string>> = {
  [FreshnessClass.Live]: "Preço confirmado agora mesmo",
  [FreshnessClass.Fresh]: "Preço confirmado recentemente",
};

function buildFreshnessReason(offer: RankedOfferIntelligence): BestDealReason | null {
  if (!offer.freshness) return null;
  const evidence = FRESHNESS_EVIDENCE[offer.freshness.classification];
  if (!evidence) return null;
  return { factor: "freshness", label: "Atualização recente", evidence };
}

function buildRankReason(offer: RankedOfferIntelligence, totalOffers: number): BestDealReason {
  return {
    factor: "rank",
    label: "Ranking superior",
    evidence:
      totalOffers > 1
        ? `1º lugar entre ${totalOffers} ofertas comparadas, pontuação ${offer.rankScore}/100`
        : `Única oferta encontrada, pontuação ${offer.rankScore}/100`,
  };
}

function buildReasons(
  offer: RankedOfferIntelligence,
  savings: ComparisonIntelligenceBundle["savingsOpportunity"],
  totalOffers: number
): BestDealReason[] {
  const reasons = buildRankingReasons(offer);
  const savingsReason = buildSavingsReason(offer, savings);
  if (savingsReason) reasons.push(savingsReason);
  const freshnessReason = buildFreshnessReason(offer);
  if (freshnessReason) reasons.push(freshnessReason);
  reasons.push(buildRankReason(offer, totalOffers));
  return reasons;
}

function buildNearTie(offers: RankedOfferIntelligence[]): NearTieInfo | null {
  const first = offers.find((o) => o.rank === 1);
  const second = offers.find((o) => o.rank === 2);
  if (!first || !second) return null;

  const gap = first.rankScore - second.rankScore;
  const isNearTie = gap <= NEAR_TIE_RANKSCORE_GAP;
  if (!isNearTie) return null;

  // The factor with the largest weight gap between the two — "the main
  // difference" — read directly from OfferRankingService's own factors,
  // never a new comparison metric.
  let differentiatingFactor: BestDealReason | null = null;
  let largestGap = -1;
  for (const factor of first.factors) {
    const counterpart = second.factors.find((f) => f.factor === factor.factor);
    const factorGap = Math.abs(factor.weight - (counterpart?.weight ?? 0));
    if (factorGap > largestGap) {
      largestGap = factorGap;
      const stronger = factor.weight >= (counterpart?.weight ?? 0) ? factor : counterpart!;
      differentiatingFactor = {
        factor: stronger.factor,
        label: FACTOR_LABELS[stronger.factor] ?? stronger.factor,
        evidence: stronger.evidence,
      };
    }
  }

  return { isNearTie: true, contenders: [first, second], differentiatingFactor };
}

export class BestDealComposer {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  async compose(bundle: ComparisonIntelligenceBundle): Promise<BestDealResult | null> {
    const recommendedOffer = bundle.offers.find((o) => o.rank === 1);
    if (!recommendedOffer) return null;

    const errors: BestDealResult["errors"] = { ...bundle.errors };

    let exchangeContext: BestDealResult["exchangeContext"] = null;
    try {
      const rate = await this.exchangeRateService.getCurrentRate(CurrencyPair.UsdBrl);
      if (rate) exchangeContext = { rate };
    } catch (err) {
      errors.exchangeRate = err instanceof Error ? err.message : String(err);
    }

    return {
      canonicalProduct: bundle.canonicalProduct,
      recommendedOffer,
      reasons: buildReasons(recommendedOffer, bundle.savingsOpportunity, bundle.totalOffers),
      priceStatistics: bundle.priceStatistics,
      savingsOpportunity: bundle.savingsOpportunity,
      exchangeContext,
      nearTie: buildNearTie(bundle.offers),
      totalOffers: bundle.totalOffers,
      errors,
    };
  }
}
