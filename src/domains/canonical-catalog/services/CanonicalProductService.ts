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
