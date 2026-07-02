import { TrustEventType } from "../../types/enums";
import { getBrainImpact } from "../event-registry";

// Scoped to Wave 4's own new event types, not a full-registry completeness
// sweep — a broader audit surfaced 21 pre-existing event types (Release 1.6
// analytics/catalog-intelligence/growth) with no TRUST_EVENT_BRAIN_IMPACT
// entry at all. That's real, but unrelated to this Wave; tracked in
// docs/engineering/TECH_DEBT.md instead of silently expanded into this
// Wave's scope or asserted here (which would fail the Quality Gate for a
// reason this Wave didn't cause).
describe("TRUST_EVENT_BRAIN_IMPACT registry — Wave 4 events", () => {
  it("maps every Wave 4 event to at least one BrainAsset", () => {
    const wave4Events = [
      TrustEventType.CanonicalProductCreated,
      TrustEventType.OfferLinked,
      TrustEventType.OfferUnlinked,
      TrustEventType.MergeSuggested,
      TrustEventType.MergeApproved,
      TrustEventType.MergeRejected,
      TrustEventType.CanonicalViewed,
      TrustEventType.CompareViewed,
      TrustEventType.PriceHistoryViewed,
      TrustEventType.LowestPriceReached,
    ];

    for (const eventType of wave4Events) {
      expect(getBrainImpact(eventType).length).toBeGreaterThan(0);
    }
  });
});

describe("TRUST_EVENT_BRAIN_IMPACT registry — Wave 5 events", () => {
  it("maps every Wave 5 (Merchant Acquisition & Ownership) event to at least one BrainAsset", () => {
    const wave5Events = [
      TrustEventType.ClaimRequested,
      TrustEventType.ClaimCancelled,
      TrustEventType.OwnershipVerified,
      TrustEventType.OwnershipRejected,
      TrustEventType.OwnershipRevoked,
      TrustEventType.ManagerInvited,
      TrustEventType.ManagerAccepted,
      TrustEventType.PremiumTrialStarted,
      TrustEventType.PremiumUpgradeViewed,
      TrustEventType.PremiumActivated,
    ];

    for (const eventType of wave5Events) {
      expect(getBrainImpact(eventType).length).toBeGreaterThan(0);
    }
  });
});
