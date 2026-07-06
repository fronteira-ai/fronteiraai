export { SitemapCrawler } from "./SitemapCrawler";
export type { SitemapCrawlOptions, SitemapEntry } from "./SitemapCrawler";
export { DeltaImportPlanner } from "./DeltaImportPlanner";
export type { DeltaImportPlan } from "./DeltaImportPlanner";

// Re-exported, not moved: SitemapParser is a pre-existing, already-tested
// module (Release 1.7 — Wave 2, Discovery) with real consumers at its
// current path (DiscoveryService, SitemapDiscoverySource, 3 test files).
// Relocating it would be pure churn for a cosmetic reorganization — the SDK
// surface re-exports it instead, so a connector author has one import
// source without any existing import breaking.
export { SitemapParser } from "../../discovery/parsers/SitemapParser";
export type { SitemapEntry as DiscoverySitemapEntry } from "../../discovery/parsers/SitemapParser";
