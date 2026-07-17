// Program Ω — Implementation Phase, Mission Ω-1 (Marketplace Memory
// Foundation). Mirrors supabase/migrations/20260716150000_marketplace_memory.sql
// exactly — every value here has a matching CHECK constraint in the DB.

export enum FactType {
  ManufacturerCode = "manufacturer_code",
  Model = "model",
  Category = "category",
  Brand = "brand",
  /** No extractor produces this yet (docs/architecture/PRODUCT_KNOWLEDGE_GRAPH.md
   * §2) — listed for schema readiness, never emitted by LearnedFactFactory
   * in this Mission. */
  Family = "family",
  /** Same as Family — schema-ready, not yet populated. */
  Line = "line",
  CapacityGb = "capacity_gb",
  RamGb = "ram_gb",
  ScreenSizeIn = "screen_size_in",
  Color = "color",
  Voltage = "voltage",
  PowerW = "power_w",
  Ean = "ean",
  BundleIncludes = "bundle_includes",
  Processor = "processor",
  Gpu = "gpu",
  /** Deliberately not populated by this Mission — `tokenize()` is private
   * to `product-identity/domain/ProductIdentityEngine.ts`, not exported;
   * exporting it would be altering Product Identity's public surface,
   * forbidden by this Mission's restrictions. Listed for schema readiness. */
  Tokens = "tokens",
}

export type FactConfidence = "high" | "medium" | "low";

export type FactSource = "specifications" | "name" | "brand_id" | "taxonomy";

export type FactOrigin = "sync" | "backfill" | "manual";

export type ValidationStatus = "unvalidated" | "confirmed" | "invalidated";

/** Concepts a merchant-specific key pattern can map to — same list as
 * FactType minus Tokens (a raw spec key never maps to "tokens", that's
 * derived from the name as a whole, not a single key). */
export type PatternConcept = Exclude<`${FactType}`, "tokens">;

/** Versions the Foundation's extraction-to-fact mapping (LearnedFactFactory),
 * not product-intelligence's extractors themselves (which carry no version
 * of their own — `buildProductSignature` is unversioned pure code). Bump
 * this only when the FACTORY's mapping logic changes (e.g. a new fact_type
 * gets populated) — never when this Mission's restrictions forbid touching
 * the underlying extractor. Same precedent as
 * `PRODUCT_IDENTITY_ALGORITHM_VERSION` (product-identity/types/enums.ts). */
export const MARKETPLACE_MEMORY_ALGORITHM_VERSION = "1.0.0";
