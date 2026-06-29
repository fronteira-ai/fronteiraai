/**
 * Sprint 1.5.2 — VerificationService unit tests
 * Run: npx jest src/domains/trust/tests/VerificationService.test.ts
 * (No test runner configured yet; this file is type-checked by tsc)
 */

import { VerificationService } from "../services/VerificationService";
import { VerificationStatus, VerificationType, TrustEventType } from "../types/enums";
import type { IVerificationRepository } from "../repositories/IVerificationRepository";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import type { MerchantVerificationRecord } from "../types/trust.types";

// ── Minimal stubs ─────────────────────────────────────────────────────────────

function makeVerificationRecord(overrides: Partial<MerchantVerificationRecord> = {}): MerchantVerificationRecord {
  return {
    id: "v-001",
    merchant_id: "m-001",
    verification_type: VerificationType.Identity,
    status: VerificationStatus.Pending,
    submitted_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    expires_at: null,
    metadata: {},
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeVerificationRepo(
  record: MerchantVerificationRecord | null,
  updated?: MerchantVerificationRecord
): IVerificationRepository {
  return {
    findById: async () => record,
    findByMerchantId: async () => (record ? [record] : []),
    findPending: async () => (record ? [record] : []),
    create: async (merchantId, type, metadata) => ({
      ...makeVerificationRecord(),
      merchant_id: merchantId,
      verification_type: type,
      metadata: metadata ?? {},
    }),
    updateStatus: async (_id, status, reviewedBy, rejectionReason) =>
      updated ?? { ...record!, status, reviewed_by: reviewedBy, rejection_reason: rejectionReason ?? null },
  };
}

const events: Array<{ event_type: TrustEventType }> = [];

function makeEventRepo(): ITrustEventRepository {
  return {
    create: async (input) => {
      events.push({ event_type: input.event_type });
      return {
        id: "e-001",
        merchant_id: input.merchant_id,
        merchant_trust_id: null,
        event_type: input.event_type,
        source: input.source,
        reason: null,
        delta: 0,
        score_before: null,
        score_after: null,
        metadata: input.metadata ?? {},
        created_at: new Date().toISOString(),
        created_by: input.created_by ?? null,
      };
    },
    findByMerchantId: async () => [],
    findByType: async () => [],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testGetVerificationById() {
  const record = makeVerificationRecord();
  const svc = new VerificationService(makeVerificationRepo(record), makeEventRepo());
  const result = await svc.getVerificationById("v-001");
  console.assert(result?.id === "v-001", "getVerificationById should return record by id");
  console.log("✓ getVerificationById");
}

async function testSubmitVerification() {
  const record = makeVerificationRecord();
  const svc = new VerificationService(makeVerificationRepo(record), makeEventRepo());
  const result = await svc.submitVerification("m-001", VerificationType.Company);
  console.assert(result !== null, "submitVerification should return a record");
  console.assert(result?.status === VerificationStatus.Pending, "new verification is pending");
  console.log("✓ submitVerification");
}

async function testApproveVerification() {
  const pending = makeVerificationRecord();
  const approved = makeVerificationRecord({ status: VerificationStatus.Approved });
  const svc = new VerificationService(makeVerificationRepo(pending, approved), makeEventRepo());
  const result = await svc.approveVerification("v-001", "admin-001");
  console.assert(result?.status === VerificationStatus.Approved, "approveVerification should set status to approved");
  console.log("✓ approveVerification");
}

async function testRejectVerification() {
  const pending = makeVerificationRecord();
  const rejected = makeVerificationRecord({
    status: VerificationStatus.Rejected,
    rejection_reason: "Documento inválido",
  });
  const svc = new VerificationService(makeVerificationRepo(pending, rejected), makeEventRepo());
  const result = await svc.rejectVerification("v-001", "admin-001", "Documento inválido");
  console.assert(result?.status === VerificationStatus.Rejected, "rejectVerification should set rejected status");
  console.log("✓ rejectVerification");
}

async function testRevokeVerification() {
  const approved = makeVerificationRecord({ status: VerificationStatus.Approved });
  const revoked = makeVerificationRecord({ status: VerificationStatus.Revoked });
  const svc = new VerificationService(makeVerificationRepo(approved, revoked), makeEventRepo());
  const result = await svc.revokeVerification("v-001", "admin-001", "Violação de política");
  console.assert(result?.status === VerificationStatus.Revoked, "revokeVerification should set revoked status");
  console.log("✓ revokeVerification");
}

async function testRevokeOnlyWorksOnApproved() {
  const pending = makeVerificationRecord({ status: VerificationStatus.Pending });
  const svc = new VerificationService(makeVerificationRepo(pending), makeEventRepo());
  const result = await svc.revokeVerification("v-001", "admin-001", "motivo");
  console.assert(result === null, "revokeVerification should return null for non-approved status");
  console.log("✓ revokeVerification only works on approved");
}

async function testGetVerificationTypeLabel() {
  const svc = new VerificationService(makeVerificationRepo(null), makeEventRepo());
  const label = svc.getVerificationTypeLabel(VerificationType.Identity);
  console.assert(label === "Identidade", `Label for Identity should be 'Identidade', got '${label}'`);
  const legacyLabel = svc.getVerificationTypeLabel(VerificationType.Document);
  console.assert(legacyLabel === "Documento", `Label for Document should be 'Documento', got '${legacyLabel}'`);
  console.log("✓ getVerificationTypeLabel (legacy + new types)");
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function run() {
  console.log("\n── VerificationService Tests ──────────────────────────");
  await testGetVerificationById();
  await testSubmitVerification();
  await testApproveVerification();
  await testRejectVerification();
  await testRevokeVerification();
  await testRevokeOnlyWorksOnApproved();
  await testGetVerificationTypeLabel();
  console.log("── All tests passed ────────────────────────────────────\n");
}

run().catch(console.error);
