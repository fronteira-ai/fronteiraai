import type { TrustEventType, TrustSource, BrainAsset, BrainEntityType, CognitiveBrainActorRole } from "../types/enums";

export const BRAIN_SCHEMA_VERSION = "1.0" as const;

export interface CognitiveBrainContext {
  correlation_id?: string;
  actor_id?: string;
  actor_role?: CognitiveBrainActorRole;
  source_service: string;
  entity_type: BrainEntityType;
  entity_id: string;
}

export interface CognitiveBrainEvent {
  schema_version: typeof BRAIN_SCHEMA_VERSION;
  correlation_id: string;
  event_type: TrustEventType;
  entity_type: BrainEntityType;
  entity_id: string;
  merchant_id: string;
  actor_id: string | undefined;
  actor_role: CognitiveBrainActorRole | undefined;
  origin: TrustSource;
  source_service: string;
  occurred_at: Date;
  ingested_at: Date;
  metadata: Record<string, unknown>;
  assets_impacted: BrainAsset[];
}

export interface CognitiveBrainIngestionResult {
  success: boolean;
  correlation_id: string;
  event_type: TrustEventType;
  assets_impacted: BrainAsset[];
  validation_warnings: string[];
  persisted: boolean;
}
