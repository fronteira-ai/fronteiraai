import type { CognitiveBrainEvent } from "./BrainEvent";

export interface EventQualityResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateBrainEvent(event: CognitiveBrainEvent): EventQualityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!event.merchant_id) errors.push("merchant_id is required");
  if (!event.event_type) errors.push("event_type is required");
  if (!event.origin) errors.push("origin is required");
  if (!event.source_service) errors.push("source_service is required");
  if (!event.correlation_id) errors.push("correlation_id is required");
  if (event.schema_version !== "1.0") errors.push("unsupported schema_version");
  if (!event.occurred_at || isNaN(event.occurred_at.getTime())) errors.push("occurred_at is invalid");

  if (event.assets_impacted.length === 0) {
    warnings.push("no Brain assets impacted — event may have low cognitive value");
  }
  if (!event.actor_id) {
    warnings.push("actor_id missing — event provenance incomplete");
  }
  if (!event.entity_id) {
    warnings.push("entity_id missing — entity traceability limited");
  }

  const futureThreshold = Date.now() + 60_000;
  if (event.occurred_at.getTime() > futureThreshold) {
    warnings.push("occurred_at is in the future — possible clock skew");
  }

  return { valid: errors.length === 0, errors, warnings };
}
