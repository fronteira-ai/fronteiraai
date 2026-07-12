/**
 * Product Comparison Simulation — Fase 2, Sprint 2.3, Objetivo 4.
 *
 * Read-only, in-memory only. No writes to merge_candidates, canonical_products,
 * or offers. No Product Identity / Shadow Mode change.
 *
 * Clusters the same strategic-product sample used by
 * product-comparison-audit.ts by a normalized signature (brand + storage
 * capacity + color, extracted from the product name with regex) instead of
 * category_id — the dimension SEÇÃO 2 of that audit showed is fragmented
 * across merchants (41 distinct category rows for what should be ~6 real
 * categories). This approximates "what if the brand/category gate didn't
 * block genuinely-identical SKUs" without recomputing or changing
 * ProductIdentityEngine itself — pure client-side grouping over already-public
 * product names.
 *
 * Uso: npx tsx scripts/product-comparison-simulation.ts
 */

import { getServiceClient } from "./lib/client";

const STRATEGIC_PRODUCTS: { label: string; pattern: string; exclude?: string[] }[] = [
  { label: "iPhone 17 Pro Max", pattern: "%iphone%17%pro%max%" },
  { label: "iPhone 17 Pro", pattern: "%iphone%17%pro%", exclude: ["max"] },
  { label: "Samsung Galaxy Ultra", pattern: "%galaxy%ultra%" },
  { label: "MacBook Air", pattern: "%macbook%air%" },
  { label: "MacBook Pro", pattern: "%macbook%pro%" },
  { label: "AirPods Pro", pattern: "%airpods%pro%" },
  { label: "Apple Watch", pattern: "%apple%watch%" },
  { label: "PlayStation 5", pattern: "%playstation%5%" },
  { label: "Nintendo Switch", pattern: "%nintendo%switch%" },
];

const COLOR_WORDS = [
  "prata", "silver", "preto", "black", "branco", "white", "azul", "blue", "rosa", "pink",
  "dourado", "gold", "cinza", "gray", "grey", "roxo", "purple", "laranja", "orange",
  "verde", "green", "vermelho", "red", "titanio", "titânio", "titanium", "starlight",
  "midnight", "graphite", "grafite", "cosmic",
];

function normalizeSignature(name: string, brandSlug: string): string {
  const lower = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  const storageMatch = /(\d+)\s*(tb|gb)\b/.exec(lower);
  const storage = storageMatch ? `${storageMatch[1]}${storageMatch[2]}` : "no-storage";

  const color = COLOR_WORDS.find((c) => lower.includes(c)) ?? "no-color";

  // Model line hint: pull out the primary product-line token sequence
  // (e.g. "17 pro max", "s25 ultra", "air m4") — first 4 alphanumeric tokens
  // after the brand-ish words, skipping SKU codes (mixed letter+digit tokens
  // longer than 5 chars, which are store-specific part numbers, not identity).
  const tokens = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .filter((t) => !/^[a-z]{1,3}\d{3,}[a-z]{0,3}\d?$/.test(t)); // drop SKU-like tokens

  return `${brandSlug}|${tokens.slice(0, 6).join("-")}|${storage}|${color}`;
}

interface Row {
  productId: string;
  name: string;
  brandSlug: string;
  storeSlug: string;
  canonicalProductId: string | null;
}

