/**
 * Program Ω — Implementation Phase, Mission Ω-1 (Marketplace Memory
 * Foundation), Objetivo 6 — Backfill Strategy.
 *
 * Populates marketplace_memory_facts + merchant_attribute_patterns from
 * the 17.983 active canonical_products (per-product facts) and the raw
 * `products` rows behind them (merchant patterns) — using only existing,
 * unmodified pure functions (buildProductSignature, findNodeByRealCategorySlug,
 * normalizeBrandName, resolveOfficialKey, all Program Κ, untouched by this
 * Mission).
 *
 * Does not touch canonical_products/products/offers/merge_candidates —
 * reads them, writes only to the 2 new tables. Cannot interrupt
 * production by construction: no existing table is ever written to.
 *
 * Rollback: `TRUNCATE marketplace_memory_facts, merchant_attribute_patterns;`
 * — safe at any time, nothing else references these tables yet (this
 * Mission deliberately does not wire them into any consumer).
 *
 * Dry-run by default (same --execute convention as
 * canonical-catalog-bootstrap.ts). NOT run against production by this
 * Mission — requires explicit CTO authorization, same discipline as every
 * other production write this program has made (Mission OPS-1).
 *
 * Uso:
 *   npx tsx scripts/marketplace-memory-backfill.ts
 *   npx tsx scripts/marketplace-memory-backfill.ts --execute
 */
import { getServiceClient } from "./lib/client";
import { buildProductSignature, resolveOfficialKey } from "@/src/domains/product-intelligence";
import { findNodeByRealCategorySlug, normalizeBrandName } from "@/src/domains/taxonomy";
import {
  MarketplaceMemoryService,
  SupabaseLearnedFactRepository,
  SupabaseMerchantAttributePatternRepository,
  factsFromProductSignature,
  factCategoryFromTaxonomy,
  factBrandFromNormalization,
} from "@/src/domains/marketplace-memory";
import type { LearnedFactInput, MerchantAttributePatternInput } from "@/src/domains/marketplace-memory";

const EXECUTE = process.argv.includes("--execute");
const PAGE = 1000;
// Program Ω — Implementation Phase, Mission Ω-2 (Shadow Validation),
// Objetivo 4 — Backfill Validation "em ambiente controlado". Optional cap
// on how many canonical_products are processed, so a real run can be
// scoped to a small, easily-reversible sample before ever considering the
// full catalog. Omitted = full catalog (Mission Ω-1's original behavior,
// unchanged).
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const PRODUCT_LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;

