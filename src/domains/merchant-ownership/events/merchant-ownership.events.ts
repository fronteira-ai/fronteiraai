import { TrustEventType, TrustSource, BrainAsset } from "@/src/domains/trust/types/enums";
import type { TrustDomainEvent } from "@/src/domains/trust/events/trust.events";
import type { CreateTrustEventInput } from "@/src/domains/trust/repositories/ITrustEventRepository";

// Release 1.7 — Wave 5. Unlike prior Waves' system/admin-level events, a
// claim/delegate/upgrade-interest action always happens inside a merchant
// context — TrustDomainEvent.merchantId (a required string) is always
// available here, so these get real factory functions and real emission,
// not taxonomy-only placeholders. Only PremiumTrialStarted/PremiumActivated
// stay taxonomy-only (types/enums.ts) — no trial/billing mechanism exists
// this Wave to trigger them from honestly.

export function toCreateEventInput(event: TrustDomainEvent): CreateTrustEventInput {
  return {
    merchant_id: event.merchantId,
    event_type: event.eventType,
    source: event.source,
    metadata: event.metadata,
  };
}

export function claimRequestedEvent(merchantId: string, storeId: string, claimId: string): TrustDomainEvent {
  return {
    eventType: TrustEventType.ClaimRequested,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { store_id: storeId, claim_id: claimId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.KnowledgeGraph],
  };
}

export function claimCancelledEvent(merchantId: string, claimId: string): TrustDomainEvent {
  return {
    eventType: TrustEventType.ClaimCancelled,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { claim_id: claimId },
    brainAssets: [BrainAsset.MerchantTrust],
  };
}

export function ownershipVerifiedEvent(
  merchantId: string,
  storeId: string,
  claimId: string,
  autoApproved: boolean
): TrustDomainEvent {
  return {
    eventType: TrustEventType.OwnershipVerified,
    merchantId,
    source: autoApproved ? TrustSource.System : TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { store_id: storeId, claim_id: claimId, auto_approved: autoApproved },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.KnowledgeGraph],
  };
}

export function ownershipRejectedEvent(merchantId: string, claimId: string, reason: string): TrustDomainEvent {
  return {
    eventType: TrustEventType.OwnershipRejected,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { claim_id: claimId, reason },
    brainAssets: [BrainAsset.MerchantTrust],
  };
}

export function ownershipRevokedEvent(merchantId: string, storeId: string, reason: string): TrustDomainEvent {
  return {
    eventType: TrustEventType.OwnershipRevoked,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { store_id: storeId, reason },
    brainAssets: [BrainAsset.MerchantTrust],
  };
}

export function managerInvitedEvent(merchantId: string, delegateId: string, role: string): TrustDomainEvent {
  return {
    eventType: TrustEventType.ManagerInvited,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { delegate_id: delegateId, role },
    brainAssets: [BrainAsset.MerchantTrust],
  };
}

export function managerAcceptedEvent(merchantId: string, delegateId: string): TrustDomainEvent {
  return {
    eventType: TrustEventType.ManagerAccepted,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { delegate_id: delegateId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.KnowledgeGraph],
  };
}

export function premiumUpgradeViewedEvent(merchantId: string, triggerContext: string): TrustDomainEvent {
  return {
    eventType: TrustEventType.PremiumUpgradeViewed,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { trigger_context: triggerContext },
    brainAssets: [BrainAsset.RecommendationKnowledge],
  };
}
