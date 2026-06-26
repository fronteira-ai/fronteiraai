import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawOffer } from "./raw";

export interface NormalizedOffer {
  raw: RawOffer;
  product: {
    name: string;
    slug: string;
    description: string;
    brandName: string;
    brandSlug: string;
    categoryName: string;
    categorySlug: string;
    imageUrl: string | null;
    specifications: Record<string, string>;
  };
  offer: {
    storeSlug: string;
    priceUSD: number;
    priceBRL: number | null;
    oldPriceUSD: number | null;
    inStock: boolean;
    stockQuantity: number | null;
    condition: string | null;
    warranty: string | null;
    cashback: number | null;
    productUrl: string | null;
    currency: string;
  };
  resolvedImageUrl: string | null;
}

export type DeduplicationStatus = "new" | "update" | "skip";

export interface DeduplicatedOffer {
  normalized: NormalizedOffer;
  status: DeduplicationStatus;
  existingProductId?: string;
  existingOfferId?: string;
}

export interface PersistenceResult {
  productSlug: string;
  storeSlug: string;
  action: "created" | "updated" | "skipped" | "error";
  productId?: string;
  offerId?: string;
  error?: string;
}

export interface StageMetrics {
  stage: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  accepted: number;
  rejected: number;
  skipped: number;
}

export interface PipelineMetrics {
  connectorId: string;
  batchId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  stages: StageMetrics[];
  totals: {
    received: number;
    validated: number;
    normalized: number;
    deduplicated: number;
    persisted: number;
    failed: number;
    skipped: number;
  };
}

export interface PipelineError {
  stage: string;
  item?: unknown;
  error: string;
  timestamp: string;
}

export interface PipelineContext {
  connectorId: string;
  batchId: string;
  dryRun: boolean;
  supabase: SupabaseClient;
  raw: RawOffer[];
  validated: RawOffer[];
  normalized: NormalizedOffer[];
  deduplicated: DeduplicatedOffer[];
  persisted: PersistenceResult[];
  metrics: PipelineMetrics;
  errors: PipelineError[];
}

export interface PipelineResult {
  batchId: string;
  connectorId: string;
  dryRun: boolean;
  success: boolean;
  metrics: PipelineMetrics;
  errors: PipelineError[];
  persisted: PersistenceResult[];
}

export interface IPipelineStage {
  readonly name: string;
  execute(ctx: PipelineContext): Promise<PipelineContext>;
}
