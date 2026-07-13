import type { IMerchantStoreLinkRepository } from "@/src/domains/merchant-ownership/repositories/IMerchantStoreLinkRepository";
import type { MerchantProfileService } from "@/src/domains/trust/services/MerchantProfileService";
import type { TrustHistoryService } from "@/src/domains/trust/services/TrustHistoryService";
import type { BadgeService } from "@/src/domains/trust/services/BadgeService";
import type { TrustHistoryRecord, MerchantBadgeRecord } from "@/src/domains/trust/types/trust.types";
import { TrustBadge } from "@/src/domains/trust/types/enums";
import type { RankedOfferIntelligence, TrustCardResult, TrustSignalLine, TrustHistoryTrend, CompactTrustBadge } from "../types/buyer-intelligence.types";

// Release 2.0 — Wave 4 (Experience Iteration 4 — Trust Experience).
// Composition only — every value here is read from BadgeService (already
// used by ComparisonIntelligenceComposer for isVerifiedStore),
// MerchantProfileService (already aggregates trust score/status/badges/
// signals for the merchant dashboard), and TrustHistoryService (already
// stores daily trust_score snapshots). No new score, badge rule, or
// verification logic is introduced. See
// docs/product/TRUST_DECISION_ARCHITECTURE.md.

const HISTORY_LOOKBACK_SNAPSHOTS = 30;
/** Trust score is 0-100 (MerchantTrust.trustScore, already computed by
 * TrustService/trust_history triggers). A 5-point band is the same kind of
 * "ignore noise" tolerance already used elsewhere (2% for price/exchange
 * trend, 10% for median comparison) — just expressed in this signal's own
 * units, not a new scoring concept. */
const TREND_TOLERANCE_POINTS = 5;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function computeHistoryTrend(history: TrustHistoryRecord[]): TrustHistoryTrend {
  if (history.length < 2) return "unknown";
  // TrustHistoryService.getMerchantHistory orders snapshot_date descending —
  // index 0 is newest, last index is oldest.
  const newest = history[0].trust_score;
  const oldest = history[history.length - 1].trust_score;
  const delta = newest - oldest;
  if (delta > TREND_TOLERANCE_POINTS) return "improving";
  if (delta < -TREND_TOLERANCE_POINTS) return "declining";
  return "stable";
}

function badgeLabel(badgeLevel: TrustBadge): string {
  const labels: Record<TrustBadge, string> = {
    [TrustBadge.None]: "Sem selo de confiança",
    [TrustBadge.Basic]: "Loja cadastrada",
    [TrustBadge.Verified]: "Loja verificada",
    [TrustBadge.Premium]: "Loja verificada premium",
  };
  return labels[badgeLevel];
}

function buildSignals(input: {
  isVerified: boolean;
  badgeLevel: TrustBadge | null;
  trustScore: number | null;
  activeBadges: MerchantBadgeRecord[];
  freshness: TrustCardResult["freshness"];
  inStock: boolean | null;
  historyTrend: TrustHistoryTrend;
}): TrustSignalLine[] {
  const signals: TrustSignalLine[] = [];

  signals.push({
    factor: "verification",
    label: "Loja verificada",
    evidence: input.isVerified
      ? "Esta loja possui um selo de verificação ativo."
      : "Esta loja ainda não possui um selo de verificação ativo.",
  });

  if (input.trustScore !== null && input.badgeLevel !== null) {
    signals.push({
      factor: "trustScore",
      label: "Nível de confiança",
      evidence: `${badgeLabel(input.badgeLevel)} — pontuação de confiança ${input.trustScore}/100.`,
    });
  }

  if (input.freshness) {
    signals.push({
      factor: "freshness",
      label: "Atualização recente",
      evidence: `Classificação de frescor: ${input.freshness.classification} (dado atualizado há ${Math.round(input.freshness.ageSeconds / 3600)}h).`,
    });
  }

  if (input.inStock !== null) {
    signals.push({
      factor: "stock",
      label: "Estoque confirmado",
      evidence: input.inStock ? "Produto marcado como disponível por esta loja." : "Produto marcado como indisponível por esta loja no momento.",
    });
  }

  if (input.activeBadges.length > 0) {
    signals.push({
      factor: "badges",
      label: "Badges disponíveis",
      evidence: input.activeBadges.map((b) => badgeLabel(b.badge_type)).join(", "),
    });
  }

  if (input.historyTrend !== "unknown") {
    const trendLabel = { improving: "em melhora", stable: "consistente", declining: "em queda" }[input.historyTrend];
    signals.push({
      factor: "historyTrend",
      label: "Histórico consistente",
      evidence: `Pontuação de confiança ${trendLabel} nos últimos registros.`,
    });
  }

  return signals;
}

