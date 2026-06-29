/**
 * Trust types — compile-time correctness tests.
 * Type-checked by tsc. Run with: npx ts-node src/domains/trust/tests/types.test.ts
 */
import {
  TrustStatus,
  TrustBadge,
  VerificationType,
  VerificationStatus,
  TrustEventType,
  TrustSource,
  TrustReason,
  BrainAsset,
} from "../types/enums";
import type { MerchantTrustRecord, TrustEventRecord } from "../types/trust.types";

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`FAIL: ${msg}`);
}

function run() {
  // Helper: cast to string[] for literal includes checks
  const s = <T>(arr: T[]) => arr as string[];

  // TrustStatus
  const trustStatuses = Object.values(TrustStatus);
  assert(s(trustStatuses).includes("unverified"), "TrustStatus has unverified");
  assert(s(trustStatuses).includes("pending"), "TrustStatus has pending");
  assert(s(trustStatuses).includes("verified"), "TrustStatus has verified");
  assert(s(trustStatuses).includes("suspended"), "TrustStatus has suspended");
  assert(s(trustStatuses).includes("rejected"), "TrustStatus has rejected");
  assert(trustStatuses.length === 5, "TrustStatus has exactly 5 values");
  console.log("✓ TrustStatus enum");

  // TrustBadge
  const badges = Object.values(TrustBadge);
  assert(s(badges).includes("none"), "TrustBadge has none");
  assert(s(badges).includes("basic"), "TrustBadge has basic");
  assert(s(badges).includes("verified"), "TrustBadge has verified");
  assert(s(badges).includes("premium"), "TrustBadge has premium");
  assert(badges.length === 4, "TrustBadge has exactly 4 values");
  console.log("✓ TrustBadge enum");

  // TrustEventType — Sprint 1.5.1 + 1.5.2 events
  const events = Object.values(TrustEventType);
  assert(events.includes(TrustEventType.MerchantViewed), "has MerchantViewed");
  assert(events.includes(TrustEventType.VerificationRevoked), "has VerificationRevoked (1.5.2)");
  assert(events.includes(TrustEventType.EvidenceAdded), "has EvidenceAdded (1.5.2)");
  assert(events.includes(TrustEventType.EvidenceRemoved), "has EvidenceRemoved (1.5.2)");
  assert(events.includes(TrustEventType.VerificationViewed), "has VerificationViewed (1.5.2)");
  console.log("✓ TrustEventType enum (Sprint 1.5.1 + 1.5.2)");

  // BrainAsset
  const assets = Object.values(BrainAsset);
  assert(assets.includes(BrainAsset.HistoricalData), "has HistoricalData");
  assert(assets.includes(BrainAsset.MerchantTrust), "has MerchantTrust");
  assert(assets.includes(BrainAsset.KnowledgeGraph), "has KnowledgeGraph");
  assert(assets.includes(BrainAsset.BuyerBehavioralKnowledge), "has BuyerBehavioralKnowledge");
  assert(assets.length === 4, "BrainAsset has exactly 4 values");
  console.log("✓ BrainAsset enum");

  // VerificationType — Sprint 1.5.1 (7) + Sprint 1.5.2 (8) = 15 total
  const types = Object.values(VerificationType);
  assert(s(types).includes("document"), "has document (1.5.1)");
  assert(s(types).includes("manual"), "has manual (1.5.1)");
  assert(s(types).includes("identity"), "has identity (1.5.2)");
  assert(s(types).includes("company"), "has company (1.5.2)");
  assert(s(types).includes("partner"), "has partner (1.5.2)");
  assert(types.length === 15, "VerificationType has exactly 15 values (7 legacy + 8 new)");
  console.log("✓ VerificationType enum (15 values)");

  // VerificationStatus — Sprint 1.5.2 adds 'revoked'
  const statuses = Object.values(VerificationStatus);
  assert(s(statuses).includes("pending"), "has pending");
  assert(s(statuses).includes("approved"), "has approved");
  assert(s(statuses).includes("rejected"), "has rejected");
  assert(s(statuses).includes("expired"), "has expired");
  assert(s(statuses).includes("revoked"), "has revoked (1.5.2)");
  assert(statuses.length === 5, "VerificationStatus has exactly 5 values");
  console.log("✓ VerificationStatus enum (5 values including revoked)");

  // Type shapes — compile-time check
  const record: MerchantTrustRecord = {
    id: "abc-123",
    merchant_id: "merchant-456",
    trust_score: 0,
    status: TrustStatus.Unverified,
    badge_level: TrustBadge.None,
    last_verified_at: null,
    last_event_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  assert(record.trust_score === 0, "MerchantTrustRecord shape is valid");
  console.log("✓ MerchantTrustRecord type shape");

  const event: TrustEventRecord = {
    id: "evt-001",
    merchant_id: "merchant-456",
    merchant_trust_id: null,
    event_type: TrustEventType.MerchantViewed,
    source: TrustSource.Buyer,
    reason: null,
    delta: 0,
    score_before: null,
    score_after: null,
    metadata: {},
    created_at: new Date().toISOString(),
    created_by: null,
  };
  assert(event.delta === 0, "TrustEventRecord type shape is valid");
  console.log("✓ TrustEventRecord type shape");

  // Enum sizes
  assert(Object.values(TrustSource).length === 5, "TrustSource has 5 values");
  assert(Object.values(TrustReason).length === 7, "TrustReason has 7 values");
  console.log("✓ TrustSource and TrustReason sizes");

  console.log("\n✅ All type tests passed\n");
}

run();
