// Connector SDK — Release 1.8, Program A, Wave 5 (Connector Platform V2).
//
// Everything a Connector author needs to fetch, discover, and parse a
// merchant's public catalog, in one import surface. No merchant-specific
// logic lives here — that stays in each connector's own folder
// (`crawler/shoppingchina/`, future `crawler/megaeletronicos/`, etc.).
//
// Some modules are physically here (created or made SDK-native this Wave:
// HttpFetchStrategy, RateLimitedFetchStrategy, SitemapCrawler, textParsing).
// Others are re-exported in place (SitemapParser, RobotsParser, the field
// mappers) — pre-existing, already tested, already depended on at their
// current path; moving them would be churn with no architectural benefit.
// See docs/engineering/CONNECTOR_PLATFORM_V2.md §3 for the full reasoning.

export * from "./fetch";
export * from "./sitemap";
export * from "./robots";
export * from "./parsing";
export * from "./mapping";
