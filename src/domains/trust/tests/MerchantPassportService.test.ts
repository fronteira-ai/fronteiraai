/**
 * MerchantPassportService — assertion-based tests (no test runner required).
 * Type-checked by tsc. Run with: npx ts-node src/domains/trust/tests/MerchantPassportService.test.ts
 */
import { MerchantPassportService } from "../services/MerchantPassportService";
import { TrustStatus, TrustBadge, VerificationStatus, MerchantChannelType } from "../types/enums";
import type { MerchantBasicData, MerchantTrustRecord, MerchantVerificationRecord, MerchantBadgeRecord, MerchantReviewRecord, MerchantTimelineRecord, ReviewStats, PaginatedResult } from "../types/trust.types";
import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { IVerificationRepository } from "../repositories/IVerificationRepository";
import type { IBadgeRepository } from "../repositories/IBadgeRepository";
import type { ITrustSignalRepository } from "../repositories/ITrustSignalRepository";
import type { IMerchantReviewRepository } from "../repositories/IMerchantReviewRepository";
import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

const basicData: MerchantBasicData = {
  companyName: "Loja Teste",
  companyDoc: "12.345.678/0001-90",
  website: "https://loja.example.com",
  phone: "+595981234567",
  whatsapp: "https://wa.me/595981234567",
  email: "contato@loja.example.com",
  verifiedLevel: "verified",
  plan: "pro",
  joinedAt: new Date(Date.now() - 400 * 86400000).toISOString(),
  lastUpdatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
};

