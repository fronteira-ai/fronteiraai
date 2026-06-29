import { TrustEventType, TrustSource, BrainAsset } from "../types/enums";

// ── Event shape ──────────────────────────────────────────────────────────────

export interface TrustDomainEvent {
  eventType: TrustEventType;
  merchantId: string;
  source: TrustSource;
  occurredAt: Date;
  metadata: Record<string, unknown>;
  brainAssets: BrainAsset[];
}

// ── Factory functions ────────────────────────────────────────────────────────

export function merchantViewedEvent(
  merchantId: string,
  metadata: Record<string, unknown> = {}
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantViewed,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata,
    brainAssets: [BrainAsset.KnowledgeGraph, BrainAsset.BuyerBehavioralKnowledge],
  };
}

export function merchantVerifiedEvent(
  merchantId: string,
  adminId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantVerified,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { admin_id: adminId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}

export function trustUpdatedEvent(
  merchantId: string,
  previousStatus: string,
  newStatus: string,
  source: TrustSource
): TrustDomainEvent {
  return {
    eventType: TrustEventType.TrustUpdated,
    merchantId,
    source,
    occurredAt: new Date(),
    metadata: { previous_status: previousStatus, new_status: newStatus },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}

export function badgeGrantedEvent(
  merchantId: string,
  badgeType: string,
  adminId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.BadgeGranted,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { badge_type: badgeType, admin_id: adminId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.KnowledgeGraph],
  };
}

export function badgeRemovedEvent(
  merchantId: string,
  badgeId: string,
  reason: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.BadgeRemoved,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { badge_id: badgeId, reason },
    brainAssets: [BrainAsset.MerchantTrust],
  };
}

export function reviewCreatedEvent(
  merchantId: string,
  reviewId: string,
  rating: number
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ReviewCreated,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { review_id: reviewId, rating },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.KnowledgeGraph, BrainAsset.BuyerBehavioralKnowledge],
  };
}

export function reviewUpdatedEvent(
  merchantId: string,
  reviewId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ReviewUpdated,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { review_id: reviewId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}

export function reviewModeratedEvent(
  merchantId: string,
  reviewId: string,
  action: string,
  adminId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ReviewModerated,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { review_id: reviewId, action, admin_id: adminId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}

export function reviewReportedEvent(
  merchantId: string,
  reviewId: string,
  reason: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ReviewReported,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { review_id: reviewId, reason },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.KnowledgeGraph],
  };
}

export function reviewHelpfulMarkedEvent(
  merchantId: string,
  reviewId: string,
  userId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ReviewHelpfulMarked,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { review_id: reviewId, user_id: userId },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.RecommendationKnowledge],
  };
}

export function merchantProfileViewedEvent(
  merchantId: string,
  viewerContext: Record<string, unknown> = {}
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantProfileViewed,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: viewerContext,
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.SearchIntelligence],
  };
}

export function trustSignalViewedEvent(
  merchantId: string,
  signalId: string,
  signalType: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.TrustSignalViewed,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { signal_id: signalId, signal_type: signalType },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.MerchantTrust],
  };
}

export function badgeClickedEvent(
  merchantId: string,
  badgeType: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.BadgeClicked,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { badge_type: badgeType },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.MerchantTrust],
  };
}

export function timelineViewedEvent(
  merchantId: string,
  viewerContext: Record<string, unknown> = {}
): TrustDomainEvent {
  return {
    eventType: TrustEventType.TimelineViewed,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: viewerContext,
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.HistoricalData],
  };
}

export function evidenceOpenedEvent(
  merchantId: string,
  verificationId: string,
  evidenceId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.EvidenceOpened,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { verification_id: verificationId, evidence_id: evidenceId },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.MerchantTrust],
  };
}

// ── Epic 3 — Merchant Identity Events ────────────────────────────────────────

export function merchantPassportViewedEvent(
  merchantId: string,
  viewerContext: Record<string, unknown> = {}
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantPassportViewed,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: viewerContext,
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.KnowledgeGraph, BrainAsset.SearchIntelligence],
  };
}

export function merchantFactExpandedEvent(
  merchantId: string,
  factKey: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantFactExpanded,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { fact_key: factKey },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.RecommendationKnowledge],
  };
}

export function merchantTimelineInteractionEvent(
  merchantId: string,
  eventId: string,
  interactionType: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantTimelineInteraction,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { event_id: eventId, interaction_type: interactionType },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.HistoricalData],
  };
}

export function merchantReviewInteractionEvent(
  merchantId: string,
  reviewId: string,
  interactionType: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantReviewInteraction,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { review_id: reviewId, interaction_type: interactionType },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.RecommendationKnowledge],
  };
}

export function merchantProfileSharedEvent(
  merchantId: string,
  shareContext: Record<string, unknown> = {}
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantProfileShared,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: shareContext,
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.KnowledgeGraph, BrainAsset.SearchIntelligence],
  };
}

export function merchantContactClickedEvent(
  merchantId: string,
  channelType: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantContactClicked,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { channel_type: channelType },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.RecommendationKnowledge],
  };
}

export function merchantLocationViewedEvent(
  merchantId: string,
  viewerContext: Record<string, unknown> = {}
): TrustDomainEvent {
  return {
    eventType: TrustEventType.MerchantLocationViewed,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: viewerContext,
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.KnowledgeGraph],
  };
}

// ── Sprint 1.5.2 — Verification Events ───────────────────────────────────────

export function verificationSubmittedEvent(
  merchantId: string,
  verificationId: string,
  verificationType: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.VerificationSubmitted,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { verification_id: verificationId, verification_type: verificationType },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData, BrainAsset.KnowledgeGraph],
  };
}

export function verificationApprovedEvent(
  merchantId: string,
  verificationId: string,
  verificationType: string,
  adminId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.VerificationApproved,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { verification_id: verificationId, verification_type: verificationType, admin_id: adminId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData, BrainAsset.KnowledgeGraph],
  };
}

export function verificationRejectedEvent(
  merchantId: string,
  verificationId: string,
  reason: string,
  adminId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.VerificationRejected,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { verification_id: verificationId, reason, admin_id: adminId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}

export function verificationRevokedEvent(
  merchantId: string,
  verificationId: string,
  reason: string,
  adminId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.VerificationRevoked,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { verification_id: verificationId, reason, admin_id: adminId },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}

export function verificationViewedEvent(
  merchantId: string,
  verificationId: string,
  viewedBy: string,
  viewerRole: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.VerificationViewed,
    merchantId,
    source: TrustSource.Buyer,
    occurredAt: new Date(),
    metadata: { verification_id: verificationId, viewed_by: viewedBy, viewer_role: viewerRole },
    brainAssets: [BrainAsset.BuyerBehavioralKnowledge, BrainAsset.KnowledgeGraph],
  };
}

export function evidenceAddedEvent(
  merchantId: string,
  verificationId: string,
  evidenceId: string,
  uploadedBy: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.EvidenceAdded,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { verification_id: verificationId, evidence_id: evidenceId, uploaded_by: uploadedBy },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}

export function evidenceRemovedEvent(
  merchantId: string,
  verificationId: string,
  evidenceId: string,
  removedBy: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.EvidenceRemoved,
    merchantId,
    source: TrustSource.Admin,
    occurredAt: new Date(),
    metadata: { verification_id: verificationId, evidence_id: evidenceId, removed_by: removedBy },
    brainAssets: [BrainAsset.MerchantTrust, BrainAsset.HistoricalData],
  };
}
