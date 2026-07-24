// Mission Ω-Rehabilitation (Catalog Recovery Engine). Read/write surface
// specific to historical-catalog recovery — deliberately separate from
// ICatalogRepository (the sync-pipeline write contract) so this Mission
// adds nothing to what every connector sync already depends on. Reuses
// ICatalogRepository's brand/category/identifier lookups (already built
// for Mission Ω-Gatekeeper) via composition in CatalogRecoveryEngine,
// never duplicated here.

export interface RecoveryCandidateRow {
  productId: string;
  storeId: string;
  name: string;
  specifications: Record<string, string> | null;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

export interface ConfirmedAttributes {
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

export interface RecordRecoveryDecisionInput {
  productId: string;
  fieldType: "brand" | "category";
  previousValue: string | null;
  layer: "product_signature" | "canonical_catalog" | "merchant_memory" | "universal_taxonomy" | "brand_normalization";
  recoveredValue: string;
  recoveredBrandId: string | null;
  recoveredCategoryId: string | null;
  confidence: "high" | "medium" | "low";
  evidence: string;
}

export interface IRecoveryRepository {
  /** Total candidates — products whose brand_id/category_id is null or
   * points at a forbidden placeholder row. Used only for a progress
   * total in the report, never for pagination math. */
  countCandidates(): Promise<number>;
  /** One page of candidates, ordered by product id, using KEYSET (cursor)
   * pagination — `afterProductId: null` starts from the beginning; every
   * subsequent call passes the last id seen in the previous page. Never
   * OFFSET-based: an OFFSET must skip N rows on every call, so its cost
   * grows with how deep into the catalog a page is (confirmed in
   * production — the original OFFSET implementation hit Postgres's
   * statement timeout around candidate #20,000 of ~22,000; a keyset WHERE
   * id > cursor seeks directly via the id index regardless of depth). */
  fetchCandidates(afterProductId: string | null, limit: number): Promise<RecoveryCandidateRow[]>;

  /** Camada 1 — another product already confirmed (real, non-forbidden
   * brand) carrying the same EAN/manufacturer code. Returns that OTHER
   * product's own brand AND category together (each independently null
   * if that side of it isn't itself confirmed) — Mission Ω-Rehabilitation
   * explicitly asks Camada 1 to inherit both attributes from one match. */
  findConfirmedByIdentifier(identifierType: "ean" | "manufacturer_code", identifierValue: string): Promise<ConfirmedAttributes | null>;

  /** Camada 2 — this product's OWN linked canonical_product (via
   * offers.canonical_product_id), when that canonical entry already
   * carries a confirmed brand/category (e.g. synced from another store's
   * correctly-classified listing of the same real-world product). */
  findCanonicalLinkAttributes(productId: string): Promise<ConfirmedAttributes | null>;

  updateProductBrand(productId: string, brandId: string): Promise<void>;
  updateProductCategory(productId: string, categoryId: string): Promise<void>;
  recordDecision(input: RecordRecoveryDecisionInput): Promise<void>;
}
