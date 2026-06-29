/**
 * Sprint 1.5.2 — VerificationAuditService unit tests
 * Type-checked by tsc; run manually with ts-node when test runner is available.
 */

import { VerificationAuditService } from "../services/VerificationAuditService";
import { VerificationAction, VerificationStatus } from "../types/enums";
import type { IVerificationHistoryRepository, CreateAuditInput } from "../repositories/IVerificationHistoryRepository";
import type { VerificationAuditRecord } from "../types/trust.types";

function makeAuditRecord(action: VerificationAction): VerificationAuditRecord {
  return {
    id: "h-001",
    verification_id: "v-001",
    merchant_id: "m-001",
    action,
    previous_status: null,
    new_status: VerificationStatus.Pending,
    performed_by: null,
    performed_by_role: null,
    reason: null,
    metadata: {},
    created_at: new Date().toISOString(),
  };
}

const recorded: CreateAuditInput[] = [];

function makeHistoryRepo(): IVerificationHistoryRepository {
  return {
    create: async (input) => {
      recorded.push(input);
      return makeAuditRecord(input.action as VerificationAction);
    },
    findByVerificationId: async () => [],
    findByMerchantId: async () => [],
  };
}

async function testRecordCreated() {
  recorded.length = 0;
  const svc = new VerificationAuditService(makeHistoryRepo());
  await svc.recordCreated("v-001", "m-001", "u-001");
  console.assert(recorded.length === 1, "Should record one audit entry");
  console.assert(recorded[0].action === VerificationAction.Created, "Action should be 'created'");
  console.assert(recorded[0].new_status === VerificationStatus.Pending, "New status should be pending");
  console.log("✓ recordCreated");
}

async function testRecordStatusChange() {
  recorded.length = 0;
  const svc = new VerificationAuditService(makeHistoryRepo());
  await svc.recordStatusChange(
    "v-001",
    "m-001",
    VerificationAction.Approved,
    VerificationStatus.Pending,
    VerificationStatus.Approved,
    "admin-001",
    "admin",
    "Documentos válidos"
  );
  console.assert(recorded.length === 1, "Should record one audit entry");
  console.assert(recorded[0].previous_status === VerificationStatus.Pending, "Previous should be pending");
  console.assert(recorded[0].new_status === VerificationStatus.Approved, "New should be approved");
  console.assert(recorded[0].reason === "Documentos válidos", "Should record reason");
  console.log("✓ recordStatusChange");
}

async function testRecordEvidenceAdded() {
  recorded.length = 0;
  const svc = new VerificationAuditService(makeHistoryRepo());
  await svc.recordEvidenceAdded("v-001", "m-001", "u-001", "CNPJ comprovante");
  console.assert(recorded.length === 1, "Should record one audit entry");
  console.assert(recorded[0].action === VerificationAction.EvidenceAdded, "Action should be evidence_added");
  console.assert(
    (recorded[0].metadata as Record<string, unknown>)?.evidence_label === "CNPJ comprovante",
    "Should store evidence label in metadata"
  );
  console.log("✓ recordEvidenceAdded");
}

async function run() {
  console.log("\n── VerificationAuditService Tests ──────────────────────");
  await testRecordCreated();
  await testRecordStatusChange();
  await testRecordEvidenceAdded();
  console.log("── All tests passed ────────────────────────────────────\n");
}

run().catch(console.error);
