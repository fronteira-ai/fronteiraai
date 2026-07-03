import { KnowledgeGraphService } from "../brain/KnowledgeGraphService";
import { TrustEventType, TrustSource, BrainEntityType, GraphRelationType } from "../types/enums";
import type { TrustEventRecord } from "../types/trust.types";

function makeEvent(overrides: Partial<TrustEventRecord> = {}): TrustEventRecord {
  return {
    id: "evt-1",
    merchant_id: "merchant-1",
    merchant_trust_id: null,
    event_type: TrustEventType.MerchantViewed,
    source: TrustSource.Buyer,
    reason: null,
    delta: 0,
    score_before: null,
    score_after: null,
    metadata: {},
    created_at: "2026-07-02T12:00:00.000Z",
    created_by: null,
    ...overrides,
  };
}

// Release 1.8, Program 0 Wave 0: buyer-sourced events never populate
// created_by (FK to profiles(id); buyers are never profiles rows). The
// pseudonymous id travels in metadata.buyer_pseudonym instead — these tests
// exist because that source (not created_by) is what real buyer_events
// bridged through BuyerEventBrainBridgeService will always carry.
describe("KnowledgeGraphService — buyer_pseudonym-sourced relations", () => {
  const service = new KnowledgeGraphService();

  it("derives BuyerViewed from TrustEventType.MerchantViewed using metadata.buyer_pseudonym", () => {
    const event = makeEvent({
      event_type: TrustEventType.MerchantViewed,
      metadata: { buyer_pseudonym: "anon-abc" },
    });

    const relations = service.deriveRelations([event]);

    expect(relations).toHaveLength(1);
    expect(relations[0]).toMatchObject({
      from_type: BrainEntityType.Buyer,
      from_id: "anon-abc",
      relation_type: GraphRelationType.BuyerViewed,
      to_type: BrainEntityType.Merchant,
      to_id: "merchant-1",
    });
  });

  it("derives no relation when neither buyer_pseudonym nor created_by is present", () => {
    const event = makeEvent({ event_type: TrustEventType.MerchantViewed, metadata: {} });
    expect(service.deriveRelations([event])).toHaveLength(0);
  });

  it("falls back to created_by when buyer_pseudonym is absent (the pre-existing, staff-originated path)", () => {
    const event = makeEvent({
      event_type: TrustEventType.MerchantPassportViewed,
      created_by: "profile-staff-1",
      metadata: {},
    });

    const relations = service.deriveRelations([event]);

    expect(relations[0].from_id).toBe("profile-staff-1");
  });

  it("derives BuyerContactedVia from MerchantContactClicked with contact_channel in metadata (bridge-consolidated whatsapp/phone/website)", () => {
    const event = makeEvent({
      event_type: TrustEventType.MerchantContactClicked,
      metadata: { buyer_pseudonym: "anon-xyz", contact_channel: "whatsapp" },
    });

    const relations = service.deriveRelations([event]);

    expect(relations[0]).toMatchObject({
      from_type: BrainEntityType.Buyer,
      from_id: "anon-xyz",
      relation_type: GraphRelationType.BuyerContactedVia,
      to_type: BrainEntityType.Merchant,
      to_id: "merchant-1",
    });
  });

  it("buildSummary counts a bridged MerchantViewed event as one unique buyer", () => {
    const event = makeEvent({ metadata: { buyer_pseudonym: "anon-abc" } });
    const summary = service.buildSummary("merchant-1", [event]);
    expect(summary.uniqueBuyers).toBe(1);
    expect(summary.totalRelations).toBe(1);
  });
});
