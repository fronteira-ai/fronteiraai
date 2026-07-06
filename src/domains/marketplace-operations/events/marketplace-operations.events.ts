import { TrustEventType, TrustSource, BrainAsset } from "@/src/domains/trust/types/enums";
import type { TrustDomainEvent } from "@/src/domains/trust/events/trust.events";

// Release 1.8 — Program 0 — Wave 1. MerchantPriorityTierChanged has a real
// merchantId (store-scoped) and is the only event from this Wave with a
// factory function — the other four (MarketplaceHealthScoreChanged,
// ConnectorHealthDegraded, MarketplaceAlertRaised,
// MarketplaceCoverageSnapshotTaken) are taxonomy-only in trust/types/enums.ts,
// same discipline as StoreDiscovered (Wave 2).
//
// NOT WIRED THIS WAVE: detecting a real tier change requires knowing the
// previous tier, and MerchantPriorityService is deliberately compute-on-read
// with no snapshot table (see its doc comment) — there is nothing to compare
// against yet. This factory exists so the plumbing is ready, same posture as
// Product Identity Engine's Shadow Mode (Release 1.7 — Wave 3): explainability
// ready, emission deferred until a future Wave adds tier-change tracking.
// Documented in docs/engineering/TECH_DEBT.md, not silently wired to a
// fabricated "previous tier".
export function merchantPriorityTierChangedEvent(
  merchantId: string,
  storeId: string,
  previousTier: string,
  newTier: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantPriorityTierChanged,
    merchantId,
    source: TrustSource.System,
    occurredAt: new Date(),
    metadata: { store_id: storeId, previous_tier: previousTier, new_tier: newTier },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}
