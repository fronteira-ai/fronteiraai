import { formatUSD } from "@/utils/currency";
import type {
  BestDealResult,
  PurchaseTimingResult,
  TrustCardResult,
  ParaguAIAdvisorResult,
  AdvisorConflict,
  AdvisorRecommendation,
  AdvisorSummaryLine,
} from "../types/buyer-intelligence.types";

// Release 2.0 — Fase 2 — Wave 5 (Experience Iteration 5 — ParaguAI Advisor).
// Pure, synchronous composition — no repository, no Supabase client, no I/O
// of any kind. Every decision here is a plain condition check over fields
// BestDealComposer/PurchaseTimingComposer/TrustComposer already computed.
// See docs/product/PARAGUAI_ADVISOR_ARCHITECTURE.md.

function hasExcellentPrice(bestDeal: BestDealResult | null): boolean {
  return !!bestDeal?.savingsOpportunity && bestDeal.savingsOpportunity.maxSavingsUSD > 0;
}

function detectConflicts(
  bestDeal: BestDealResult | null,
  purchaseTiming: PurchaseTimingResult | null,
  trust: TrustCardResult | null
): AdvisorConflict[] {
  const conflicts: AdvisorConflict[] = [];
  const savings = bestDeal?.savingsOpportunity;
  if (!hasExcellentPrice(bestDeal) || !savings) return conflicts;

  const savingsText = `Esta oferta economiza até ${formatUSD(savings.maxSavingsUSD)}`;

  if (trust && trust.merchantId && !trust.isVerified) {
    conflicts.push({
      signalA: "Preço excelente",
      signalB: "Confiança baixa",
      explanation: `${savingsText}, mas a loja ainda não possui um selo de verificação ativo.`,
    });
  }

  if (purchaseTiming?.verdict === "better_wait") {
    conflicts.push({
      signalA: "Preço excelente",
      signalB: "Melhor aguardar",
      explanation: `${savingsText}, mas os dados de preço recentes sugerem esperar antes de comprar.`,
    });
  }

  return conflicts;
}

function decideRecommendation(
  bestDeal: BestDealResult | null,
  purchaseTiming: PurchaseTimingResult | null,
  conflicts: AdvisorConflict[]
): AdvisorRecommendation {
  if (!bestDeal) return "insufficient_data";
  if (conflicts.length > 0) return "good_deal_caution";
  if (purchaseTiming?.verdict === "better_wait") return "wait";
  return "buy_now";
}

function buildHeadline(recommendation: AdvisorRecommendation): string {
  switch (recommendation) {
    case "buy_now":
      return "Recomendamos comprar agora";
    case "good_deal_caution":
      return "Preço vantajoso, com ressalvas — leia os detalhes";
    case "wait":
      return "Vale esperar antes de comprar";
    case "insufficient_data":
      return "Ainda não há inteligência suficiente vinculada a este produto";
  }
}

function buildSummaryLines(
  recommendation: AdvisorRecommendation,
  bestDeal: BestDealResult | null,
  purchaseTiming: PurchaseTimingResult | null,
  trust: TrustCardResult | null,
  conflicts: AdvisorConflict[]
): AdvisorSummaryLine[] {
  const lines: AdvisorSummaryLine[] = [];

  lines.push({ icon: "🏆", label: "Recomendação", value: buildHeadline(recommendation) });

  if (bestDeal?.savingsOpportunity && bestDeal.savingsOpportunity.maxSavingsUSD > 0) {
    lines.push({
      icon: "💰",
      label: "Economia estimada",
      value: `Até ${formatUSD(bestDeal.savingsOpportunity.maxSavingsUSD)} (${bestDeal.savingsOpportunity.maxSavingsPercent.toFixed(0)}%)`,
    });
  }

  if (trust) {
    lines.push({
      icon: "🛡️",
      label: "Confiança",
      value: trust.isVerified ? "Loja verificada" : "Loja ainda não verificada",
    });
  }

  if (purchaseTiming && purchaseTiming.verdict !== "insufficient_data") {
    const timingLabel = { buy_now: "Bom momento para comprar", can_wait: "Pode esperar", better_wait: "Melhor aguardar" }[purchaseTiming.verdict];
    lines.push({ icon: "🕒", label: "Timing", value: timingLabel });
  }

  if (conflicts.length > 0) {
    lines.push({ icon: "⚠️", label: "Atenção", value: conflicts.map((c) => `${c.signalA} × ${c.signalB}`).join("; ") });
  }

  return lines.slice(0, 5);
}

export class ParaguAIAdvisorComposer {
  /** Objetivo 2/3 — pure composition, no constructor dependencies: this
   * composer needs nothing beyond the three already-composed results. */
  compose(
    bestDeal: BestDealResult | null,
    purchaseTiming: PurchaseTimingResult | null,
    trust: TrustCardResult | null
  ): ParaguAIAdvisorResult {
    const conflicts = detectConflicts(bestDeal, purchaseTiming, trust);
    const recommendation = decideRecommendation(bestDeal, purchaseTiming, conflicts);
    const headline = buildHeadline(recommendation);
    const summary = buildSummaryLines(recommendation, bestDeal, purchaseTiming, trust, conflicts);

    return { recommendation, headline, bestDeal, purchaseTiming, trust, conflicts, summary };
  }
}
