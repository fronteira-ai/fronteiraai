export { SitemapCrawler } from "./SitemapCrawler";
export type { SitemapCrawlOptions, SitemapEntry } from "./SitemapCrawler";

// Delta Import moved out of the Sitemap Engine (Program Σ, Mission Σ-2) —
// it is now the platform-level Delta Engine, `src/domains/connectors/delta`,
// independent of sitemap/URL vocabulary. Import it from `../../delta`.

// Re-exported, not moved: SitemapParser is a pre-existing, already-tested
// module (Release 1.7 — Wave 2, Discovery) with real consumers at its
// current path (DiscoveryService, SitemapDiscoverySource, 3 test files).
// Relocating it would be pure churn for a cosmetic reorganization — the SDK
// surface re-exports it instead, so a connector author has one import
// source without any existing import breaking.
export { SitemapParser } from "../../discovery/parsers/SitemapParser";
export type { SitemapEntry as DiscoverySitemapEntry } from "../../discovery/parsers/SitemapParser";
