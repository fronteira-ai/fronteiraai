import { TrustComposer } from "../services/TrustComposer";
import type { RankedOfferIntelligence } from "../types/buyer-intelligence.types";
import type { IMerchantStoreLinkRepository } from "@/src/domains/merchant-ownership/repositories/IMerchantStoreLinkRepository";
import type { MerchantProfileService } from "@/src/domains/trust/services/MerchantProfileService";
import type { TrustHistoryService } from "@/src/domains/trust/services/TrustHistoryService";
import type { BadgeService } from "@/src/domains/trust/services/BadgeService";
import type { MerchantPublicProfile, MerchantBadgeRecord, TrustHistoryRecord } from "@/src/domains/trust/types/trust.types";
import { TrustBadge, TrustStatus } from "@/src/domains/trust/types/enums";
import { FreshnessClass } from "@/src/domains/realtime-commerce";

function makeOffer(overrides: Partial<RankedOfferIntelligence> = {}): RankedOfferIntelligence {
  return {
    offer: {
      offerId: "offer-1",
      productId: "product-1",
      storeId: "store-1",
      storeSlug: "store-1",
      priceUSD: 100,
      inStock: true,
      stockQuantity: 5,
      updatedAt: new Date().toISOString(),
      condition: "new",
      warranty: null,
      productUrl: null,
    },
    rank: 1,
    rankScore: 90,
    factors: [],
    isVerifiedStore: true,
    freshness: { offerId: "offer-1", score: 100, classification: FreshnessClass.Live, ageSeconds: 10, lastChangeAt: null },
    ...overrides,
  };
}

function makeBadge(overrides: Partial<MerchantBadgeRecord> = {}): MerchantBadgeRecord {
  return {
    id: "badge-1",
    merchant_id: "merchant-1",
    badge_type: TrustBadge.Verified,
    granted_at: "2026-01-01T00:00:00Z",
    expires_at: null,
    revoked_at: null,
    revoke_reason: null,
    granted_by: "admin-1",
    is_active: true,
    metadata: {},
    ...overrides,
  };
}

function makeProfile(overrides: Partial<MerchantPublicProfile> = {}): MerchantPublicProfile {
  return {
    merchantId: "merchant-1",
    companyName: "",
    trustSummary: {
      merchantId: "merchant-1",
      trustScore: 82,
      status: TrustStatus.Verified,
      badgeLevel: TrustBadge.Verified,
      activeBadge: makeBadge(),
      verificationCount: 0,
      activeSignalCount: 0,
      reviewCount: 0,
      averageRating: null,
      lastVerifiedAt: "2026-06-01T00:00:00Z",
      signals: [],
    },
    activeSignals: [],
    recentTimeline: [],
    recentReviews: [],
    activeBadges: [makeBadge()],
    ...overrides,
  };
}

function makeHistory(scores: number[]): TrustHistoryRecord[] {
  // TrustHistoryService.getMerchantHistory returns newest-first.
  return scores.map((score, i) => ({
    id: `history-${i}`,
    merchant_id: "merchant-1",
    snapshot_date: `2026-07-${String(13 - i).padStart(2, "0")}`,
    trust_score: score,
    status: TrustStatus.Verified,
    badge_level: TrustBadge.Verified,
    event_count: 0,
    verification_count: 0,
    metadata: {},
    created_at: "2026-07-13T00:00:00Z",
  }));
}

function makeLinkRepo(merchantIdByStoreId: Record<string, string> = {}): IMerchantStoreLinkRepository {
  return {
    link: jest.fn(),
    unlink: jest.fn(),
    isLinked: jest.fn(),
    findMerchantIdsByStoreIds: jest.fn().mockImplementation(async (storeIds: string[]) => {
      const map = new Map<string, string>();
      for (const storeId of storeIds) {
        if (merchantIdByStoreId[storeId]) map.set(storeId, merchantIdByStoreId[storeId]);
      }
      return map;
    }),
  } as unknown as IMerchantStoreLinkRepository;
}

function makeProfileService(profile: MerchantPublicProfile | null): MerchantProfileService {
  return { getPublicProfile: jest.fn().mockResolvedValue(profile) } as unknown as MerchantProfileService;
}

function makeHistoryService(history: TrustHistoryRecord[]): TrustHistoryService {
  return { getMerchantHistory: jest.fn().mockResolvedValue(history) } as unknown as TrustHistoryService;
}

function makeBadgeService(activeBadgesByMerchantId: Map<string, MerchantBadgeRecord> = new Map()): BadgeService {
  return { getActiveBadges: jest.fn().mockResolvedValue(activeBadgesByMerchantId) } as unknown as BadgeService;
}