async function fetchAll<T>(fn: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fn(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  console.log(`\n[marketplace-memory-backfill] Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

  const supabase = getServiceClient();
  const service = new MarketplaceMemoryService(
    new SupabaseLearnedFactRepository(supabase),
    new SupabaseMerchantAttributePatternRepository(supabase)
  );

  console.log("Fetching canonical_products, categories, brands, offers, products, stores...");
  const allCanonicalProducts = await fetchAll<Record<string, unknown>>(async (from, to) =>
    await supabase.from("canonical_products").select("id, name, brand_id, category_id, specifications").eq("is_active", true).range(from, to)
  );
  const canonicalProducts = Number.isFinite(PRODUCT_LIMIT) ? allCanonicalProducts.slice(0, PRODUCT_LIMIT) : allCanonicalProducts;
  const categories = await fetchAll<{ id: string; slug: string }>(async (from, to) => await supabase.from("categories").select("id, slug").range(from, to));
  const brands = await fetchAll<{ id: string; name: string }>(async (from, to) => await supabase.from("brands").select("id, name").range(from, to));
  const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));
  const brandNameById = new Map(brands.map((b) => [b.id, b.name]));

  console.log(
    `  ${allCanonicalProducts.length} active canonical_products total` +
      (Number.isFinite(PRODUCT_LIMIT) ? `, processing ${canonicalProducts.length} (--limit=${PRODUCT_LIMIT})` : ", processing all") +
      `; ${categories.length} categories, ${brands.length} brands`
  );

  // ── Per-product facts ──────────────────────────────────────────────
  let productsProcessed = 0;
  let productsFailed = 0;
  let factsWouldWrite = 0;
  const factTypeCounts: Record<string, number> = {};

  for (const p of canonicalProducts) {
    const id = p.id as string;
    const name = p.name as string;
    const brandId = p.brand_id as string | null;
    const categoryId = p.category_id as string | null;
    const specifications = (p.specifications as Record<string, string> | null) ?? null;

    const signature = buildProductSignature({ id, name, brandName: brandId ? (brandNameById.get(brandId) ?? null) : null, specifications });
    const facts: LearnedFactInput[] = factsFromProductSignature(id, signature, null);

    const realCategorySlug = categoryId ? categorySlugById.get(categoryId) : undefined;
    if (realCategorySlug) {
      const universalNode = findNodeByRealCategorySlug(realCategorySlug);
      if (universalNode) facts.push(factCategoryFromTaxonomy(id, universalNode.slug, null));
    }

    const brandName = brandId ? brandNameById.get(brandId) : undefined;
    if (brandName) facts.push(factBrandFromNormalization(id, normalizeBrandName(brandName), null));

    for (const f of facts) factTypeCounts[f.factType] = (factTypeCounts[f.factType] ?? 0) + 1;
    factsWouldWrite += facts.length;
    productsProcessed++;

    // Program Ω — Mission Ω-2, Objetivo 6 finding: learnFacts has no
    // per-item fault isolation. Per-PRODUCT isolation here (one failing
    // product's facts never abort the rest of the backfill) is the
    // mitigation available without changing MarketplaceMemoryService
    // itself (out of scope for a validation Mission) — a fact-level fix
    // remains a named gap for a future Mission.
    if (EXECUTE && facts.length > 0) {
      try {
        await service.learnFacts(facts);
      } catch (err) {
        productsFailed++;
        console.error(`  [FAILED] product ${id}: ${String(err)}`);
      }
    }
    if (productsProcessed % 4000 === 0) console.log(`  ...${productsProcessed}/${canonicalProducts.length} products`);
  }

  console.log(`\n=== Per-product facts ===`);
  console.log(`Products processed: ${productsProcessed}`);
  console.log(`Products failed (isolated, did not abort the run): ${productsFailed}`);
  console.log(`Facts ${EXECUTE ? "written" : "that would be written"}: ${factsWouldWrite}`);
  console.log(`By fact type:`, factTypeCounts);

  // ── Merchant patterns (real raw products.specifications, per store) ──
  const { data: stores } = await supabase.from("stores").select("id, slug");
  let patternsWouldWrite = 0;
  let patternProductsScanned = 0;
  let patternsFailed = 0;

  const perStoreOfferLimit = Number.isFinite(PRODUCT_LIMIT) ? Math.max(50, Math.ceil(PRODUCT_LIMIT / 4)) : 5000;
  for (const store of (stores ?? []) as { id: string; slug: string }[]) {
    const { data: offers } = await supabase.from("offers").select("product_id").eq("store_id", store.id).limit(perStoreOfferLimit);
    const productIds = Array.from(new Set((offers ?? []).map((o: { product_id: string }) => o.product_id)));
    if (productIds.length === 0) continue;

    const rawProducts = await fetchAll<{ specifications: Record<string, string> | null }>(async (from, to) =>
      await supabase.from("products").select("specifications").in("id", productIds).range(from, to)
    );

    const seenThisStore = new Map<string, number>(); // rawKey -> count observed in this run
    for (const rp of rawProducts) {
      patternProductsScanned++;
      for (const rawKey of Object.keys(rp.specifications ?? {})) {
        const concept = resolveOfficialKey(rawKey);
        if (!concept) continue;
        seenThisStore.set(rawKey, (seenThisStore.get(rawKey) ?? 0) + 1);
      }
    }

    for (const [rawKey, count] of seenThisStore.entries()) {
      const concept = resolveOfficialKey(rawKey)!;
      patternsWouldWrite++;
      if (EXECUTE) {
        try {
          for (let i = 0; i < count; i++) {
            await service.observePattern({
              storeId: store.id,
              rawKey,
              concept: concept as MerchantAttributePatternInput["concept"],
              confidence: "medium",
              algorithmVersion: "1.0.0",
            });
          }
        } catch (err) {
          patternsFailed++;
          console.error(`  [FAILED] pattern (${store.slug}, "${rawKey}"): ${String(err)}`);
        }
      }
    }
  }

  console.log(`\n=== Merchant patterns ===`);
  console.log(`Raw products scanned across all stores: ${patternProductsScanned}`);
  console.log(`Distinct (store, rawKey) patterns ${EXECUTE ? "written" : "that would be written"}: ${patternsWouldWrite}`);
  console.log(`Patterns failed (isolated, did not abort the run): ${patternsFailed}`);

  console.log(`\n${EXECUTE ? "Data written to Supabase." : "No writes (dry-run). Use --execute to apply."}`);
}

main().catch((err) => {
  console.error("[marketplace-memory-backfill] Fatal:", err);
  process.exit(1);
});
