/**
 * Sprint 2.7 — spot check: does canonical_products.specifications reflect
 * the Sprint 2.5/2.6 backfill, or is it stale from first bootstrap (since
 * CanonicalProductService.bootstrapFromProduct never updates an existing
 * canonical_products row)? Read-only.
 *
 * Uso: npx tsx scripts/sprint27-stale-specs-check.ts
 */
import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();

  const { data: canonical } = await supabase
    .from("canonical_products")
    .select("id, canonical_slug, name, specifications, updated_at, created_at")
    .ilike("name", "%iphone%17%pro%max%")
    .limit(30);

  let canonicalEmpty = 0;
  let canonicalNonEmpty = 0;
  let productRicherThanCanonical = 0;
  let checked = 0;

  for (const c of canonical ?? []) {
    const specs = (c.specifications as Record<string, string> | null) ?? {};
    const specKeys = Object.keys(specs).length;
    if (specKeys === 0) canonicalEmpty++;
    else canonicalNonEmpty++;

    const { data: product } = await supabase
      .from("products")
      .select("slug, specifications, updated_at")
      .eq("slug", c.canonical_slug as string)
      .maybeSingle();
    checked++;
    const productSpecKeys = product ? Object.keys((product.specifications as Record<string, string> | null) ?? {}).length : -1;
    if (productSpecKeys > specKeys) productRicherThanCanonical++;

    console.log(
      `canonical="${c.name}" slug=${c.canonical_slug} canonical.specKeys=${specKeys} canonical.updated_at=${c.updated_at} | product.specKeys=${productSpecKeys} product.updated_at=${product?.updated_at ?? "N/A"}`
    );
  }

  console.log(`\nAmostra: ${checked}`);
  console.log(`canonical_products com specifications vazio: ${canonicalEmpty}`);
  console.log(`canonical_products com specifications não-vazio: ${canonicalNonEmpty}`);
  console.log(`Casos onde products.specifications é mais rico que canonical_products.specifications: ${productRicherThanCanonical}`);
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