describe("TrustComposer", () => {
  it("returns 'Informação indisponível' limitation and null merchant fields when the store has no merchant linked", async () => {
    const composer = new TrustComposer(makeLinkRepo(), makeProfileService(null), makeHistoryService([]), makeBadgeService());

    const result = await composer.composeForOffer(makeOffer());
    expect(result.merchantId).toBeNull();
    expect(result.trustScore).toBeNull();
    expect(result.badgeLevel).toBeNull();
    expect(result.limitations.some((l) => l.includes("informação indisponível"))).toBe(true);
  });

  it("surfaces isVerified straight from RankedOfferIntelligence.isVerifiedStore, never recomputed", async () => {
    const composer = new TrustComposer(
      makeLinkRepo({ "store-1": "merchant-1" }),
      makeProfileService(makeProfile()),
      makeHistoryService(makeHistory([82, 80])),
      makeBadgeService()
    );

    const verified = await composer.composeForOffer(makeOffer({ isVerifiedStore: true }));
    expect(verified.isVerified).toBe(true);

    const unverified = await composer.composeForOffer(makeOffer({ isVerifiedStore: false }));
    expect(unverified.isVerified).toBe(false);
  });

  it("cites Nível de confiança and Badges disponíveis from MerchantProfileService, and Estoque confirmado from the offer", async () => {
    const composer = new TrustComposer(
      makeLinkRepo({ "store-1": "merchant-1" }),
      makeProfileService(makeProfile()),
      makeHistoryService(makeHistory([82, 80])),
      makeBadgeService()
    );

    const result = await composer.composeForOffer(makeOffer());
    expect(result.trustScore).toBe(82);
    expect(result.badgeLevel).toBe(TrustBadge.Verified);
    expect(result.signals.some((s) => s.label === "Nível de confiança")).toBe(true);
    expect(result.signals.some((s) => s.label === "Badges disponíveis")).toBe(true);
    expect(result.signals.some((s) => s.label === "Estoque confirmado" && s.evidence.includes("disponível"))).toBe(true);
  });

  it("reports historyTrend as 'unknown' with fewer than 2 snapshots, and lists it as a limitation, never guessing consistency", async () => {
    const composer = new TrustComposer(
      makeLinkRepo({ "store-1": "merchant-1" }),
      makeProfileService(makeProfile()),
      makeHistoryService(makeHistory([82])),
      makeBadgeService()
    );

    const result = await composer.composeForOffer(makeOffer());
    expect(result.historyTrend).toBe("unknown");
    expect(result.signals.some((s) => s.label === "Histórico consistente")).toBe(false);
    expect(result.limitations.some((l) => l.includes("Histórico insuficiente"))).toBe(true);
  });

  it("classifies historyTrend as 'improving' when the newest snapshot beats the oldest beyond the tolerance band", async () => {
    const composer = new TrustComposer(
      makeLinkRepo({ "store-1": "merchant-1" }),
      makeProfileService(makeProfile()),
      makeHistoryService(makeHistory([90, 70])), // newest-first: 90 is newest, 70 is oldest
      makeBadgeService()
    );

    const result = await composer.composeForOffer(makeOffer());
    expect(result.historyTrend).toBe("improving");
    expect(result.signals.some((s) => s.label === "Histórico consistente")).toBe(true);
  });

  it("isolates a profile-service failure instead of failing the whole card", async () => {
    const broken = { getPublicProfile: jest.fn().mockRejectedValue(new Error("profile down")) } as unknown as MerchantProfileService;
    const composer = new TrustComposer(makeLinkRepo({ "store-1": "merchant-1" }), broken, makeHistoryService([]), makeBadgeService());

    const result = await composer.composeForOffer(makeOffer());
    expect(result.trustScore).toBeNull();
    expect(result.errors.profile).toBe("profile down");
    expect(result.limitations.some((l) => l.toLowerCase().includes("não foi possível"))).toBe(true);
  });

  it("composeCompactForStores batches verification for a list of stores, mirroring ComparisonIntelligenceComposer's own resolution", async () => {
    const badgeByMerchantId = new Map<string, MerchantBadgeRecord>([["merchant-1", makeBadge()]]);
    const composer = new TrustComposer(
      makeLinkRepo({ "store-1": "merchant-1", "store-2": "merchant-2" }),
      makeProfileService(null),
      makeHistoryService([]),
      makeBadgeService(badgeByMerchantId)
    );

    const result = await composer.composeCompactForStores(["store-1", "store-2", "store-3"]);
    expect(result.get("store-1")?.isVerified).toBe(true);
    expect(result.get("store-2")?.isVerified).toBe(false);
    expect(result.get("store-3")?.isVerified).toBe(false);
  });
});
