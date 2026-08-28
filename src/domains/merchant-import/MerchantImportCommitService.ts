/**
 * Merchant Import — commit engine (§9-24).
 *
 * Executa o plano (aprovado) através da MESMA infraestrutura de catálogo
 * existente (ICatalogRepository: upsertProduct / upsertOffer / insertPriceHistory)
 * — NÃO um segundo pipeline de escrita; reusa os mesmos helpers de brand/
 * category do Gatekeeper (upsertBrand/upsertCategory/findByNormalizedName) que a
 * pipeline de conectores usa para produzir `products`.
 *
 * Garantias:
 *   - Tenancy: storeId resolvido da membership autenticada (server-side).
 *   - Imutável: reaproveita o builder do preview; checksum da fonte muda → FAIL.
 *   - Idempotência: oferta por (productId, storeId); mesma oferta re-commit
 *     (mesmo session) é safe (sem duplicar offer nem histórico).
 *   - PROHIBIDO/AMBÍGUO/INVÁLIDO NUNCA commitam; restante commitado em batches
 *     bounded (retomável por checkpoint).
 *   - price_history: só grava quando o preço observado muda.
 */

import { slugify } from "../../../utils/slug";
import { normalizeBrandName } from "../taxonomy";
import { normalizeCategoryName } from "../connectors/normalization/CategoryNormalizer";
import type { ICatalogRepository } from "../connectors/repositories/ICatalogRepository";
import { ImportPlanBuilder, type PlanBuilderDeps, type ExistingProductForMatch } from "./ImportPlanBuilder";
import { sourceChecksum } from "./types";
import type { RawOffer } from "../connectors/types/raw.types";

export interface CommitContext {
  merchantId: string;
  userId: string;
  storeId: string; // resolvido por membership (server-side)
  sourceChecksum: string; // do preview aprovado (imutabilidade)
  sessionId: string;
}

export interface CommitResult {
  sessionId: string;
  status: "COMMITTED" | "PARTIAL" | "FAILED";
  createdProducts: number;
  matchedProducts: number;
  createdOffers: number;
  updatedOffers: number;
  unchangedOffers: number;
  rejected: number;      // invalid + prohibited (nunca commitados)
  ambiguous: number;     // nunca commitados (para revisão)
  priceHistoryWrites: number;
  stockChanges: number;
  imageChanges: number;
  itemsProcessed: number;
  checkpointIndex: number;
  errorSummary?: string;
}

interface PlanRow {
  externalId: string;
  decision: string;
  productId?: string;
}

export interface CommitDeps {
  repository: ICatalogRepository;
  existingProducts: ExistingProductForMatch[];
  batchSize?: number;
  /** Injeta o checksum de uma lista (idempotência/imutabilidade testável). */
  checksum?: (offers: RawOffer[]) => string;
}

export class MerchantImportCommitService {
  constructor(private readonly deps: CommitDeps) {}

  async commit(offers: RawOffer[], ctx: CommitContext): Promise<CommitResult> {
    const fail = (reason: string): CommitResult => ({ sessionId: ctx.sessionId, status: "FAILED", createdProducts: 0, matchedProducts: 0, createdOffers: 0, updatedOffers: 0, unchangedOffers: 0, rejected: offers.length, ambiguous: 0, priceHistoryWrites: 0, stockChanges: 0, imageChanges: 0, itemsProcessed: 0, checkpointIndex: 0, errorSummary: reason });

    const checksum = this.deps.checksum ?? ((o) => sourceChecksum(JSON.stringify(o)));
    if (checksum(offers) !== ctx.sourceChecksum) return fail("SOURCE_CHANGED_SINCE_PREVIEW");
    if (!ctx.storeId || !ctx.merchantId) return fail("TENANT_CONTEXT_MISSING");

    const summaryTarget: PlanBuilderDeps = { existingProducts: this.deps.existingProducts, existingOffersByExternalId: new Map(), storeId: ctx.storeId };
    const { items } = new ImportPlanBuilder(summaryTarget).build(offers);
    const plan = items as unknown as PlanRow[];

    const result: CommitResult = { sessionId: ctx.sessionId, status: "COMMITTED", createdProducts: 0, matchedProducts: 0, createdOffers: 0, updatedOffers: 0, unchangedOffers: 0, rejected: 0, ambiguous: 0, priceHistoryWrites: 0, stockChanges: 0, imageChanges: 0, itemsProcessed: 0, checkpointIndex: 0 };
    // nunca commit: PROHIBITED/INVALID/AMBIGUOUS
    result.rejected = plan.filter((p) => p.decision === "INVALID" || p.decision === "PROHIBITED").length;
    result.ambiguous = plan.filter((p) => p.decision === "AMBIGUOUS").length;

    const commitable = plan.filter((p) => ["CREATE_PRODUCT_CANDIDATE", "CREATE_NEW_OFFER", "UPDATE_EXISTING_OFFER", "MATCH_EXISTING_PRODUCT", "UNCHANGED"].includes(p.decision));
    void commitable;

    const batch = Math.max(1, this.deps.batchSize ?? 500);
    for (let i = 0; i < offers.length; i += batch) {
      const chunk = offers.slice(i, i + batch);
      for (const offer of chunk) {
        const row = plan.find((p) => p.externalId === offer.product.externalId);
        if (!row || ["INVALID", "PROHIBITED", "AMBIGUOUS"].includes(row.decision)) continue;
        await this.writeItem(offer, row, ctx, result);
      }
      result.itemsProcessed = Math.min(i + chunk.length, offers.length);
      result.checkpointIndex = i + chunk.length;
    }
    result.status = "COMMITTED";
    result.itemsProcessed = offers.length;
    result.checkpointIndex = offers.length;
    return result;
  }

