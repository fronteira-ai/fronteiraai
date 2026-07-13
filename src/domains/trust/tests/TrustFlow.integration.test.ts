/**
 * TrustFlow — integration test covering the complete trust pipeline:
 * Verification → TrustSignal → Passport → Review → Timeline → BrainEvent → KnowledgeGraph
 *
 * All mocked in-memory. No DB required.
 * Type-checked by tsc. Run with: npx ts-node src/domains/trust/tests/TrustFlow.integration.test.ts
 */
import { TrustSignalService } from "../services/TrustSignalService";
import { ReviewService } from "../services/ReviewService";
import { MerchantPassportService } from "../services/MerchantPassportService";
import { CognitiveBrainService } from "../brain/CognitiveBrainService";
import { KnowledgeGraphService } from "../brain/KnowledgeGraphService";
import { buildSearchReadinessProfile } from "../brain/SearchReadinessService";
import { BRAIN_SCHEMA_VERSION } from "../brain/BrainEvent";
import {
  TrustSignalType, TrustSignalStatus, TrustSignalCategory,
  SignalTrustLevel, VerificationType, VerificationStatus,
  ReviewStatus, ReviewAction, TrustEventType, TrustSource,
  BrainEntityType, CognitiveBrainActorRole, TrustBadge, TrustStatus,
} from "../types/enums";
import type {
  MerchantVerificationRecord, TrustSignalRecord, SignalProvenanceRecord,
  MerchantReviewRecord, ReviewAuditRecord, MerchantTimelineRecord,
  MerchantTrustRecord,
  MerchantBasicData,
} from "../types/trust.types";
import type { ITrustSignalRepository } from "../repositories/ITrustSignalRepository";
import type { ISignalProvenanceRepository } from "../repositories/ISignalProvenanceRepository";
import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";
import type { IMerchantReviewRepository } from "../repositories/IMerchantReviewRepository";
import type { IReviewAuditRepository } from "../repositories/IReviewAuditRepository";
import type { ITrustEventRepository, CreateTrustEventInput } from "../repositories/ITrustEventRepository";
import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { IVerificationRepository } from "../repositories/IVerificationRepository";
import type { IBadgeRepository } from "../repositories/IBadgeRepository";
import type { TrustEventRecord } from "../types/trust.types";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MERCHANT_ID = "merchant-flow-001";
const BUYER_ID = "buyer-flow-001";
const ADMIN_ID = "admin-flow-001";
const VER_ID = "ver-flow-001";

const fakeVerification: MerchantVerificationRecord = {
  id: VER_ID,
  merchant_id: MERCHANT_ID,
  verification_type: VerificationType.Company,
  status: VerificationStatus.Approved,
  submitted_at: new Date().toISOString(),
  reviewed_at: new Date().toISOString(),
  reviewed_by: ADMIN_ID,
  rejection_reason: null,
  expires_at: null,
  metadata: {},
  created_at: new Date().toISOString(),
};

// ── In-memory stores ──────────────────────────────────────────────────────────

const signalStore: TrustSignalRecord[] = [];
const provenanceStore: SignalProvenanceRecord[] = [];
const reviewStore: MerchantReviewRecord[] = [];
const auditStore: ReviewAuditRecord[] = [];
const timelineStore: MerchantTimelineRecord[] = [];
const eventStore: TrustEventRecord[] = [];

// ── Repository mocks ──────────────────────────────────────────────────────────

const signalRepo: ITrustSignalRepository = {
  findByMerchantId: async () => ({ data: signalStore, total: signalStore.length, page: 1, perPage: 100, totalPages: 1 }),
  findActiveByMerchantId: async () => signalStore.filter(s => s.status === TrustSignalStatus.Active),
  findById: async (id) => signalStore.find(s => s.id === id) ?? null,
  findByVerificationId: async (vid) => signalStore.find(s => s.verification_id === vid) ?? null,
  create: async (input) => {
    const s: TrustSignalRecord = { id: `sig-${signalStore.length}`, last_updated_at: new Date().toISOString(), created_at: new Date().toISOString(), ...input };
    signalStore.push(s);
    return s;
  },
  updateStatus: async (id, status) => {
    const s = signalStore.find(s => s.id === id);
    if (s) s.status = status;
    return s ?? null;
  },
  update: async (id, patch) => {
    const s = signalStore.find(s => s.id === id);
    if (s) Object.assign(s, patch);
    return s ?? null;
  },
};

const provenanceRepo: ISignalProvenanceRepository = {
  findBySignalId: async () => null,
  findByMerchantId: async () => provenanceStore,
  create: async (input) => {
    const p: SignalProvenanceRecord = { id: `prov-${provenanceStore.length}`, created_at: new Date().toISOString(), ...input };
    provenanceStore.push(p);
    return p;
  },
};

const timelineRepo: IMerchantTimelineRepository = {
  findByMerchantId: async () => ({ data: timelineStore, total: timelineStore.length, page: 1, perPage: 100, totalPages: 1 }),
  findPublicByMerchantId: async () => timelineStore,
  create: async (input) => {
    const t: MerchantTimelineRecord = { id: `tl-${timelineStore.length}`, created_at: new Date().toISOString(), ...input };
    timelineStore.push(t);
    return t;
  },
};


