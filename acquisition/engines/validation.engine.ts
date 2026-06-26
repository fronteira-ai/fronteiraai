import type { RawOffer } from "../types/raw";
import type { ValidationResult, ValidationError, ValidationWarning } from "../types/validation";
import type { IPipelineStage, PipelineContext } from "../types/pipeline";
import { recordStage, recordError } from "../observability/metrics";

const URL_RE = /^https?:\/\/.+/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ValidationEngine implements IPipelineStage {
  readonly name = "validation";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const startedAt = new Date().toISOString();
    const validated: RawOffer[] = [];
    let rejected = 0;

    for (const item of ctx.raw) {
      const result = this.validate(item);
      if (result.valid) {
        validated.push(item);
      } else {
        rejected++;
        const msg = result.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
        recordError(ctx, this.name, msg, item);
      }
      for (const w of result.warnings) {
        console.warn(`[validation] warning ${w.field}: ${w.message}`);
      }
    }

    ctx.validated = validated;
    ctx.metrics.totals.validated = validated.length;
    ctx.metrics.totals.failed += rejected;
    recordStage(ctx, this.name, startedAt, validated.length, rejected);
    return ctx;
  }

  validate(item: RawOffer): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!item.product?.name?.trim()) {
      errors.push({ field: "product.name", message: "Required" });
    }

    if (!item.storeSlug?.trim()) {
      errors.push({ field: "storeSlug", message: "Required" });
    } else if (!SLUG_RE.test(item.storeSlug)) {
      errors.push({ field: "storeSlug", message: "Must be a valid slug (lowercase, hyphens only)", value: item.storeSlug });
    }

    if (item.priceUSD === undefined || item.priceUSD === null) {
      errors.push({ field: "priceUSD", message: "Required" });
    } else if (typeof item.priceUSD !== "number" || isNaN(item.priceUSD)) {
      errors.push({ field: "priceUSD", message: "Must be a number", value: item.priceUSD });
    } else if (item.priceUSD <= 0) {
      errors.push({ field: "priceUSD", message: "Must be greater than 0", value: item.priceUSD });
    }

    if (item.priceBRL !== undefined && item.priceBRL !== null) {
      if (typeof item.priceBRL !== "number" || item.priceBRL <= 0) {
        warnings.push({ field: "priceBRL", message: "Invalid value, will be stored as null", value: item.priceBRL });
      }
    }

    if (item.product?.imageUrl) {
      if (!URL_RE.test(item.product.imageUrl)) {
        warnings.push({ field: "product.imageUrl", message: "Not a valid URL, will be ignored", value: item.product.imageUrl });
      }
    }

    if (item.productUrl) {
      if (!URL_RE.test(item.productUrl)) {
        warnings.push({ field: "productUrl", message: "Not a valid URL, will be stored as null", value: item.productUrl });
      }
    }

    if (item.inStock === undefined) {
      warnings.push({ field: "inStock", message: "Not provided, defaulting to false" });
    }

    if (!item.product?.brand?.trim()) {
      warnings.push({ field: "product.brand", message: "Not provided, will be mapped to 'Other'" });
    }

    if (!item.product?.category?.trim()) {
      warnings.push({ field: "product.category", message: "Not provided, will be mapped to 'Other'" });
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