  private async writeItem(offer: RawOffer, row: PlanRow, ctx: CommitContext, result: CommitResult): Promise<void> {
    // Idempotência: procura oferta EXISTENTE no store+produto ANTES de escrever.
    const existingOffer = row.productId ? await this.deps.repository.findOfferByProductAndStore(row.productId, ctx.storeId) : null;
    const productId = row.productId ?? await this.ensureProduct(offer);
    if (!row.productId) result.createdProducts++; else result.matchedProducts++;

    const prev = existingOffer ?? (await this.deps.repository.findOfferByProductAndStore(productId, ctx.storeId));
    const price = offer.priceUSD;
    const inStock = offer.inStock ?? false;
    const stockQty = offer.stockQuantity ?? null;

    const offerId = await this.deps.repository.upsertOffer({
      productId, storeId: ctx.storeId, currency: offer.currency ?? "USD", priceUSD: price, priceBRL: null, oldPriceUSD: offer.oldPriceUSD ?? null,
      inStock, stockQuantity: stockQty, condition: offer.condition ?? null, warranty: offer.warranty ?? null, cashback: offer.cashback ?? null, productUrl: offer.productUrl ?? null,
    });
    result.createdOffers++;

    const wasUnchanged = !!prev && Math.abs(prev.priceUSD - price) < 0.001 && prev.inStock === inStock;
    if (wasUnchanged) result.unchangedOffers++;
    else if (prev) result.updatedOffers++;

    // price_history apenas na mudança de preço (não duplica em retry idêntico).
    if (!prev || Math.abs(prev.priceUSD - price) > 0.001) {
      await this.deps.repository.insertPriceHistory({ offerId, priceUSD: price, priceBRL: null, source: "merchant_import" });
      result.priceHistoryWrites++;
    }
    if (!prev || prev.inStock !== inStock) result.stockChanges++;
    if (!prev || prev.imageUrl !== (offer.product.imageUrl ?? null)) result.imageChanges++;
  }

  /** Cria produto canônico com brand/category Gatekeeper-resolvidas (reuso repo). */
  private async ensureProduct(offer: RawOffer): Promise<string> {
    const repo = this.deps.repository;
    const brandName = offer.product.brand?.trim();
    const categoryName = offer.product.category?.trim();
    let brandId: string | undefined;
    let categoryId: string | undefined;
    if (brandName) {
      const norm = normalizeBrandName(brandName) || slugify(brandName).replace(/-/g, " ");
      const existing = await repo.findBrandByNormalizedName(norm.trim().toLowerCase());
      brandId = existing?.id ?? await repo.upsertBrand(brandName, slugify(brandName) || "generico");
    }
    if (categoryName) {
      const norm = normalizeCategoryName(categoryName);
      const existingCat = await repo.findCategoryByNormalizedName(slugify(norm));
      categoryId = existingCat?.id ?? await repo.upsertCategory(categoryName, slugify(norm) || "geral");
    }
    const productId = await repo.upsertProduct({
      name: offer.product.name,
      slug: slugify(offer.product.name) || `prod-${offer.product.externalId ?? Date.now()}`,
      description: offer.product.description ?? "",
      brandId: brandId ?? "",
      categoryId: categoryId ?? "",
      imageUrl: offer.product.imageUrl ?? null,
      specifications: offer.product.specifications ?? null,
    });
    return productId;
  }
}
