/**
 * ReviewService — assertion-based tests (no test runner required).
 * Type-checked by tsc. Run with: npx ts-node src/domains/trust/tests/ReviewService.test.ts
 */
import { ReviewService } from "../services/ReviewService";
import { ReviewStatus, ReviewAction, TrustEventType } from "../types/enums";
import type { MerchantReviewRecord, ReviewAuditRecord, ReviewStats, PaginatedResult } from "../types/trust.types";
import type { IMerchantReviewRepository } from "../repositories/IMerchantReviewRepository";
import type { IReviewAuditRepository } from "../repositories/IReviewAuditRepository";
import type { ITrustEventRepository, CreateTrustEventInput } from "../repositories/ITrustEventRepository";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

const baseReview: MerchantReviewRecord = {
  id: "review-001",
  merchant_id: "merchant-001",
  reviewer_id: "buyer-001",
  rating: 4,
  title: "Boa experiência",
  body: "Produto chegou rápido e bem embalado.",
  status: ReviewStatus.Pending,
  is_verified_purchase: false,
  purchase_ref: null,
  merchant_reply: null,
  merchant_reply_at: null,
  edited_at: null,
  edit_count: 0,
  helpful_count: 0,
  report_count: 0,
  metadata: {},
  created_at: new Date().toISOString(),
  deleted_at: null,
};

const emptyPage: PaginatedResult<MerchantReviewRecord> = {
  data: [], total: 0, page: 1, perPage: 10, totalPages: 0,
};

const emptyStats: ReviewStats = {
  total: 0, average: null, distribution: {}, approvedCount: 0,
};

const recordedAudits: ReviewAuditRecord[] = [];
const recordedEvents: Array<{ event_type: TrustEventType }> = [];

function makeReviewRepo(
  existing: MerchantReviewRecord | null = null,
  findByReviewerResult: MerchantReviewRecord | null = null
): IMerchantReviewRepository & { _created: number; _updated: number } {
  const state = { _created: 0, _updated: 0 };
  return {
    ...state,
    findByMerchantId: async () => emptyPage,
    findById: async () => existing,
    findByReviewerAndMerchant: async () => findByReviewerResult,
    create: async (input) => {
      state._created++;
      return { ...baseReview, ...input, id: "review-new" };
    },
    update: async (id, patch) => {
      state._updated++;
      return { ...baseReview, ...patch };
    },
    softDelete: async () => true,
    updateStatus: async (id, status) => ({ ...baseReview, status }),
    incrementHelpful: async () => undefined,
    incrementReports: async () => undefined,
    getStats: async () => emptyStats,
  };
}

function makeAuditRepo(): IReviewAuditRepository {
  return {
    findByReviewId: async () => [],
    findByMerchantId: async () => [],
    create: async (input) => {
      const record = { ...input, id: `audit-${recordedAudits.length}`, created_at: new Date().toISOString() } as ReviewAuditRecord;
      recordedAudits.push(record);
      return record;
    },
  };
}

function makeEventRepo(): ITrustEventRepository {
  return {
    findByMerchantId: async () => [],
    findByType: async () => [],
    create: async (input: CreateTrustEventInput) => {
      recordedEvents.push({ event_type: input.event_type });
      return null;
    },
  };
}

async function testSubmitReview() {
  recordedAudits.length = 0;
  recordedEvents.length = 0;
  const repo = makeReviewRepo(null, null);
  const svc = new ReviewService(repo, makeAuditRepo(), makeEventRepo());

  const result = await svc.submitReview("merchant-001", "buyer-001", { rating: 4, body: "Ótima experiência!", title: "Bom" });
  assert(result !== null, "submitReview returns review");
  assert(repo._created === 1, "creates review");
  assert(recordedAudits.length === 1, "creates audit entry");
  assert(recordedAudits[0].action === ReviewAction.Created, "audit action is Created");
  assert(recordedEvents.length === 1, "emits brain event");
  assert(recordedEvents[0].event_type === TrustEventType.ReviewCreated, "brain event is ReviewCreated");
  console.log("✓ submitReview");
}

async function testSubmitReviewDuplicate() {
  const repo = makeReviewRepo(null, baseReview);
  const svc = new ReviewService(repo, makeAuditRepo(), makeEventRepo());

  const result = await svc.submitReview("merchant-001", "buyer-001", { rating: 3, body: "Segunda tentativa" });
  assert(result === null, "returns null for duplicate review");
  console.log("✓ submitReview (blocks duplicate)");
}

async function testEditReview() {
  recordedAudits.length = 0;
  const approvedReview = { ...baseReview, status: ReviewStatus.Approved };
  const repo = makeReviewRepo(approvedReview);
  const svc = new ReviewService(repo, makeAuditRepo(), makeEventRepo());

  const result = await svc.editReview("review-001", "buyer-001", { body: "Atualizado após experiência maior." });
  assert(result !== null, "editReview returns updated review");
  assert(recordedAudits.length === 1, "creates audit entry");
  assert(recordedAudits[0].action === ReviewAction.Edited, "audit action is Edited");
  console.log("✓ editReview");
}

async function testEditReviewWrongOwner() {
  const repo = makeReviewRepo(baseReview);
  const svc = new ReviewService(repo, makeAuditRepo(), makeEventRepo());

  const result = await svc.editReview("review-001", "other-buyer", { body: "Tentativa indevida" });
  assert(result === null, "returns null when not owner");
  console.log("✓ editReview (blocks wrong owner)");
}

async function testSoftDelete() {
  const repo = makeReviewRepo(baseReview);
  const svc = new ReviewService(repo, makeAuditRepo(), makeEventRepo());

  const result = await svc.softDeleteReview("review-001", "buyer-001");
  assert(result === true, "softDeleteReview returns true");
  console.log("✓ softDeleteReview");
}

async function testSoftDeleteWrongOwner() {
  const repo = makeReviewRepo(baseReview);
  const svc = new ReviewService(repo, makeAuditRepo(), makeEventRepo());

  const result = await svc.softDeleteReview("review-001", "wrong-buyer");
  assert(result === false, "softDeleteReview returns false for wrong owner");
  console.log("✓ softDeleteReview (blocks wrong owner)");
}

async function testAddMerchantReply() {
  const approvedReview = { ...baseReview, status: ReviewStatus.Approved };
  const repo = makeReviewRepo(approvedReview);
  const svc = new ReviewService(repo, makeAuditRepo(), makeEventRepo());

  const result = await svc.addMerchantReply("review-001", "merchant-user", "Obrigado pelo feedback!");
  assert(result !== null, "addMerchantReply returns updated review");
  console.log("✓ addMerchantReply");
}

async function testAddMerchantReplyOnPending() {
  const repo = makeReviewRepo(baseReview);
  const svc = new ReviewService(repo, makeAuditRepo(), makeEventRepo());

  const result = await svc.addMerchantReply("review-001", "merchant-user", "Obrigado!");
  assert(result === null, "cannot reply to pending review");
  console.log("✓ addMerchantReply (blocks pending review)");
}

async function run() {
  console.log("\n── ReviewService Tests ─────────────────────────────────");
  await testSubmitReview();
  await testSubmitReviewDuplicate();
  await testEditReview();
  await testEditReviewWrongOwner();
  await testSoftDelete();
  await testSoftDeleteWrongOwner();
  await testAddMerchantReply();
  await testAddMerchantReplyOnPending();
  console.log("── All tests passed ────────────────────────────────────\n");
}

run().catch(console.error);
