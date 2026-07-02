import type { CanonicalOfferView } from "../types/canonical-catalog.types";

// Extends the existing ADR-014 ranking pattern (services/compare.service.ts
// computeRankScore: price/availability/store-reliability/listing-quality)
// with recency, and replaces "store reliability" with an explicit `trust`
// input the caller must resolve — never computed here, and never a
// Reputation Score. "Zero Reputation Score" is a permanent constraint
// (docs/releases/RELEASE_CERTIFICATION_1.5.md): no component in this
// codebase calculates or exposes a reputation/trust score. `isVerifiedStore`
// is a single explicit, verifiable boolean (e.g. a merchant verification
// badge), not a composite algorithm — explainable by construction, matching
// this Wave's theme. Still invisible to the user (mission objective 9) —
// this is internal ranking infrastructure only.
export interface OfferRankInput {
  offer: CanonicalOfferView;
  isVerifiedStore: boolean;
}

export interface OfferRankFactor {
  factor: string;
  weight: number;
  evidence: string;
}

export interface RankedCanonicalOffer {
  offer: CanonicalOfferView;
  rank: number;
  rankScore: number;
  factors: OfferRankFactor[];
}

const PRICE_WEIGHT = 40;
const AVAILABILITY_WEIGHT = 20;
const RECENCY_WEIGHT = 15;
const TRUST_WEIGHT = 15;
const QUALITY_WEIGHT = 10;

function daysSince(isoDate: string): number {
  return (Date.now() - new Date(isoDate).getTime()) / (1000 * 60 * 60 * 24);
}

function recencyWeight(ageDays: number): number {
  if (ageDays <= 1) return RECENCY_WEIGHT;
  if (ageDays <= 7) return Math.round(RECENCY_WEIGHT * (2 / 3));
  if (ageDays <= 30) return Math.round(RECENCY_WEIGHT * (1 / 3));
  return 0;
}

export class OfferRankingService {
  rank(inputs: OfferRankInput[]): RankedCanonicalOffer[] {
    if (inputs.length === 0) return [];

    const lowestPrice = Math.min(...inputs.map((i) => i.offer.priceUSD));

    const scored = inputs.map(({ offer, isVerifiedStore }) => {
      const factors: OfferRankFactor[] = [];

      const priceScore = offer.priceUSD > 0 ? PRICE_WEIGHT * (lowestPrice / offer.priceUSD) : 0;
      factors.push({
        factor: "price",
        weight: Math.round(priceScore),
        evidence: `USD ${offer.priceUSD} vs. lowest USD ${lowestPrice} among compared offers`,
      });

      factors.push({
        factor: "availability",
        weight: offer.inStock ? AVAILABILITY_WEIGHT : 0,
        evidence: offer.inStock ? "in stock" : "out of stock",
      });

      const ageDays = daysSince(offer.updatedAt);
      factors.push({
        factor: "recency",
        weight: recencyWeight(ageDays),
        evidence: `last updated ${ageDays.toFixed(1)} day(s) ago`,
      });

      factors.push({
        factor: "trust",
        weight: isVerifiedStore ? TRUST_WEIGHT : 0,
        evidence: isVerifiedStore ? "store is verified" : "store is not verified",
      });

      const qualityFields = [offer.condition, offer.warranty, offer.productUrl];
      const filledCount = qualityFields.filter(Boolean).length;
      factors.push({
        factor: "listing-quality",
        weight: Math.round((filledCount / qualityFields.length) * QUALITY_WEIGHT),
        evidence: `${filledCount}/${qualityFields.length} listing fields filled (condition, warranty, product URL)`,
      });

      const rankScore = factors.reduce((sum, f) => sum + f.weight, 0);
      return { offer, rankScore, factors };
    });

    return scored
      .sort((a, b) => b.rankScore - a.rankScore)
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }
}
