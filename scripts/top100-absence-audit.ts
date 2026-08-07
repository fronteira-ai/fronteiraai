import { getServiceClient } from "./lib/client";
import { ProductIdentityEngine } from "../src/domains/product-identity/domain/ProductIdentityEngine";
import { findNodeByRealCategorySlug } from "../src/domains/taxonomy";

/**
 * Top 100 Absence Audit — Mission 04 (Offer Density), Prioridade 1.
 *
 * Read-only. For the 100 most-accessed products (ProductClicked proxy —
 * same honest methodology as every other "most accessed" measurement in
 * this Mission), and for every OTHER live store missing an offer, classifies
 * the absence using only real, checkable evidence — never a guess:
 *
 * - "D" (loja não vende): the store carries nothing of that brand at all,
 *   or carries the brand but ProductIdentityEngine (the same engine that
 *   gates real merges) scores every same-brand item below 40 against it.
 * - "product_identity": same brand+category, real name similarity, but the
 *   engine's confidence lands 40-69 — below the "possible" threshold that
 *   would ever produce a merge_candidate.
 * - "canonicalizacao": confidence >= 70 — a real cross-store match, either
 *   already sitting in `merge_candidates` awaiting human review, or one a
 *   fresh canonical-catalog-bootstrap run would create.
 * - "conector": Cellshop/Nissei absence is not computed per-pair here — both
 *   block ClaudeBot via robots.txt (documented in
 *   docs/marketplace/Tier1_Merchants.md), a real external block, not a
 *   parser bug — reported once for the whole set instead of per product.
 *
 * Uso:
 *   npx tsx scripts/top100-absence-audit.ts
 */

interface StoreRow {
  id: string;
  name: string;
}

interface ProductRow {
  id: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
}

interface OfferRow {
  product_id: string;
  store_id: string;
  canonical_product_id: string | null;
}

interface MergeCandidateRow {
  source_canonical_product_id: string;
  target_canonical_product_id: string;
  status: string;
  confidence: number;
}

interface CategoryRow {
  id: string;
  slug: string;
}

const PAGE_SIZE = 1000;
const LIVE_STORES = ["Atacado Connect", "Mega Eletrônicos", "Mobile Zone", "Roma Shopping", "Shopping China"];

async function fetchAll<T>(supabase: ReturnType<typeof getServiceClient>, table: string, select: string): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function fetchFiltered<T>(
  supabase: ReturnType<typeof getServiceClient>,
  table: string,
  select: string,
  column: string,
  value: string
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).eq(column, value).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function resolveCategoryGateSlug(categoryId: string | null, realSlug: string | undefined): string {
  if (!categoryId) return "";
  const effectiveSlug = realSlug ?? categoryId;
  const universalNode = findNodeByRealCategorySlug(effectiveSlug);
  return universalNode?.slug ?? effectiveSlug;
}