async function main() {
  const supabase = getServiceClient();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Sprint 2.3 — Comparison Simulation (in-memory only)      ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const { data: brands } = await supabase.from("brands").select("id, slug");
  const brandSlugById = new Map((brands ?? []).map((b) => [b.id as string, b.slug as string]));
  const { data: stores } = await supabase.from("stores").select("id, slug");
  const storeSlugById = new Map((stores ?? []).map((s) => [s.id as string, s.slug as string]));

  let totalRealClustersBefore = 0; // distinct canonical_product_id count across sample
  let totalRealClusters2plusBefore = 0;
  let simulatedClusters = 0;
  let simulatedClusters2plus = 0;
  let simulatedClusters3plus = 0;

  for (const sp of STRATEGIC_PRODUCTS) {
    const { data: matches } = await supabase
      .from("products")
      .select("id, name, brand_id")
      .ilike("name", sp.pattern);
    let filtered = (matches ?? []) as { id: string; name: string; brand_id: string | null }[];
    if (sp.exclude) filtered = filtered.filter((p) => !sp.exclude!.some((ex) => p.name.toLowerCase().includes(ex)));
    if (filtered.length === 0) {
      console.log(`\n=== ${sp.label}: 0 produtos, pulado ===`);
      continue;
    }

    const productIds = filtered.map((p) => p.id);
    const { data: offers } = await supabase
      .from("offers")
      .select("product_id, store_id, canonical_product_id")
      .in("product_id", productIds);

    const rows: Row[] = (offers ?? []).map((o) => {
      const product = filtered.find((p) => p.id === o.product_id)!;
      return {
        productId: product.id,
        name: product.name,
        brandSlug: product.brand_id ? brandSlugById.get(product.brand_id) ?? "unknown" : "unknown",
        storeSlug: storeSlugById.get(o.store_id as string) ?? (o.store_id as string),
        canonicalProductId: (o.canonical_product_id as string | null) ?? null,
      };
    });

    // Real world today: distinct canonical_product_id -> set of stores.
    const realByCanonical = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!r.canonicalProductId) continue;
      if (!realByCanonical.has(r.canonicalProductId)) realByCanonical.set(r.canonicalProductId, new Set());
      realByCanonical.get(r.canonicalProductId)!.add(r.storeSlug);
    }
    const real2plus = [...realByCanonical.values()].filter((s) => s.size >= 2).length;
    totalRealClustersBefore += realByCanonical.size;
    totalRealClustersBefore = totalRealClustersBefore; // no-op, keeps lint happy about reassign pattern
    totalRealClusters2plusBefore += real2plus;

    // Simulated: cluster by normalized signature instead of canonical_product_id.
    const simByGroup = new Map<string, Set<string>>();
    for (const r of rows) {
      const sig = normalizeSignature(r.name, r.brandSlug);
      if (!simByGroup.has(sig)) simByGroup.set(sig, new Set());
      simByGroup.get(sig)!.add(r.storeSlug);
    }
    const sim2plus = [...simByGroup.values()].filter((s) => s.size >= 2).length;
    const sim3plus = [...simByGroup.values()].filter((s) => s.size >= 3).length;
    simulatedClusters += simByGroup.size;
    simulatedClusters2plus += sim2plus;
    simulatedClusters3plus += sim3plus;

    console.log(`\n=== ${sp.label} ===`);
    console.log(`  Ofertas: ${rows.length} | Produtos distintos: ${filtered.length}`);
    console.log(`  HOJE (canonical_product_id real): ${realByCanonical.size} clusters, ${real2plus} com 2+ merchants`);
    console.log(`  SIMULADO (assinatura marca+capacidade+cor): ${simByGroup.size} clusters, ${sim2plus} com 2+ merchants, ${sim3plus} com 3+ merchants`);

    const multiStoreSignatures = [...simByGroup.entries()].filter(([, stores]) => stores.size >= 2);
    for (const [sig, storeSet] of multiStoreSignatures) {
      const examples = rows.filter((r) => normalizeSignature(r.name, r.brandSlug) === sig);
      console.log(`    · [${sig}] -> stores: ${[...storeSet].join(", ")}`);
      for (const ex of examples.slice(0, 4)) {
        console.log(`        "${ex.name}" (${ex.storeSlug})`);
      }
    }
  }

  console.log("\n\n── RESUMO DA AMOSTRA ESTRATÉGICA ──\n");
  console.log(`HOJE:      ${totalRealClustersBefore} clusters (canonical_product_id), ${totalRealClusters2plusBefore} comparáveis (2+ merchants)`);
  console.log(`SIMULADO:  ${simulatedClusters} clusters (assinatura), ${simulatedClusters2plus} comparáveis (2+), ${simulatedClusters3plus} comparáveis (3+)`);
  console.log(`Ganho simulado nesta amostra: +${simulatedClusters2plus - totalRealClusters2plusBefore} produtos comparáveis (2+ merchants)`);

  console.log("\n[product-comparison-simulation] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
