/**
 * Connector Registry V2 (Release 1.8 — Program B — Wave 2). Same split as
 * certification/observability: this domain owns the vocabulary, the real
 * composition (merchant lookup crosses into `merchant_stores`, health
 * crosses into ConnectorHealthService's own data, quality score crosses
 * into 5 domains) lives in `lib/connector-directory-service.ts`.
 *
 * Two granularities, deliberately: `ConnectorDirectoryEntry` is the cheap
 * list-all shape (registry + persisted status + health, no cross-domain
 * scoring) — safe to compute for every registered connector at once, the
 * shape that actually needs to work at "centenas de merchants" scale.
 * `ConnectorDirectoryDetail` is the expensive single-connector deep-dive
 * (adds certification + quality score), fetched one at a time, on demand.
 */
import type { ConnectorCapabilities } from "../types/capability.types";
import type { CertificationReport, ConnectorQualityScore } from "../certification/types";

export interface ConnectorDirectoryEntry {
  connectorId: string;
  name: string;
  version: string;
  storeSlug: string;
  merchantId: string | null;
  capabilities: ConnectorCapabilities;
  status: string | null;
  healthScore: number;
  lastSyncAt: string | null;
}

export interface ConnectorDirectoryDetail extends ConnectorDirectoryEntry {
  certification: CertificationReport;
  qualityScore: ConnectorQualityScore | null;
}
