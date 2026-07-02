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

  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, name, brand_id, category_id, image_url, specifications");

  if (error) {
    console.error("[canonical-catalog-bootstrap] Failed to load products:", error.message);
    process.exit(1);
  }

  let created = 0;
  let alreadyExisted = 0;
  let offersLinked = 0;
  let mergeSuggestionRuns = 0;
  let failed = 0;

  for (const product of (products ?? []) as ProductRow[]) {
    try {
      const existing = await catalogRepo.findBySlug(product.slug);
      let canonicalProductId: string | null = existing?.id ?? null;

      if (existing) {
        alreadyExisted++;
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
  console.log(`  Failed                : ${failed}`);
  console.log(`\n${EXECUTE ? "Data written to Supabase." : "No writes (dry-run). Use --execute to apply."}`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[canonical-catalog-bootstrap] Fatal:", err);
  process.exit(1);
});
