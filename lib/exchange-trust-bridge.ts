import { TrustEventType, TrustSource, BrainAsset } from "@/src/domains/trust/types/enums";
import type { TrustDomainEvent } from "@/src/domains/trust/events/trust.events";
import type { CreateTrustEventInput } from "@/src/domains/trust/repositories/ITrustEventRepository";

// Release 1.8 — Program A — Wave 1. StoreRateReactionFast/Slow have a real
// merchantId (a specific store's reaction lag vs. the marketplace median)
// and get real factory functions + real emission — but this file lives in
// lib/, NOT inside src/domains/exchange/, because the exchange domain must
// never import trust (Epic 1's rule: "jamais depender de outros domínios").
// This bridge is application-layer wiring, same role as
// src/domains/merchant-analytics/services/BuyerEventBrainBridgeService.ts
// plays for buyer_events → Brain, except merchant-analytics is allowed to
// depend on trust directly and exchange isn't — so the bridge moves up a
// layer instead of living inside the domain.
export function storeRateReactionFastEvent(merchantId: string, storeId: string, lagHours: number): TrustDomainEvent {
  return {
    eventType: TrustEventType.StoreRateReactionFast,
    merchantId,
    source: TrustSource.System,
    occurredAt: new Date(),
    metadata: { store_id: storeId, lag_hours: lagHours },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}

export function storeRateReactionSlowEvent(merchantId: string, storeId: string, lagHours: number): TrustDomainEvent {
  return {
    eventType: TrustEventType.StoreRateReactionSlow,
    merchantId,
    source: TrustSource.System,
    occurredAt: new Date(),
    metadata: { store_id: storeId, lag_hours: lagHours },
    brainAssets: [BrainAsset.HistoricalData],
  };
}

export function toCreateEventInput(event: TrustDomainEvent): CreateTrustEventInput {
  return {
    merchant_id: event.merchantId,
    event_type: event.eventType,
    source: event.source,
    metadata: event.metadata,
  };
}
