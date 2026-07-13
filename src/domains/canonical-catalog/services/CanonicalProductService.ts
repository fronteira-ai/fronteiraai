import { slugify } from "@/utils/slug";
import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";

export interface BootstrapProductInput {
  slug: string;
  name: string;
  brandId: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  specifications: Record<string, string> | null;
}

// Fase 2 — Sprint 2.8. One entry per field that drifted between a
// canonical product and its source `products` row.
export interface CanonicalDrift {
  field: "specifications" | "categoryId" | "brandId" | "imageUrl";
  from: unknown;
  to: unknown;
}

function specificationsEqual(a: Record<string, string> | null, b: Record<string, string> | null): boolean {
  const aKeys = a ? Object.keys(a).sort() : [];
  const bKeys = b ? Object.keys(b).sort() : [];
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key, i) => key === bKeys[i] && a![key] === b![key]);
}

export class CanonicalProductService {
  constructor(private readonly repo: ICanonicalCatalogRepository) {}

  getBySlug(canonicalSlug: string): Promise<CanonicalProduct | null> {
    return this.repo.findBySlug(canonicalSlug);
  }

  // Bootstrap, not a merge (CTO mission): every existing product maps to
  // exactly one canonical product, 1:1 and lossless. Reuses the product's
  // already-unique slug (migration 0008's UNIQUE constraint) as
  // canonical_slug — zero collision risk, no new slugification needed for
  // this path. Idempotent: calling this twice for the same product returns
  // the same canonical product.
  bootstrapFromProduct(product: BootstrapProductInput): Promise<CanonicalProduct> {
    return this.repo.findOrCreateBySlug(product.slug, {
      canonicalSlug: product.slug,
      name: product.name,
      brandId: product.brandId,
      categoryId: product.categoryId,
      imageUrl: product.imageUrl,
      specifications: product.specifications,
    });
  }

  // Fase 2 — Sprint 2.8 (Canonical Catalog Synchronization). Pure diff, no
  // I/O — compares a canonical product's synced fields against its source
  // product's *current* values. specifications/categoryId/imageUrl are a
  // plain "products is the freshest source of truth" refresh (this is what
  // closes the gap Sprint 2.7 found: bootstrapFromProduct never updates an
  // existing row, so these fields can go stale forever). brandId is
  // computed the same way but is expected to almost never drift post-
  // creation (Sprint 2.3: brand extraction doesn't fragment) — callers
  // should treat a brandId drift as a data-integrity signal worth
  // surfacing on its own, not just a routine content refresh.
  diffFromProduct(canonical: CanonicalProduct, product: BootstrapProductInput): CanonicalDrift[] {
    const drifts: CanonicalDrift[] = [];
    if (!specificationsEqual(canonical.specifications, product.specifications)) {
      drifts.push({ field: "specifications", from: canonical.specifications, to: product.specifications });
    }
    if (canonical.categoryId !== product.categoryId) {
      drifts.push({ field: "categoryId", from: canonical.categoryId, to: product.categoryId });
    }
    if (canonical.brandId !== product.brandId) {
      drifts.push({ field: "brandId", from: canonical.brandId, to: product.brandId });
    }
    if (canonical.imageUrl !== product.imageUrl) {
      drifts.push({ field: "imageUrl", from: canonical.imageUrl, to: product.imageUrl });
    }
    return drifts;
  }

  // Diffs, then writes only if something actually changed — never an
  // unconditional update. Returns the drifts found so callers (the
  // bootstrap script) can report exactly what moved, per field.
  async syncFromProduct(
    canonical: CanonicalProduct,
    product: BootstrapProductInput
  ): Promise<{ updated: boolean; drifts: CanonicalDrift[] }> {
    const drifts = this.diffFromProduct(canonical, product);
    if (drifts.length === 0) return { updated: false, drifts };

    await this.repo.updateSyncedFields(canonical.id, {
      specifications: product.specifications,
      categoryId: product.categoryId,
      brandId: product.brandId,
      imageUrl: product.imageUrl,
    });
    return { updated: true, drifts };
  }

  // For future canonical products not born from a 1:1 product bootstrap
  // (e.g. after a real merge, in a later Wave). Appends a numeric suffix on
  // collision — canonical_slug is immutable once assigned, so this is only
  // ever called at creation time, never to "fix" an existing slug.
  async generateCanonicalSlug(name: string, brandSlug: string): Promise<string> {
    const base = slugify(`${brandSlug}-${name}`);
    let candidate = base;
    let suffix = 2;

    while (await this.repo.findBySlug(candidate)) {
      candidate = `${base}-${suffix}`;
      suffix++;
    }

    return candidate;
  }
}
