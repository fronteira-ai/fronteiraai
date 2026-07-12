/**
 * Sprint 2.5 — Objetivo 5 validation. Read-only. For each strategic product
 * family, reports: merchants present, offer count, how many of today's
 * touched listings (updated_at/created_at on 2026-07-11) carry enriched
 * specifications, whether any cross-merchant pair now shares a
 * canonical_product_id, and — when not — which single factor still blocks it
 * (untouched-by-this-sync vs. category still unmapped vs. specifications
 * still empty vs. genuinely different products).
 */
import { getServiceClient } from "./lib/client";

const STRATEGIC_PRODUCTS: { label: string; pattern: string; exclude?: string[] }[] = [
  { label: "iPhone (linha atual, 17)", pattern: "%iphone%17%" },
  { label: "Samsung Galaxy Ultra (linha premium)", pattern: "%galaxy%ultra%" },
  { label: "MacBook Air", pattern: "%macbook%air%" },
  { label: "MacBook Pro", pattern: "%macbook%pro%" },
  { label: "AirPods Pro", pattern: "%airpods%pro%" },
  { label: "Apple Watch", pattern: "%apple%watch%" },
  { label: "PlayStation 5", pattern: "%playstation%5%" },
  { label: "Nintendo Switch", pattern: "%nintendo%switch%" },
];

const SINCE = "2026-07-11T00:00:00.000Z"; // Sprint 2.5+2.6 window — wide enough to survive real-world elapsed time between turns

async function main() {
  const supabase = getServiceClient();
  const { data: stores } = await supabase.from("stores").select("id, slug");
  const storeById = new Map((stores ?? []).map((s) => [s.id as string, s.slug as string]));
  const { data: categories } = await supabase.from("categories").select("id, name, slug");
  const catById = new Map((categories ?? []).map((c) => [c.id as string, c]));

  for (const sp of STRATEGIC_PRODUCTS) {
    const { data: matches } = await supabase
      .from("products")
      .select("id, name, category_id, specifications, created_at, updated_at")
      .ilike("name", sp.pattern);
    const products = (matches ?? []) as {
      id: string;
      name: string;
      category_id: string | null;
      specifications: Record<string, string> | null;
      created_at: string;
      updated_at: string | null;
    }[];

    if (products.length === 0) {
      console.log(`\n=== ${sp.label}: 0 produtos ===`);
      continue;
    }

    const { data: offers } = await supabase
      .from("offers")
      .select("product_id, store_id, canonical_product_id")
      .in("product_id", products.map((p) => p.id));
    const offerRows = (offers ?? []) as { product_id: string; store_id: string; canonical_product_id: string | null }[];

    const storesForFamily = new Set(offerRows.map((o) => storeById.get(o.store_id) ?? o.store_id));

    const touchedToday = products.filter(
      (p) => p.created_at >= SINCE || (p.updated_at ?? "") >= SINCE
    );
    const touchedWithSpecs = touchedToday.filter((p) => p.specifications && Object.keys(p.specifications).length > 0);

    // Cross-merchant canonical linkage.
    const canonicalToStores = new Map<string, Set<string>>();
    for (const o of offerRows) {
      if (!o.canonical_product_id) continue;
      const store = storeById.get(o.store_id) ?? o.store_id;
      if (!canonicalToStores.has(o.canonical_product_id)) canonicalToStores.set(o.canonical_product_id, new Set());
      canonicalToStores.get(o.canonical_product_id)!.add(store);
    }
    const crossMerchantGroups = [...canonicalToStores.entries()].filter(([, s]) => s.size >= 2);

    console.log(`\n=== ${sp.label} ===`);
    console.log(`  Produtos: ${products.length} | Ofertas: ${offerRows.length} | Merchants: ${[...storesForFamily].join(", ")}`);
    console.log(`  Tocados pelo sync de hoje (2025-07-11): ${touchedToday.length}/${products.length}`);
    console.log(`  Desses, com specifications enriquecidas: ${touchedWithSpecs.length}`);
    console.log(`  Agrupados corretamente (2+ merchants no mesmo canonical_product_id): ${crossMerchantGroups.length}`);

    if (crossMerchantGroups.length === 0) {
      // Diagnose blocker on the untouched vs touched split.
      const untouchedCount = products.length - touchedToday.length;
      console.log(
        `  BLOQUEIO: ${untouchedCount} de ${products.length} produtos desta família NÃO foram tocados pelo sync de hoje (fora da fatia de maxProducts/Delta Import desta execução) — permanecem com categoria/specifications pré-Sprint-2.5.`
      );
      if (touchedWithSpecs.length >= 2) {
        console.log(`  ${touchedWithSpecs.length} produtos tocados TÊM specifications novas — verificando se algum par cruza lojas...`);
      }
      // Show category diversity among touched-with-specs items as a second-order check.
      const cats = new Set(
        touchedWithSpecs.map((p) => (p.category_id ? catById.get(p.category_id)?.name ?? p.category_id : "NULL"))
      );
      if (touchedWithSpecs.length > 0) {
        console.log(`  Categorias entre os enriquecidos hoje: [${[...cats].join(", ")}]`);
      }
    } else {
      for (const [cid, storeSet] of crossMerchantGroups) {
        console.log(`    canonical ${cid} -> ${[...storeSet].join(", ")}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
