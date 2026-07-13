// Release 1.7 — Wave 4 — Canonical Catalog bootstrap.
//
// Bootstrap, not a merge (CTO mission): every existing `products` row maps
// to exactly one `canonical_products` row, 1:1 and lossless — this is not a
// "union" of anything, so it doesn't touch the Shadow Mode / no-auto-merge
// rule. After bootstrapping, seeds merge candidate *suggestions* between
// same-brand canonical products (still Shadow Mode — nothing is merged).
//
// Same --execute convention as scripts/import-json.ts: dry-run by default.

import { getServiceClient } from "./lib/client";
import { createCanonicalCatalogServices } from "../lib/canonical-catalog-factory";

const EXECUTE = process.argv.includes("--execute");

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  image_url: string | null;
  specifications: Record<string, string> | null;
}

interface OfferRow {
  id: string;
  canonical_product_id: string | null;
}

async function main() {
  console.log(`\n[canonical-catalog-bootstrap] Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

  const supabase = getServiceClient();
  const { catalogRepo, canonicalProductService, mergeSuggestionService } = createCanonicalCatalogServices(supabase);

  // Paginated — a plain .select() is silently capped at PostgREST's default
  // row limit (1000). Left unpaginated, this script would only ever process
  // the first 1000 products regardless of real catalog size, understating
  // "Products processed" without any error (found real during Wave Ξ-2,
  // Program Ξ, once the catalog crossed 1000 rows).
  const PAGE = 1000;
  const products: ProductRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, name, brand_id, category_id, image_url, specifications")
      .range(from, from + PAGE - 1);

    if (error) {
      console.error("[canonical-catalog-bootstrap] Failed to load products:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    products.push(...(data as ProductRow[]));
    if (data.length < PAGE) break;
  }

  let created = 0;
  let alreadyExisted = 0;
  let offersLinked = 0;
  let mergeSuggestionRuns = 0;
  let failed = 0;
  // Fase 2 — Sprint 2.8 (Canonical Catalog Synchronization).
  let synced = 0;
  let driftCandidates = 0;
  let brandDriftDetected = 0;
  const driftByField: Record<string, number> = {};

  for (const product of (products ?? []) as ProductRow[]) {
    try {
      const existing = await catalogRepo.findBySlug(product.slug);
      let canonicalProductId: string | null = existing?.id ?? null;

      if (existing) {
        alreadyExisted++;
        const drifts = canonicalProductService.diffFromProduct(existing, {
          slug: product.slug,
          name: product.name,
          brandId: product.brand_id,
          categoryId: product.category_id,
          imageUrl: product.image_url,
          specifications: product.specifications,
        });
        if (drifts.length > 0) {
          driftCandidates++;
          for (const d of drifts) {
            driftByField[d.field] = (driftByField[d.field] ?? 0) + 1;
            if (d.field === "brandId") brandDriftDetected++;
          }
          if (EXECUTE) {
            const { updated } = await canonicalProductService.syncFromProduct(existing, {
              slug: product.slug,
              name: product.name,
              brandId: product.brand_id,
              categoryId: product.category_id,
              imageUrl: product.image_url,
              specifications: product.specifications,
            });
            if (updated) synced++;
          } else {
            console.log(`[dry-run] would sync ${drifts.map((d) => d.field).join(",")} for "${product.slug}"`);
          }
        }
      } else if (!EXECUTE) {
        console.log(`[dry-run] would create canonical product for "${product.slug}"`);
        created++;
      } else {
        const canonicalProduct = await canonicalProductService.bootstrapFromProduct({
          slug: product.slug,
          name: product.name,
          brandId: product.brand_id,
          categoryId: product.category_id,
          imageUrl: product.image_url,
          specifications: product.specifications,
        });
        created++;
        canonicalProductId = canonicalProduct.id;
      }

      if (!canonicalProductId) continue; // dry-run: nothing to link/seed yet, nothing was created

      const { data: offers, error: offersError } = await supabase
        .from("offers")
        .select("id, canonical_product_id")
        .eq("product_id", product.id);
      if (offersError) throw new Error(offersError.message);

      for (const offer of (offers ?? []) as OfferRow[]) {
        if (offer.canonical_product_id === canonicalProductId) continue; // already linked — idempotent
        if (EXECUTE) await catalogRepo.linkOffer(offer.id, canonicalProductId);
        offersLinked++;
      }

      if (EXECUTE) {
        await mergeSuggestionService.suggestMergesFor(canonicalProductId);
        mergeSuggestionRuns++;
      }
    } catch (err) {
      failed++;
      console.error(`[canonical-catalog-bootstrap] Failed for product "${product.slug}":`, String(err));
    }
  }

  console.log("\n[canonical-catalog-bootstrap] Summary:");
  console.log(`  Products processed    : ${(products ?? []).length}`);
  console.log(`  Canonical created     : ${created}`);
  console.log(`  Canonical pre-existed : ${alreadyExisted}`);
  console.log(`  Offers linked         : ${offersLinked}`);
  console.log(`  Merge suggestion runs : ${mergeSuggestionRuns} (each may or may not have written a MergeCandidate — see logs)`);
  console.log(`  Pre-existing w/ drift : ${driftCandidates} (${EXECUTE ? "synced" : "dry-run, not written"}: ${synced})`);
  console.log(`  Drift by field        : ${JSON.stringify(driftByField)}`);
  console.log(`  brand_id drift        : ${brandDriftDetected} (expected ~0 — Sprint 2.3 found brand extraction doesn't fragment; a nonzero count here is a data-integrity signal, not routine sync)`);
  console.log(`  Failed                : ${failed}`);
  console.log(`\n${EXECUTE ? "Data written to Supabase." : "No writes (dry-run). Use --execute to apply."}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[canonical-catalog-bootstrap] Fatal:", err);
  process.exit(1);
});
