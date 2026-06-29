import { BrainEntityType, GraphRelationType } from "../types/enums";
import type { TrustEventRecord } from "../types/trust.types";
import { TrustEventType } from "../types/enums";

export interface KnowledgeGraphRelation {
  relation_id: string;
  from_type: BrainEntityType;
  from_id: string;
  relation_type: GraphRelationType;
  to_type: BrainEntityType;
  to_id: string;
  weight: number;
  event_correlation_id?: string;
  recorded_at: Date;
}

export interface GraphSummary {
  merchantId: string;
  totalRelations: number;
  byRelationType: Record<string, number>;
  uniqueBuyers: number;
  verificationLinks: number;
  reviewLinks: number;
}

function deriveRelationsFromEvent(event: TrustEventRecord): KnowledgeGraphRelation[] {
  const relations: KnowledgeGraphRelation[] = [];
  const meta = event.metadata as Record<string, unknown>;

  function make(
    fromType: BrainEntityType,
    fromId: string,
    relationType: GraphRelationType,
    toType: BrainEntityType,
    toId: string,
    weight: number
  ): KnowledgeGraphRelation {
    return {
      relation_id: `${fromType}:${fromId}→${relationType}→${toType}:${toId}`,
      from_type: fromType,
      from_id: fromId,
      relation_type: relationType,
      to_type: toType,
      to_id: toId,
      weight,
      event_correlation_id: event.id,
      recorded_at: new Date(event.created_at),
    };
  }

  const merchantId = event.merchant_id;

  switch (event.event_type) {
    case TrustEventType.MerchantProfileViewed:
    case TrustEventType.MerchantPassportViewed:
      if (event.created_by) {
        relations.push(make(BrainEntityType.Buyer, event.created_by, GraphRelationType.BuyerViewed, BrainEntityType.Merchant, merchantId, 5));
      }
      break;

    case TrustEventType.ReviewCreated:
      if (event.created_by && meta.review_id) {
        relations.push(make(BrainEntityType.Buyer, event.created_by, GraphRelationType.BuyerReviewed, BrainEntityType.Merchant, merchantId, 9));
        relations.push(make(BrainEntityType.Merchant, merchantId, GraphRelationType.MerchantHasReview, BrainEntityType.Review, String(meta.review_id), 8));
        relations.push(make(BrainEntityType.Review, String(meta.review_id), GraphRelationType.ReviewLinkedToBuyer, BrainEntityType.Buyer, event.created_by, 8));
      }
      break;

    case TrustEventType.VerificationApproved:
      if (meta.verification_id) {
        relations.push(make(BrainEntityType.Merchant, merchantId, GraphRelationType.MerchantHasVerification, BrainEntityType.Verification, String(meta.verification_id), 10));
      }
      break;

    case TrustEventType.TrustSignalActivated:
      if (meta.signal_id ?? meta.reference_id) {
        const signalId = String(meta.signal_id ?? meta.reference_id);
        relations.push(make(BrainEntityType.Merchant, merchantId, GraphRelationType.MerchantHasSignal, BrainEntityType.Signal, signalId, 9));
      }
      break;

    case TrustEventType.MerchantContactClicked:
      if (event.created_by) {
        relations.push(make(BrainEntityType.Buyer, event.created_by, GraphRelationType.BuyerContactedVia, BrainEntityType.Merchant, merchantId, 10));
      }
      break;

    case TrustEventType.MerchantProfileShared:
      if (event.created_by) {
        relations.push(make(BrainEntityType.Buyer, event.created_by, GraphRelationType.BuyerSharedProfile, BrainEntityType.Merchant, merchantId, 8));
      }
      break;

    case TrustEventType.TimelineViewed:
    case TrustEventType.MerchantTimelineInteraction:
      relations.push(make(BrainEntityType.Merchant, merchantId, GraphRelationType.MerchantHasTimeline, BrainEntityType.Timeline, merchantId, 5));
      break;
  }

  return relations;
}

export class KnowledgeGraphService {
  deriveRelations(events: TrustEventRecord[]): KnowledgeGraphRelation[] {
    return events.flatMap(deriveRelationsFromEvent);
  }

  buildSummary(merchantId: string, events: TrustEventRecord[]): GraphSummary {
    const relations = this.deriveRelations(events);
    const byType: Record<string, number> = {};
    const buyers = new Set<string>();

    for (const r of relations) {
      byType[r.relation_type] = (byType[r.relation_type] ?? 0) + 1;
      if (r.from_type === BrainEntityType.Buyer) buyers.add(r.from_id);
    }

    return {
      merchantId,
      totalRelations: relations.length,
      byRelationType: byType,
      uniqueBuyers: buyers.size,
      verificationLinks: byType[GraphRelationType.MerchantHasVerification] ?? 0,
      reviewLinks: byType[GraphRelationType.MerchantHasReview] ?? 0,
    };
  }
}