function buildLimitations(input: {
  merchantId: string | null;
  activeBadges: MerchantBadgeRecord[];
  historyTrend: TrustHistoryTrend;
  freshness: TrustCardResult["freshness"];
  inStock: boolean | null;
  errors: TrustCardResult["errors"];
}): string[] {
  const limitations: string[] = [];

  if (!input.merchantId) {
    limitations.push("Esta loja ainda não possui um perfil de confiança vinculado — informação indisponível.");
    return limitations;
  }
  if (input.errors.profile) limitations.push("Não foi possível carregar o perfil de confiança desta loja no momento.");
  if (input.activeBadges.length === 0) limitations.push("Nenhum badge ativo no momento — informação indisponível.");
  if (input.historyTrend === "unknown") limitations.push("Histórico insuficiente para avaliar consistência — informação indisponível.");
  if (!input.freshness) limitations.push("Frescor do dado indisponível para esta oferta.");
  if (input.inStock === null) limitations.push("Estoque não confirmado — informação indisponível.");

  return limitations;
}

export class TrustComposer {
  constructor(
    private readonly merchantStoreLinkRepo: IMerchantStoreLinkRepository,
    private readonly merchantProfileService: MerchantProfileService,
    private readonly trustHistoryService: TrustHistoryService,
    private readonly badgeService: BadgeService
  ) {}

  /** Product Detail / Comparison Experience — reuses isVerifiedStore and
   * freshness already resolved by ComparisonIntelligenceComposer, so this
   * never recomputes verification or freshness on its own. */
  async composeForOffer(offer: RankedOfferIntelligence): Promise<TrustCardResult> {
    return this.composeForStore(offer.offer.storeId, offer.isVerifiedStore, offer.freshness, offer.offer.inStock);
  }

  async composeForStore(
    storeId: string,
    isVerifiedStore: boolean,
    freshness: TrustCardResult["freshness"],
    inStock: boolean | null
  ): Promise<TrustCardResult> {
    const merchantIdByStoreId = await this.merchantStoreLinkRepo.findMerchantIdsByStoreIds([storeId]);
    const merchantId = merchantIdByStoreId.get(storeId) ?? null;

    if (!merchantId) {
      return {
        storeId,
        merchantId: null,
        isVerified: isVerifiedStore,
        badgeLevel: null,
        trustScore: null,
        activeBadges: [],
        freshness,
        inStock,
        historyTrend: "unknown",
        signals: buildSignals({
          isVerified: isVerifiedStore,
          badgeLevel: null,
          trustScore: null,
          activeBadges: [],
          freshness,
          inStock,
          historyTrend: "unknown",
        }),
        limitations: buildLimitations({
          merchantId: null,
          activeBadges: [],
          historyTrend: "unknown",
          freshness,
          inStock,
          errors: {},
        }),
        errors: {},
      };
    }

    const errors: TrustCardResult["errors"] = {};

    const [profile, history] = await Promise.all([
      this.merchantProfileService.getPublicProfile(merchantId).catch((err) => {
        errors.profile = errorMessage(err);
        return null;
      }),
      this.trustHistoryService.getMerchantHistory(merchantId, HISTORY_LOOKBACK_SNAPSHOTS).catch((err) => {
        errors.history = errorMessage(err);
        return [] as TrustHistoryRecord[];
      }),
    ]);

    const badgeLevel = profile?.trustSummary.badgeLevel ?? null;
    const trustScore = profile?.trustSummary.trustScore ?? null;
    const activeBadges = profile?.activeBadges ?? [];
    const historyTrend = computeHistoryTrend(history);

    return {
      storeId,
      merchantId,
      isVerified: isVerifiedStore,
      badgeLevel,
      trustScore,
      activeBadges,
      freshness,
      inStock,
      historyTrend,
      signals: buildSignals({ isVerified: isVerifiedStore, badgeLevel, trustScore, activeBadges, freshness, inStock, historyTrend }),
      limitations: buildLimitations({ merchantId, activeBadges, historyTrend, freshness, inStock, errors }),
      errors,
    };
  }

  /** Objetivo 5 — Search Results compact version. Same batched
   * store→merchant→badge lookup ComparisonIntelligenceComposer already uses
   * for isVerifiedStore, just exposed for a store-id list instead of the
   * offers already resolved for one canonical product. */
  async composeCompactForStores(storeIds: string[]): Promise<Map<string, CompactTrustBadge>> {
    const uniqueStoreIds = [...new Set(storeIds)];
    if (uniqueStoreIds.length === 0) return new Map();

    const merchantIdByStoreId = await this.merchantStoreLinkRepo.findMerchantIdsByStoreIds(uniqueStoreIds);
    const merchantIds = [...new Set(merchantIdByStoreId.values())];
    const badgeByMerchantId = await this.badgeService.getActiveBadges(merchantIds);

    const result = new Map<string, CompactTrustBadge>();
    for (const storeId of uniqueStoreIds) {
      const merchantId = merchantIdByStoreId.get(storeId);
      result.set(storeId, { storeId, isVerified: merchantId ? badgeByMerchantId.has(merchantId) : false });
    }
    return result;
  }
}
