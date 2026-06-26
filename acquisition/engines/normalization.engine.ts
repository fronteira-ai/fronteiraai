import type { RawOffer } from "../types/raw";
import type { NormalizedOffer, IPipelineStage, PipelineContext } from "../types/pipeline";
import { recordStage, recordError } from "../observability/metrics";
import { slugify } from "../../utils/slug";

const URL_RE = /^https?:\/\/.+/i;

export class NormalizationEngine implements IPipelineStage {
  readonly name = "normalization";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const startedAt = new Date().toISOString();
    const normalized: NormalizedOffer[] = [];
    let rejected = 0;

    for (const item of ctx.validated) {
      try {
        normalized.push(this.normalize(item));
      } catch (err) {
        rejected++;
        recordError(ctx, this.name, String(err), item);
      }
    }

    ctx.normalized = normalized;
    ctx.metrics.totals.normalized = normalized.length;
    ctx.metrics.totals.failed += rejected;
    recordStage(ctx, this.name, startedAt, normalized.length, rejected);
    return ctx;
  }

  normalize(raw: RawOffer): NormalizedOffer {
    const productName = raw.product.name.trim();
    const brandName = raw.product.brand?.trim() || "Outros";
    const categoryName = raw.product.category?.trim() || "Outros";

    const productSlug = slugify(productName);
    if (!productSlug) throw new Error(`Cannot slugify product name: "${productName}"`);

    const imageUrl =
      raw.product.imageUrl && URL_RE.test(raw.product.imageUrl)
        ? raw.product.imageUrl
        : null;

    const productUrl =
      raw.productUrl && URL_RE.test(raw.productUrl) ? raw.productUrl : null;

    const priceBRL =
      raw.priceBRL !== undefined && raw.priceBRL !== null && raw.priceBRL > 0
        ? raw.priceBRL
        : null;

    return {
      raw,
      product: {
        name: productName,
        slug: productSlug,
        description: raw.product.description?.trim() || "",
        brandName,
        brandSlug: slugify(brandName),
        categoryName,
        categorySlug: slugify(categoryName),
        imageUrl,
        specifications: raw.product.specifications ?? {},
      },
      offer: {
        storeSlug: raw.storeSlug.trim(),
        priceUSD: raw.priceUSD,
        priceBRL,
        oldPriceUSD: raw.oldPriceUSD ?? null,
        inStock: raw.inStock ?? false,
        stockQuantity: raw.stockQuantity ?? null,
        condition: raw.condition ?? null,
        warranty: raw.warranty ?? null,
        cashback: raw.cashback ?? null,
        productUrl,
        currency: raw.currency ?? "USD",
      },
      resolvedImageUrl: null,
    };
  }
}
