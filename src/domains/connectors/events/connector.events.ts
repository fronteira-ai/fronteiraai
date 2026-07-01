import { TrustEventType, TrustSource, BrainAsset } from "@/src/domains/trust/types/enums";
import type { TrustDomainEvent } from "@/src/domains/trust/events/trust.events";

// Epic 1 is the first domain outside src/domains/trust/ to feed the Brain.
// Per the Epic 1 architecture decisions (see RELEASE_1_7_EXECUTION_PLAN.md),
// these factories are only actually ingested from the merchant-triggered sync
// path — TrustDomainEvent.merchantId is a required string, and most syncs
// (admin/global connectors) have no natural merchant to attach to yet.

export function connectorRegisteredEvent(merchantId: string, connectorKey: string): TrustDomainEvent {
  return {
    eventType: TrustEventType.ConnectorRegistered,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { connector_key: connectorKey },
    brainAssets: [BrainAsset.SearchIntelligence, BrainAsset.HistoricalData],
  };
}

export function connectorSyncStartedEvent(
  merchantId: string,
  connectorKey: string,
  batchId: string,
  dryRun: boolean
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ConnectorSyncStarted,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { connector_key: connectorKey, batch_id: batchId, dry_run: dryRun },
    brainAssets: [BrainAsset.HistoricalData],
  };
}

export function connectorSyncCompletedEvent(
  merchantId: string,
  connectorKey: string,
  batchId: string,
  totals: Record<string, unknown>
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ConnectorSyncCompleted,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { connector_key: connectorKey, batch_id: batchId, totals },
    brainAssets: [BrainAsset.SearchIntelligence, BrainAsset.HistoricalData],
  };
}

export function connectorSyncFailedEvent(
  merchantId: string,
  connectorKey: string,
  batchId: string,
  errorCount: number
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ConnectorSyncFailed,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { connector_key: connectorKey, batch_id: batchId, error_count: errorCount },
    brainAssets: [BrainAsset.HistoricalData],
  };
}

// Release 1.7 — Wave 2 — Merchant Connectors + Scheduler + Discovery Events.
// StoreDiscovered (types/enums.ts) is deliberately NOT given a factory
// function here: TrustDomainEvent.merchantId is a required string, and no
// merchant exists at discovery time (nothing has been claimed yet). The enum
// member and its Brain-impact registry entry exist for taxonomy completeness
// only, reserved for future ingestion once a merchant context is available —
// same pattern as ConnectorRegistered in Epic 1.

export function connectorSyncScheduledEvent(
  merchantId: string,
  connectorKey: string,
  batchId: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ConnectorSyncScheduled,
    merchantId,
    source: TrustSource.System,
    occurredAt: new Date(),
    metadata: { connector_key: connectorKey, batch_id: batchId },
    brainAssets: [BrainAsset.HistoricalData],
  };
}

export function connectorSyncSkippedEntitlementEvent(
  merchantId: string,
  connectorKey: string,
  reason: string
): TrustDomainEvent {
  return {
    eventType: TrustEventType.ConnectorSyncSkippedEntitlement,
    merchantId,
    source: TrustSource.Merchant,
    occurredAt: new Date(),
    metadata: { connector_key: connectorKey, reason },
    brainAssets: [BrainAsset.MerchantTrust],
  };
}