const fakeTrustRecord: MerchantTrustRecord = {
  id: "trust-001",
  merchant_id: "merchant-001",
  trust_score: 85,
  status: TrustStatus.Verified,
  badge_level: TrustBadge.Verified,
  last_verified_at: new Date().toISOString(),
  last_event_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const fakeVerification: MerchantVerificationRecord = {
  id: "ver-001",
  merchant_id: "merchant-001",
  verification_type: "company" as never,
  status: VerificationStatus.Approved,
  submitted_at: new Date().toISOString(),
  reviewed_at: new Date().toISOString(),
  reviewed_by: "admin-001",
  rejection_reason: null,
  expires_at: null,
  metadata: {},
  created_at: new Date().toISOString(),
};

const fakeBadge: MerchantBadgeRecord = {
  id: "badge-001",
  merchant_id: "merchant-001",
  badge_type: TrustBadge.Verified,
  granted_at: new Date().toISOString(),
  expires_at: null,
  revoked_at: null,
  revoke_reason: null,
  granted_by: "admin-001",
  is_active: true,
  metadata: {},
};

const emptyPage: PaginatedResult<MerchantReviewRecord> = {
  data: [], total: 0, page: 1, perPage: 10, totalPages: 0,
};

const emptyStats: ReviewStats = {
  total: 0, average: null, distribution: {}, approvedCount: 0,
};

function makeTrustRepo(record: MerchantTrustRecord | null = fakeTrustRecord): ITrustRepository {
  return {
    findByMerchantId: async () => record,
    findAll: async () => ({ data: [], total: 0, page: 1, perPage: 10, totalPages: 0 }),
    create: async () => null,
    updateStatus: async () => null,
    updateBadge: async () => null,
    touch: async () => undefined,
  };
}

function makeVerificationRepo(verifications: MerchantVerificationRecord[] = [fakeVerification]): IVerificationRepository {
  return {
    findById: async () => null,
    findByMerchantId: async () => verifications,
    findPending: async () => [],
    create: async () => null,
    updateStatus: async () => null,
  };
}

function makeBadgeRepo(badges: MerchantBadgeRecord[] = [fakeBadge]): IBadgeRepository {
  return {
    findByMerchantId: async () => badges,
    findActiveBadge: async () => badges.find(b => b.is_active) ?? null,
    grant: async () => null,
    revoke: async () => null,
    deactivateAll: async () => undefined,
  };
}

function makeSignalRepo(): ITrustSignalRepository {
  return {
    findByMerchantId: async () => ({ data: [], total: 0, page: 1, perPage: 10, totalPages: 0 }),
    findActiveByMerchantId: async () => [],
    findById: async () => null,
    findByVerificationId: async () => null,
    create: async () => null,
    updateStatus: async () => null,
    update: async () => null,
  };
}

function makeReviewRepo(): IMerchantReviewRepository {
  return {
    findByMerchantId: async () => emptyPage,
    findById: async () => null,
    findByReviewerAndMerchant: async () => null,
    create: async () => null,
    update: async () => null,
    softDelete: async () => false,
    updateStatus: async () => null,
    incrementHelpful: async () => undefined,
    incrementReports: async () => undefined,
    getStats: async () => emptyStats,
  };
}

function makeTimelineRepo(events: MerchantTimelineRecord[] = []): IMerchantTimelineRepository {
  const emptyPagedResult: PaginatedResult<MerchantTimelineRecord> = { data: [], total: 0, page: 1, perPage: 10, totalPages: 0 };
  return {
    findByMerchantId: async () => emptyPagedResult,
    findPublicByMerchantId: async () => events,
    create: async () => null,
  };
}

function makeSvc(overrides: Partial<{
  trust: ITrustRepository;
  verification: IVerificationRepository;
  badge: IBadgeRepository;
}> = {}) {
  return new MerchantPassportService(
    overrides.trust ?? makeTrustRepo(),
    overrides.verification ?? makeVerificationRepo(),
    overrides.badge ?? makeBadgeRepo(),
    makeSignalRepo(),
    makeReviewRepo(),
    makeTimelineRepo()
  );
}

async function testPassportStructure() {
  const svc = makeSvc();
  const passport = await svc.getPassport("merchant-001", basicData);

  assert(passport !== null, "getPassport returns a passport");
  assert(passport!.merchantId === "merchant-001", "passport has correct merchantId");
  assert(passport!.basic.companyName === "Loja Teste", "passport has basic data");
  assert(passport!.channels.length === 4, "passport builds 4 channels from basic data");
  assert(passport!.generatedAt !== "", "passport has generatedAt timestamp");
  console.log("✓ passport structure");
}

async function testInsightsComputation() {
  const svc = makeSvc();
  const passport = await svc.getPassport("merchant-001", basicData);

  assert(passport !== null, "passport exists");
  const { insights } = passport!;
  assert(insights.platformAgeInDays >= 400, "platform age computed from joinedAt");
  assert(insights.verificationCount === 1, "counts approved verifications");
  assert(insights.activeSignalCount === 0, "counts active signals");
  assert(insights.reviewCount === 0, "counts reviews from stats");
  assert(insights.lastVerifiedAt !== null, "last verified comes from trust record");
  console.log("✓ insights computation");
}

async function testChannelBuilding() {
  const svc = makeSvc();
  const passport = await svc.getPassport("merchant-001", basicData);

  const channels = passport!.channels;
  const types = channels.map(c => c.type);
  assert(types.includes(MerchantChannelType.Website), "website channel present");
  assert(types.includes(MerchantChannelType.WhatsApp), "whatsapp channel present");
  assert(types.includes(MerchantChannelType.Phone), "phone channel present");
  assert(types.includes(MerchantChannelType.Email), "email channel present");
  console.log("✓ channel building");
}

async function testSearchMetadata() {
  const svc = makeSvc();
  const passport = await svc.getPassport("merchant-001", basicData);

  const { searchMetadata } = passport!;
  assert(!searchMetadata.hasVerifiedSignals, "no signals means hasVerifiedSignals=false");
  assert(searchMetadata.verificationCount === 1, "verificationCount in searchMetadata");
  assert(searchMetadata.badgeLevel === TrustBadge.Verified, "badgeLevel from trust record");
  console.log("✓ search metadata");
}

async function testNullTrustRecord() {
  const svc = makeSvc({ trust: makeTrustRepo(null) });
  const passport = await svc.getPassport("merchant-001", basicData);

  assert(passport !== null, "passport returns even without trust record");
  assert(passport!.trustSummary.trustScore === 0, "defaults to score 0");
  assert(passport!.trustSummary.status === TrustStatus.Unverified, "defaults to Unverified");
  console.log("✓ null trust record handled gracefully");
}

async function testInsightsEndpoint() {
  const svc = makeSvc();
  const insights = await svc.getInsights(
    "merchant-001",
    basicData.joinedAt,
    basicData.lastUpdatedAt
  );

  assert(insights !== null, "getInsights returns data");
  assert(insights!.platformAgeInDays >= 400, "insights endpoint computes age");
  assert(insights!.verificationCount === 1, "insights endpoint counts verifications");
  console.log("✓ insights endpoint");
}

async function run() {
  console.log("\n── MerchantPassportService Tests ───────────────────────────");
  await testPassportStructure();
  await testInsightsComputation();
  await testChannelBuilding();
  await testSearchMetadata();
  await testNullTrustRecord();
  await testInsightsEndpoint();
  console.log("── All tests passed ────────────────────────────────────────\n");
}

run().catch(console.error);
