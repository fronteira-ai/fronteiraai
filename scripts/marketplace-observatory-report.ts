/**
 * Marketplace Observatory — full KPI run, PROGRAM Ξ Wave Ξ-5.
 *
 * Read-only. Reuses existing, already-certified engines/services — no new
 * scoring logic. Computes: Marketplace Health (MarketplaceHealthEngine),
 * AI Readiness Score (formula from MARKETPLACE_TRUTH_REPORT.md — Canonical
 * Coverage + Comparable Products + Price Trend Readiness), a strategic-
 * products comparability check for named high-value SKUs, and Top 100
 * searched queries when buyer_events has search data.
 *
 * Uso:
 *   npm run observatory:report
 */

import { getServiceClient } from "./lib/client";
import { createMarketplaceOperationsServices } from "../lib/marketplace-operations-factory";

const STRATEGIC_PRODUCTS: { label: string; pattern: string; exclude?: string }[] = [
  { label: "iPhone 17 Pro Max", pattern: "%iphone%17%pro%max%" },
  { label: "iPhone 17 Pro", pattern: "%iphone%17%pro%", exclude: "max" },
  { label: "Samsung Galaxy (geral)", pattern: "%galaxy%" },
  { label: "Galaxy Ultra (topo de linha Samsung)", pattern: "%galaxy%ultra%" },
  { label: "MacBook Air", pattern: "%macbook%air%" },
  { label: "MacBook Pro", pattern: "%macbook%pro%" },
  { label: "Notebooks (geral, todas as marcas)", pattern: "%notebook%" },
  { label: "AirPods Pro", pattern: "%airpods%pro%" },
  { label: "Apple Watch", pattern: "%apple%watch%" },
  { label: "PlayStation 5", pattern: "%playstation%5%" },
  { label: "Nintendo Switch", pattern: "%nintendo%switch%" },
  { label: "Placa de vídeo — RTX", pattern: "%rtx%" },
  { label: "Placa de vídeo — Radeon", pattern: "%radeon%" },
  { label: "Smart TV", pattern: "%smart%tv%" },
];

