import { randomUUID } from "crypto";
import { CognitiveBrainActorRole } from "../types/enums";
import type { ITrustEventRepository } from "../repositories/ITrustEventRepository";
import { getBrainImpact } from "../events/event-registry";
import type { TrustDomainEvent } from "../events/trust.events";
import { BRAIN_SCHEMA_VERSION } from "./BrainEvent";
import type { CognitiveBrainContext, CognitiveBrainEvent, CognitiveBrainIngestionResult } from "./BrainEvent";
import { validateBrainEvent } from "./EventQualityValidator";
import { ObservabilityService } from "./ObservabilityService";
import { KnowledgeGraphService } from "./KnowledgeGraphService";
import type { KnowledgeGraphRelation } from "./KnowledgeGraphService";

export class CognitiveBrainService {
  private readonly observability: ObservabilityService;
  private readonly graph: KnowledgeGraphService;

  constructor(
    private readonly eventRepository: ITrustEventRepository,
    observability?: ObservabilityService
  ) {
    this.observability = observability ?? new ObservabilityService("CognitiveBrainService");
    this.graph = new KnowledgeGraphService();
  }

  async ingest(
    domainEvent: TrustDomainEvent,
    context: CognitiveBrainContext
  ): Promise<CognitiveBrainIngestionResult> {
    const correlationId = context.correlation_id ?? randomUUID();
    const assetsImpacted = getBrainImpact(domainEvent.eventType);

    const cognitiveEvent: CognitiveBrainEvent = {
      schema_version: BRAIN_SCHEMA_VERSION,
      correlation_id: correlationId,
      event_type: domainEvent.eventType,
      entity_type: context.entity_type,
      entity_id: context.entity_id,
      merchant_id: domainEvent.merchantId,
      actor_id: context.actor_id,
      actor_role: context.actor_role,
      origin: domainEvent.source,
      source_service: context.source_service,
      occurred_at: domainEvent.occurredAt,
      ingested_at: new Date(),
      metadata: {
        ...domainEvent.metadata,
        correlation_id: correlationId,
        schema_version: BRAIN_SCHEMA_VERSION,
      },
      assets_impacted: assetsImpacted,
    };

    const quality = validateBrainEvent(cognitiveEvent);
    this.observability.trackEvent(cognitiveEvent, quality);

    if (!quality.valid) {
      return {
        success: false,
        correlation_id: correlationId,
        event_type: domainEvent.eventType,
        assets_impacted: assetsImpacted,
        validation_warnings: [...quality.errors, ...quality.warnings],
        persisted: false,
      };
    }

    let persisted = false;
    try {
      const record = await this.eventRepository.create({
        merchant_id: domainEvent.merchantId,
        event_type: domainEvent.eventType,
        source: domainEvent.source,
        metadata: cognitiveEvent.metadata,
        // merchant_trust_events.created_by is an FK to profiles(id). Buyers
        // are deliberately never profiles rows (ADR-031, ADR-046) — their
        // pseudonymous actor_id would violate that constraint. Only
        // non-buyer actors (staff/system, who do have profiles rows) get
        // written here; a buyer's pseudonym still reaches the Brain, just
        // via metadata.buyer_pseudonym (no FK, exactly where
        // KnowledgeGraphService reads it from). Found and fixed in Release
        // 1.8, Program 0 Wave 0 — the first production caller this method
        // ever had; every prior test used a staff-shaped actor_id and never
        // hit this path.
        created_by: context.actor_role === CognitiveBrainActorRole.Buyer ? undefined : context.actor_id,
      });
      persisted = record !== null;
    } catch (err) {
      this.observability.log("error", "Brain event persistence failed", {
        correlation_id: correlationId,
        event_type: domainEvent.eventType,
        error: String(err),
      });
    }

    return {
      success: true,
      correlation_id: correlationId,
      event_type: domainEvent.eventType,
      assets_impacted: assetsImpacted,
      validation_warnings: quality.warnings,
      persisted,
    };
  }

  deriveGraphRelations(merchantId: string): Promise<KnowledgeGraphRelation[]> {
    return this.eventRepository
      .findByMerchantId(merchantId)
      .then((events) => this.graph.deriveRelations(events))
      .catch(() => []);
  }
}
