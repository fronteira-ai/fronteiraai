/**
 * TrustService — assertion-based tests (no test runner required).
 * Type-checked by tsc. Run with: npx ts-node src/domains/trust/tests/TrustService.test.ts
 */
import { TrustService } from "../services/TrustService";
import { TrustStatus, TrustBadge, TrustSource, TrustEventType } from "../types/enums";
import type { MerchantTrustRecord, PaginatedResult } from "../types/trust.types";
import type { ITrustRepository } from "../repositories/ITrustRepository";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

const mockTrustRecord: MerchantTrustRecord = {
  id: "trust-001",
  merchant_id: "merchant-001",
  trust_score: 0,
  status: TrustStatus.Unverified,
  badge_level: TrustBadge.None,
  last_verified_at: null,
  last_event_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const emptyPage: PaginatedResult<MerchantTrustRecord> = {
  data: [],
  total: 0,
  page: 1,
  perPage: 20,
  totalPages: 0,
};

function makeTrustRepo(
  findResult: MerchantTrustRecord | null = null,
  updatedResult?: MerchantTrustRecord
): ITrustRepository & { _created: number; _updated: number } {
  const state = { _created: 0, _updated: 0 };
  return {
    ...state,
    findByMerchantId: async () => findResult,
    findAll: async () => emptyPage,
    create: async () => { state._created++; return mockTrustRecord; },
    updateStatus: async () => { state._updated++; return updatedResult ?? { ...mockTrustRecord, status: TrustStatus.Verified }; },
    updateBadge: async () => ({ ...mockTrustRecord, badge_level: TrustBadge.Verified }),
    touch: async () => undefined,
  };
}

const recordedEvents: Array<{ event_type: TrustEventType }> = [];

function makeEventRepo(): ITrustEventRepository {
  return {
    findByMerchantId: async () => [],
    findByType: async () => [],
    create: async (input) => {
      recordedEvents.push({ event_type: input.event_type });
      return null;
    },
  };
}

async function testGetMerchantTrust() {
  const repo = makeTrustRepo(mockTrustRecord);
  const svc = new TrustService(repo, makeEventRepo());
  const result = await svc.getMerchantTrust("merchant-001");
  assert(result?.merchant_id === "merchant-001", "getMerchantTrust returns correct record");
  console.log("✓ getMerchantTrust");
}

async function testGetMerchantTrustNull() {
  const repo = makeTrustRepo(null);
  const svc = new TrustService(repo, makeEventRepo());
  const result = await svc.getMerchantTrust("unknown");
  assert(result === null, "getMerchantTrust returns null when no record");
  console.log("✓ getMerchantTrust (null path)");
}

async function testInitializeMerchantTrust() {
  const repo = makeTrustRepo(null);
  const svc = new TrustService(repo, makeEventRepo());
  const result = await svc.initializeMerchantTrust("merchant-001");
  assert(repo._created === 1, "creates trust record");
  assert(result !== null, "returns created record");
  console.log("✓ initializeMerchantTrust (creates new)");
}

async function testInitializeMerchantTrustExisting() {
  const repo = makeTrustRepo(mockTrustRecord);
  const svc = new TrustService(repo, makeEventRepo());
  await svc.initializeMerchantTrust("merchant-001");
  assert(repo._created === 0, "does not create duplicate");
  console.log("✓ initializeMerchantTrust (skips existing)");
}

async function testUpdateTrustStatusNoRecord() {
  const repo = makeTrustRepo(null);
  const svc = new TrustService(repo, makeEventRepo());
  const result = await svc.updateTrustStatus("merchant-001", TrustStatus.Verified, TrustSource.Admin);
  assert(result === null, "returns null when no record exists");
  console.log("✓ updateTrustStatus (no record → null)");
}

async function testUpdateTrustStatusWithRecord() {
  const repo = makeTrustRepo(mockTrustRecord);
  recordedEvents.length = 0;
  const svc = new TrustService(repo, makeEventRepo());
  const result = await svc.updateTrustStatus("merchant-001", TrustStatus.Verified, TrustSource.Admin, "admin-001");
  assert(repo._updated === 1, "calls updateStatus");
  assert(result?.status === TrustStatus.Verified, "returns updated record");
  console.log("✓ updateTrustStatus (updates record)");
}

async function testGetOrInitializeExisting() {
  const repo = makeTrustRepo(mockTrustRecord);
  const svc = new TrustService(repo, makeEventRepo());
  const result = await svc.getOrInitialize("merchant-001");
  assert(repo._created === 0, "does not create when record exists");
  assert(result !== null, "returns existing record");
  console.log("✓ getOrInitialize (existing)");
}

async function testGetOrInitializeNew() {
  const repo = makeTrustRepo(null);
  const svc = new TrustService(repo, makeEventRepo());
  const result = await svc.getOrInitialize("merchant-001");
  assert(repo._created === 1, "creates new record");
  assert(result !== null, "returns new record");
  console.log("✓ getOrInitialize (new)");
}

async function run() {
  console.log("\n── TrustService Tests ──────────────────────────────────");
  await testGetMerchantTrust();
  await testGetMerchantTrustNull();
  await testInitializeMerchantTrust();
  await testInitializeMerchantTrustExisting();
  await testUpdateTrustStatusNoRecord();
  await testUpdateTrustStatusWithRecord();
  await testGetOrInitializeExisting();
  await testGetOrInitializeNew();
  console.log("── All tests passed ────────────────────────────────────\n");
}

run().catch(console.error);