async function main() {
  const supabase = getServiceClient();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   Marketplace Observatory — Full Report (Wave Ξ-5)       ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ── Marketplace Health (reused, not recomputed) ──────────────────────
  const { healthEngine } = createMarketplaceOperationsServices(supabase);
  const health = await healthEngine.compute();
  console.log(`Marketplace Health Score: ${health.overallScore}/100`);
  for (const f of health.factors) {
    console.log(`  - ${f.factor}: ${f.score}/100 — ${f.detail}`);
  }

  // ── AI Readiness Score (MARKETPLACE_TRUTH_REPORT.md formula) ─────────
  const [{ count: canonicalTotal }, { count: productsTotal }, { count: offersTotal }] = await Promise.all([
    supabase.from("canonical_products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("offers").select("*", { count: "exact", head: true }),
  ]);

  const { data: offerRows } = await fetchAll(supabase, "offers", "canonical_product_id, store_id");
  const storesByCanonical = new Map<string, Set<string>>();
  for (const o of offerRows as { canonical_product_id: string | null; store_id: string }[]) {
    if (!o.canonical_product_id) continue;
    if (!storesByCanonical.has(o.canonical_product_id)) storesByCanonical.set(o.canonical_product_id, new Set());
    storesByCanonical.get(o.canonical_product_id)!.add(o.store_id);
  }
  const canonicalWithOffers = storesByCanonical.size;
  const comparable2plus = [...storesByCanonical.values()].filter((s) => s.size >= 2).length;

  const { data: historyRows } = await fetchAll(supabase, "price_history", "offer_id");
  const historyCountByOffer = new Map<string, number>();
  for (const r of historyRows as { offer_id: string }[]) {
    historyCountByOffer.set(r.offer_id, (historyCountByOffer.get(r.offer_id) ?? 0) + 1);
  }
  const offersWith2plusHistory = [...historyCountByOffer.values()].filter((c) => c >= 2).length;

  const canonicalCoveragePct = productsTotal ? ((canonicalTotal ?? 0) / productsTotal) * 100 : 0;
  const comparablePct = canonicalWithOffers ? (comparable2plus / canonicalWithOffers) * 100 : 0;
  const priceTrendPct = offersTotal ? (offersWith2plusHistory / offersTotal) * 100 : 0;
  const aiReadiness = (canonicalCoveragePct + comparablePct + priceTrendPct) / 3;

  console.log(`\nAI Readiness Score: ${aiReadiness.toFixed(1)}/100`);
  console.log(`  - Canonical Coverage: ${canonicalCoveragePct.toFixed(2)}%`);
  console.log(`  - Comparable Products (2+ merchants): ${comparablePct.toFixed(2)}% (${comparable2plus}/${canonicalWithOffers})`);
  console.log(`  - Price Trend Readiness (2+ history points): ${priceTrendPct.toFixed(2)}% (${offersWith2plusHistory}/${offersTotal})`);

  // ── Strategic products ────────────────────────────────────────────────
  console.log("\n— Strategic products —");
  const { data: stores } = await supabase.from("stores").select("id, slug");
  const storeById = new Map((stores ?? []).map((s) => [s.id, s.slug as string]));

  for (const sp of STRATEGIC_PRODUCTS) {
    const { data: matches } = await supabase.from("products").select("id, name").ilike("name", sp.pattern);
    let filtered = (matches ?? []) as { id: string; name: string }[];
    if (sp.exclude) {
      filtered = filtered.filter((p) => !p.name.toLowerCase().includes(sp.exclude!));
    }

    if (filtered.length === 0) {
      console.log(`  ${sp.label}: NENHUM produto no catálogo corresponde a este padrão`);
      continue;
    }

    const productIds = filtered.map((p) => p.id);
    const { data: offersForProducts } = await supabase
      .from("offers")
      .select("product_id, store_id")
      .in("product_id", productIds);

    const storesForThis = new Set((offersForProducts ?? []).map((o) => o.store_id as string));
    const merchantNames = [...storesForThis].map((id) => storeById.get(id) ?? id);

    console.log(
      `  ${sp.label}: ${filtered.length} produto(s) no catálogo, ${offersForProducts?.length ?? 0} oferta(s), ${storesForThis.size} merchant(s) — [${merchantNames.join(", ")}]`
    );
    for (const p of filtered.slice(0, 5)) {
      console.log(`      · ${p.name}`);
    }
  }

  // ── Top searched queries (when there's data) ──────────────────────────
  console.log("\n— Top 100 produtos mais pesquisados —");
  const { data: searchEvents, error: searchErr } = await supabase
    .from("buyer_events")
    .select("search_query")
    .eq("event_type", "SearchPerformed")
    .not("search_query", "is", null)
    .limit(50000);

  if (searchErr) {
    console.log(`  Não medido — erro na consulta: ${searchErr.message}`);
  } else if (!searchEvents || searchEvents.length === 0) {
    console.log("  Não medido — nenhum evento SearchPerformed com search_query registrado ainda (sem dado real de busca de usuário).");
  } else {
    const counts = new Map<string, number>();
    for (const e of searchEvents as { search_query: string }[]) {
      counts.set(e.search_query, (counts.get(e.search_query) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100);
    top.forEach(([q, c], i) => console.log(`  ${i + 1}. "${q}" — ${c} busca(s)`));
  }

  console.log("\n[observatory-report] done.");
}

async function fetchAll(supabase: ReturnType<typeof getServiceClient>, table: string, columns: string) {
  const rows: unknown[] = [];
  let from = 0;
  const PAGE = 1000;
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (error) throw new Error(`[observatory-report] ${table} query failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return { data: rows };
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