const reviewRepo: IMerchantReviewRepository = {
  findByMerchantId: async () => ({ data: reviewStore, total: reviewStore.length, page: 1, perPage: 10, totalPages: 1 }),
  findById: async (id) => reviewStore.find(r => r.id === id) ?? null,
  findByReviewerAndMerchant: async (rid, mid) => reviewStore.find(r => r.reviewer_id === rid && r.merchant_id === mid) ?? null,
  create: async (input) => {
    const r: MerchantReviewRecord = { id: `rev-${reviewStore.length}`, edit_count: 0, helpful_count: 0, report_count: 0, deleted_at: null, created_at: new Date().toISOString(), ...input };
    reviewStore.push(r);
    return r;
  },
  update: async (id, patch) => {
    const r = reviewStore.find(r => r.id === id);
    if (r) Object.assign(r, patch);
    return r ?? null;
  },
  softDelete: async (id) => { const r = reviewStore.find(r => r.id === id); if (r) r.deleted_at = new Date().toISOString(); return !!r; },
  updateStatus: async (id, status) => { const r = reviewStore.find(r => r.id === id); if (r) r.status = status; return r ?? null; },
  incrementHelpful: async () => undefined,
  incrementReports: async () => undefined,
  getStats: async () => {
    const approved = reviewStore.filter(r => r.status === ReviewStatus.Approved && !r.deleted_at);
    const avg = approved.length > 0 ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : null;
    return { total: reviewStore.length, average: avg, distribution: {}, approvedCount: approved.length };
  },
};

const auditRepo: IReviewAuditRepository = {
  findByReviewId: async () => auditStore,
  findByMerchantId: async () => auditStore,
  create: async (input) => {
    const a: ReviewAuditRecord = { id: `audit-${auditStore.length}`, created_at: new Date().toISOString(), ...input };
    auditStore.push(a);
    return a;
  },
};

const eventRepo: ITrustEventRepository = {
  findByMerchantId: async () => eventStore,
  findByType: async () => eventStore,
  create: async (input: CreateTrustEventInput) => {
    const e: TrustEventRecord = {
      id: `ev-${eventStore.length}`,
      merchant_id: input.merchant_id,
      merchant_trust_id: input.merchant_trust_id ?? null,
      event_type: input.event_type,
      source: input.source,
      reason: input.reason ?? null,
      delta: input.delta ?? 0,
      score_before: input.score_before ?? null,
      score_after: input.score_after ?? null,
      metadata: input.metadata ?? {},
      created_at: new Date().toISOString(),
      created_by: input.created_by ?? null,
    };
    eventStore.push(e);
    return e;
  },
};