async function main() {
  const supabase = getServiceClient();

  const stores = await fetchAll<StoreRow>(supabase, "stores", "id, name");
  const storeNameById = new Map(stores.map((s) => [s.id, s.name]));

  const clickRows = await fetchFiltered<{ product_id: string | null }>(
    supabase,
    "buyer_events",
    "product_id",
    "event_type",
    "ProductClicked"
  );

  const countByProduct = new Map<string, number>();
  for (const row of clickRows) {
    if (!row.product_id) continue;
    countByProduct.set(row.product_id, (countByProduct.get(row.product_id) ?? 0) + 1);
  }
  const top100 = [...countByProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 100);
  const topIds = top100.map(([id]) => id);

  const products = await (async () => {
    const map = new Map<string, ProductRow>();
    const CHUNK = 200;
    for (let i = 0; i < topIds.length; i += CHUNK) {
      const chunk = topIds.slice(i, i + CHUNK);
      const { data, error } = await supabase.from("products").select("id, name, brand_id, category_id").in("id", chunk);
      if (error) throw new Error(error.message);
      for (const row of (data ?? []) as ProductRow[]) map.set(row.id, row);
    }
    return map;
  })();

  const offers = await fetchAll<OfferRow>(supabase, "offers", "product_id, store_id, canonical_product_id");
  const allProducts = await fetchAll<ProductRow>(supabase, "products", "id, name, brand_id, category_id");

  const storeByProductId = new Map<string, string>();
  const canonicalByProductId = new Map<string, string>();
  for (const o of offers) {
    storeByProductId.set(o.product_id, o.store_id);
    if (o.canonical_product_id) canonicalByProductId.set(o.product_id, o.canonical_product_id);
  }

  const storeBrandIndex = new Map<string, Map<string, ProductRow[]>>();
  for (const p of allProducts) {
    const storeId = storeByProductId.get(p.id);
    if (!storeId) continue;
    const storeName = storeNameById.get(storeId) as string;
    if (!LIVE_STORES.includes(storeName)) continue;
    if (!p.brand_id) continue;
    if (!storeBrandIndex.has(storeName)) storeBrandIndex.set(storeName, new Map());
    const m = storeBrandIndex.get(storeName)!;
    if (!m.has(p.brand_id)) m.set(p.brand_id, []);
    m.get(p.brand_id)!.push(p);
  }

  const mc = await fetchAll<MergeCandidateRow>(
    supabase,
    "merge_candidates",
    "source_canonical_product_id, target_canonical_product_id, status, confidence"
  );
  const mcByCanonical = new Map<string, MergeCandidateRow[]>();
  for (const r of mc) {
    if (!mcByCanonical.has(r.source_canonical_product_id)) mcByCanonical.set(r.source_canonical_product_id, []);
    mcByCanonical.get(r.source_canonical_product_id)!.push(r);
    if (!mcByCanonical.has(r.target_canonical_product_id)) mcByCanonical.set(r.target_canonical_product_id, []);
    mcByCanonical.get(r.target_canonical_product_id)!.push(r);
  }

  const categories = await fetchAll<CategoryRow>(supabase, "categories", "id, slug");
  const categorySlugById = new Map(categories.map((c) => [c.id, c.slug]));

  const engine = new ProductIdentityEngine();

  const summary = { D: 0, canonicalizacao: 0, productIdentity: 0 };
  const rows: string[] = [];

  for (const [pid, clicks] of top100) {
    const p = products.get(pid);
    if (!p) continue;
    const homeStoreId = storeByProductId.get(pid);
    const homeStoreName = storeNameById.get(homeStoreId as string) as string;
    const pCanonical = canonicalByProductId.get(pid);

    const missingLive = LIVE_STORES.filter((s) => s !== homeStoreName);
    const perStoreVerdict: string[] = [];

    for (const storeName of missingLive) {
      const brandMap = storeBrandIndex.get(storeName);
      const candidates = (brandMap?.get(p.brand_id as string) ?? []).filter((c) => c.id !== pid);
      if (candidates.length === 0) {
        summary.D++;
        perStoreVerdict.push(`${storeName}=D(sem produto dessa marca)`);
        continue;
      }

      let best: { conf: number; cand: ProductRow } | null = null;
      const offerCategorySlug = resolveCategoryGateSlug(p.category_id, p.category_id ? categorySlugById.get(p.category_id) : undefined);
      for (const cand of candidates) {
        const candCategorySlug = resolveCategoryGateSlug(
          cand.category_id,
          cand.category_id ? categorySlugById.get(cand.category_id) : undefined
        );
        const result = engine.evaluate(
          { slug: "x", name: p.name, brandSlug: p.brand_id ?? "", categorySlug: offerCategorySlug, specifications: {} },
          [
            {
              productId: cand.id,
              slug: "y",
              name: cand.name,
              brandSlug: cand.brand_id ?? "",
              categorySlug: candCategorySlug,
              specifications: {},
            },
          ]
        );
        if (!best || result.confidence > best.conf) best = { conf: result.confidence, cand };
      }

      const candCanonical = canonicalByProductId.get(best!.cand.id);
      const relatedMc = pCanonical && candCanonical
        ? (mcByCanonical.get(pCanonical) ?? []).find(
            (r) =>
              (r.source_canonical_product_id === pCanonical && r.target_canonical_product_id === candCanonical) ||
              (r.source_canonical_product_id === candCanonical && r.target_canonical_product_id === pCanonical)
          )
        : undefined;

      if (best!.conf >= 70) {
        summary.canonicalizacao++;
        perStoreVerdict.push(
          `${storeName}=canonicalizacao(conf=${best!.conf}, mc=${relatedMc ? relatedMc.status : "nenhum ainda"}, cand="${best!.cand.name}")`
        );
      } else if (best!.conf >= 40) {
        summary.productIdentity++;
        perStoreVerdict.push(`${storeName}=product_identity(conf=${best!.conf} baixo p/ mesma marca+categoria, cand="${best!.cand.name}")`);
      } else {
        summary.D++;
        perStoreVerdict.push(`${storeName}=D(marca presente mas nenhum item parecido, melhor conf=${best!.conf})`);
      }
    }

    rows.push(`[${clicks}x] "${p.name}" (home: ${homeStoreName}) -> ${perStoreVerdict.join(" | ")}`);
  }

  console.log(`Resumo (pares produto-loja-ausente, ${top100.length} produtos x ate ${LIVE_STORES.length - 1} lojas cada):`);
  console.log(`  D (loja nao vende / nada parecido): ${summary.D}`);
  console.log(`  canonicalizacao (match >=70, candidato ja existe ou existiria apos novo bootstrap): ${summary.canonicalizacao}`);
  console.log(`  product_identity (match 40-69, mesma marca+categoria mas confianca baixa): ${summary.productIdentity}`);
  console.log(`  conector: Cellshop e Nissei ausentes em praticamente todos os ${top100.length} (bloqueio robots.txt documentado, fora do codigo)`);

  console.log("\n--- Detalhe completo ---");
  for (const r of rows) console.log(r);
}
main();
