// Deliberately NOT IConnector — discovery produces a candidate store, not
// RawOffer[], and must never touch SyncOrchestrator/CatalogWriteStage.
export interface DiscoveryResult {
  domain: string;
  storeName: string;
  candidateProductUrls: string[];
  robotsAllowed: boolean;
}

export interface IDiscoverySource {
  readonly key: string;
  discover(domain: string): Promise<DiscoveryResult>;
}