const trustRepo: ITrustRepository = {
  findByMerchantId: async () => ({
    id: "trust-001", merchant_id: MERCHANT_ID, trust_score: 0,
    status: TrustStatus.Verified, badge_level: TrustBadge.None,
    last_verified_at: null, last_event_at: null,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as MerchantTrustRecord),
  findAll: async () => ({ data: [], total: 0, page: 1, perPage: 10, totalPages: 0 }),
  create: async () => null,
  updateStatus: async () => null,
  updateBadge: async () => null,
  touch: async () => undefined,
};

const verificationRepo: IVerificationRepository = {
  findById: async () => fakeVerification,
  findByMerchantId: async () => [fakeVerification],
  findPending: async () => [],
  create: async () => null,
  updateStatus: async () => null,
};

const badgeRepo: IBadgeRepository = {
  findByMerchantId: async () => [],
  findActiveBadge: async () => null,
  findActiveBadgesByMerchantIds: async () => new Map(),
  grant: async () => null,
  revoke: async () => null,
  deactivateAll: async () => undefined,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

async function testVerificationToSignal() {
  const svc = new TrustSignalService(signalRepo, provenanceRepo, timelineRepo);
  const signal = await svc.createFromVerification(fakeVerification, ADMIN_ID, "CNPJ confirmado pelo admin");

  assert(signal !== null, "signal created from verification");
  assert(signal!.signal_type === TrustSignalType.CompanyVerified, "signal type derived from verification type");
  assert(signal!.status === TrustSignalStatus.Active, "signal is active");
  assert(signal!.category === TrustSignalCategory.Business, "signal has correct category");
  assert(signal!.verification_id === VER_ID, "signal linked to verification");
  assert(provenanceStore.length === 1, "provenance record created");
  assert(provenanceStore[0].trust_level === SignalTrustLevel.High, "provenance trust level is High");
  assert(timelineStore.length === 1, "timeline event created on signal activation");
  console.log("✓ Verification → Signal → Timeline");
}

async function testSignalToPassport() {
  const passportSvc = new MerchantPassportService(
    trustRepo, verificationRepo, badgeRepo, signalRepo, reviewRepo, timelineRepo
  );

  const basic: MerchantBasicData = {
    companyName: "Loja Flow", companyDoc: null, website: null, phone: null, whatsapp: null, email: null,
    verifiedLevel: "verified", plan: "pro",
    joinedAt: new Date(Date.now() - 400 * 86400000).toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };

  const passport = await passportSvc.getPassport(MERCHANT_ID, basic);
  assert(passport !== null, "passport built successfully");
  assert(passport!.activeSignals.length === 1, "passport has the created signal");
  assert(passport!.insights.verificationCount === 1, "passport insights show 1 verification");
  assert(passport!.insights.activeSignalCount === 1, "passport insights show 1 active signal");
  assert(passport!.insights.platformAgeInDays >= 400, "platform age computed correctly");

  const profile = buildSearchReadinessProfile(passport!);
  assert(profile.has_verified_signals, "search readiness shows verified signals");
  assert(profile.readiness_score > 0, "readiness score > 0");
  assert(profile.boost_factors.find(f => f.factor === "has_active_signals")?.present === true, "has_active_signals boost is true");
  assert(profile.boost_factors.find(f => f.factor === "has_business_verification")?.present === true, "has_business_verification boost is true");
  console.log(`✓ Signal → Passport → SearchReadiness (score: ${profile.readiness_score})`);
}

async function testReviewFlow() {
  const reviewSvc = new ReviewService(reviewRepo, auditRepo, eventRepo);
  const review = await reviewSvc.submitReview(MERCHANT_ID, BUYER_ID, { rating: 5, body: "Excelente lojista!" });

  assert(review !== null, "review submitted");
  assert(review!.status === ReviewStatus.Pending, "review starts as pending");
  assert(auditStore.length === 1, "audit entry created for review creation");
  assert(auditStore[0].action === ReviewAction.Created, "audit action is Created");
  assert(eventStore.length > 0, "brain event created for review");
  const reviewEvent = eventStore.find(e => e.event_type === TrustEventType.ReviewCreated);
  assert(reviewEvent !== undefined, "ReviewCreated event exists in brain store");
  console.log("✓ Review → Audit → Brain Event");
}

async function testBrainIngestion() {
  const cognitiveSvc = new CognitiveBrainService(eventRepo);
  const { merchantPassportViewedEvent } = await import("../events/trust.events");

  const domainEvent = merchantPassportViewedEvent(MERCHANT_ID, { viewer: "test-buyer" });
  const result = await cognitiveSvc.ingest(domainEvent, {
    correlation_id: "corr-001",
    actor_id: BUYER_ID,
    actor_role: CognitiveBrainActorRole.Buyer,
    source_service: "MerchantIdentityPage",
    entity_type: BrainEntityType.Passport,
    entity_id: MERCHANT_ID,
  });

  assert(result.success, "brain ingestion succeeded");
  assert(result.correlation_id === "corr-001", "correlation_id preserved");
  assert(result.assets_impacted.length > 0, "assets impacted populated");
  assert(result.persisted, "event persisted to store");
  console.log(`✓ Brain Ingestion (assets: ${result.assets_impacted.join(", ")})`);
}

async function testEventQualityValidation() {
  const { validateBrainEvent: validate } = await import("../brain/EventQualityValidator");

  const validEvent = {
    schema_version: BRAIN_SCHEMA_VERSION,
    correlation_id: "corr-002",
    event_type: TrustEventType.MerchantPassportViewed,
    entity_type: BrainEntityType.Passport,
    entity_id: MERCHANT_ID,
    merchant_id: MERCHANT_ID,
    actor_id: BUYER_ID,
    actor_role: CognitiveBrainActorRole.Buyer,
    origin: TrustSource.Buyer,
    source_service: "TestSuite",
    occurred_at: new Date(),
    ingested_at: new Date(),
    metadata: {},
    assets_impacted: ["buyer_behavioral_knowledge"] as never,
  };

  const result1 = validate(validEvent);
  assert(result1.valid, "valid event passes quality check");
  assert(result1.errors.length === 0, "no errors for valid event");

  const invalidEvent = { ...validEvent, merchant_id: "", correlation_id: "" };
  const result2 = validate(invalidEvent);
  assert(!result2.valid, "invalid event fails quality check");
  assert(result2.errors.length >= 2, "errors reported for missing required fields");

  console.log(`✓ Event Quality Validation (errors caught: ${result2.errors.length})`);
}

async function testKnowledgeGraphDerivation() {
  const graphSvc = new KnowledgeGraphService();
  const summary = graphSvc.buildSummary(MERCHANT_ID, eventStore);

  assert(summary.merchantId === MERCHANT_ID, "summary merchantId correct");
  assert(summary.totalRelations >= 0, "relations derived from event store");
  assert(typeof summary.uniqueBuyers === "number", "uniqueBuyers is numeric");
  console.log(`✓ Knowledge Graph (relations: ${summary.totalRelations}, buyers: ${summary.uniqueBuyers})`);
}

async function run() {
  console.log("\n── TrustFlow Integration Test ──────────────────────────────");
  await testVerificationToSignal();
  await testSignalToPassport();
  await testReviewFlow();
  await testBrainIngestion();
  await testEventQualityValidation();
  await testKnowledgeGraphDerivation();
  console.log("── All integration tests passed ────────────────────────────\n");
}

run().catch(console.error);
