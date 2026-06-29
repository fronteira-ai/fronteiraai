import type { MerchantPassport } from "../types/trust.types";
import { TrustBadge, TrustSignalCategory } from "../types/enums";

export interface SearchBoostFactor {
  factor: string;
  present: boolean;
  weight: number;
  description: string;
}

export interface SearchReadinessProfile {
  merchant_id: string;
  has_passport: boolean;
  badge_level: string;
  has_verified_signals: boolean;
  signal_types: string[];
  signal_count: number;
  verification_count: number;
  review_count: number;
  average_rating: number | null;
  identity_category_coverage: string[];
  boost_factors: SearchBoostFactor[];
  readiness_score: number;
  generated_at: string;
}

export function buildSearchReadinessProfile(passport: MerchantPassport): SearchReadinessProfile {
  const { merchantId, trustSummary, activeSignals, insights, reviewStats } = passport;

  const coveredCategories = [...new Set(activeSignals.map((s) => s.category as string))];

  const boostFactors: SearchBoostFactor[] = [
    {
      factor: "has_active_signals",
      present: activeSignals.length > 0,
      weight: 20,
      description: "Possui sinais de confiança verificados ativos",
    },
    {
      factor: "has_business_verification",
      present: activeSignals.some((s) => s.category === TrustSignalCategory.Business),
      weight: 15,
      description: "Possui verificação de empresa ou operação recorrente",
    },
    {
      factor: "has_identity_verification",
      present: activeSignals.some((s) => s.category === TrustSignalCategory.Identity),
      weight: 15,
      description: "Possui verificação de identidade ou documentação",
    },
    {
      factor: "has_operational_verification",
      present: activeSignals.some((s) => s.category === TrustSignalCategory.Operational),
      weight: 10,
      description: "Possui verificações operacionais confirmadas",
    },
    {
      factor: "has_reviews",
      present: insights.reviewCount > 0,
      weight: 15,
      description: "Possui avaliações de compradores reais",
    },
    {
      factor: "has_positive_rating",
      present: reviewStats.average != null && reviewStats.average >= 4.0,
      weight: 10,
      description: "Nota média igual ou superior a 4.0",
    },
    {
      factor: "has_badge",
      present: trustSummary.badgeLevel !== TrustBadge.None,
      weight: 10,
      description: "Possui badge de confiança ativo",
    },
    {
      factor: "has_timeline",
      present: passport.timeline.length > 0,
      weight: 5,
      description: "Possui histórico público de eventos",
    },
  ];

  const readinessScore = boostFactors.reduce(
    (total, f) => total + (f.present ? f.weight : 0),
    0
  );

  return {
    merchant_id: merchantId,
    has_passport: true,
    badge_level: trustSummary.badgeLevel,
    has_verified_signals: activeSignals.length > 0,
    signal_types: activeSignals.map((s) => s.signal_type),
    signal_count: activeSignals.length,
    verification_count: insights.verificationCount,
    review_count: insights.reviewCount,
    average_rating: insights.averageRating,
    identity_category_coverage: coveredCategories,
    boost_factors: boostFactors,
    readiness_score: Math.min(readinessScore, 100),
    generated_at: new Date().toISOString(),
  };
}
