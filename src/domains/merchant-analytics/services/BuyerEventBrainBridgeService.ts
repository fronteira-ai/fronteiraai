import type { SupabaseClient } from "@supabase/supabase-js";
import { CognitiveBrainService } from "@/src/domains/trust/brain/CognitiveBrainService";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import type { TrustDomainEvent } from "@/src/domains/trust/events/trust.events";
import { TrustEventType, TrustSource, BrainEntityType, CognitiveBrainActorRole } from "@/src/domains/trust/types/enums";
import { AnalyticsEventType } from "../types/enums";
import type { StoredAnalyticsEvent } from "../types/analytics.types";

// Release 1.8 — Program 0, Wave 0 (Brain Analytics Integration).
//
// buyer_events → merchant_trust_events, one direction, one-time per row.
// Runs synchronously inside EventPlatformService.processBatch(), right
// after a buyer_events row is inserted — no queue, no cron, no polling.
// idempotency comes entirely from buyer_events.brain_synced_at: a row is
// only ever picked up once (set in the same call that performs the Brain
// insert), and this service is never invoked on already-synced rows by its
// only caller.
//
// SCOPE BOUNDARY, not an oversight: merchant_trust_events.merchant_id is
// NOT NULL (Release 1.5 schema, dozens of existing consumers assume it).
// Only buyer_events rows that already carry a resolvable merchant_id can
// cross this bridge — most buyer behavior (search, category/brand
// browsing, product views not attributable to a single store) has no
// merchant context and structurally cannot land here. That's Marketplace
// Intelligence / Search Intelligence (C-4) territory, which has no
// dedicated Brain-ingestible storage today — named, not built, in this
// Wave's report.
//
// PII BOUNDARY: only buyer_events.anonymous_id / buyer_id (already
// pseudonymous UUIDs, never joined to auth.users/profiles/email/name here)
// are forwarded, and only inside metadata — never through created_by
// (merchant_trust_events.created_by is an FK to profiles(id); a buyer
// pseudonym is not a profiles row and must never be written there).
const EVENT_MAP: Partial<Record<AnalyticsEventType, { trustType: TrustEventType; channel?: string }>> = {
  [AnalyticsEventType.MerchantViewed]: { trustType: TrustEventType.MerchantViewed },
  [AnalyticsEventType.MerchantPassportViewed]: { trustType: TrustEventType.MerchantPassportViewed },
  [AnalyticsEventType.MerchantContactClicked]: { trustType: TrustEventType.MerchantContactClicked, channel: "generic" },
  [AnalyticsEventType.MerchantWhatsAppClicked]: { trustType: TrustEventType.MerchantContactClicked, channel: "whatsapp" },
  [AnalyticsEventType.MerchantPhoneClicked]: { trustType: TrustEventType.MerchantContactClicked, channel: "phone" },
  [AnalyticsEventType.MerchantWebsiteClicked]: { trustType: TrustEventType.MerchantContactClicked, channel: "website" },
};

export interface BridgeResult {
  eventId: string;
  bridged: boolean;
  reason?: "no_merchant_context" | "no_mapping" | "validation_failed" | "persistence_failed";
}

export class BuyerEventBrainBridgeService {
  private readonly brain: CognitiveBrainService;

  constructor(
    private readonly client: SupabaseClient,
    brain?: CognitiveBrainService
  ) {
    this.brain = brain ?? new CognitiveBrainService(new SupabaseTrustEventRepository(client));
  }

  async bridge(event: StoredAnalyticsEvent): Promise<BridgeResult> {
    if (!event.merchant_id) {
      return { eventId: event.id, bridged: false, reason: "no_merchant_context" };
    }

    const mapping = EVENT_MAP[event.event_type];
    if (!mapping) {
      return { eventId: event.id, bridged: false, reason: "no_mapping" };
    }

    const buyerPseudonym = event.buyer_id ?? event.anonymous_id;

    const domainEvent: TrustDomainEvent = {
      eventType: mapping.trustType,
      merchantId: event.merchant_id,
      source: TrustSource.Buyer,
      occurredAt: new Date(event.occurred_at),
      metadata: {
        buyer_pseudonym: buyerPseudonym,
        buyer_events_id: event.id,
        ...(event.store_id && { store_id: event.store_id }),
        ...(mapping.channel && { contact_channel: mapping.channel }),
      },
      brainAssets: [],
    };

    const result = await this.brain.ingest(domainEvent, {
      entity_type: BrainEntityType.Merchant,
      entity_id: event.merchant_id,
      actor_id: buyerPseudonym,
      actor_role: CognitiveBrainActorRole.Buyer,
      source_service: "merchant-analytics.buyer-event-bridge",
    });

    if (!result.success) {
      await this.markError(event.id, result.validation_warnings.join("; ") || "validation_failed");
      return { eventId: event.id, bridged: false, reason: "validation_failed" };
    }
    if (!result.persisted) {
      await this.markError(event.id, "brain_persistence_failed");
      return { eventId: event.id, bridged: false, reason: "persistence_failed" };
    }

    await this.markSynced(event.id);
    return { eventId: event.id, bridged: true };
  }

  private async markSynced(eventId: string): Promise<void> {
    await this.client
      .from("buyer_events")
      .update({ brain_synced_at: new Date().toISOString(), brain_sync_error: null })
      .eq("id", eventId);
  }

  private async markError(eventId: string, error: string): Promise<void> {
    await this.client
      .from("buyer_events")
      .update({ brain_sync_error: error.slice(0, 512) })
      .eq("id", eventId);
  }
}
