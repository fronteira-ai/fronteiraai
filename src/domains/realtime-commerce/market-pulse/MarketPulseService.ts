import type { SupabaseClient } from "@supabase/supabase-js";
import { ChangeType } from "../enums";
import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { CategoryMovement, MarketChange, MarketPulseSnapshot, StoreMovement, TopMover } from "../types";

/** Bounded sample for the category/store breakdown — see TECH_DEBT.md
 * "Market Pulse aggregation bound". Counts (changed/dropped/raised/added/
 * removed) use indexed COUNT queries instead and are exact regardless of
 * volume. */
const BREAKDOWN_SAMPLE_LIMIT = 3000;
const TOP_N = 5;

/** Epic 6 — Market Pulse Engine. Answers the Wave brief's nine questions
 * about "what changed today" from market_changes — never a second source of
 * truth, always derived. */
export class MarketPulseService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly changeRepo: IMarketChangeRepository
  ) {}

  async computeToday(): Promise<MarketPulseSnapshot> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return this.computeForRange(from, now);
  }

  async computeForRange(from: Date, to: Date): Promise<MarketPulseSnapshot> {
    const [pricesChangedCount, pricesDroppedCount, pricesRaisedCount, productsAddedCount, productsRemovedCount, sample] =
      await Promise.all([
        this.changeRepo.countInRange(from, to, { changeTypes: [ChangeType.PriceIncreased, ChangeType.PriceDecreased] }),
        this.changeRepo.countInRange(from, to, { changeTypes: [ChangeType.PriceDecreased] }),
        this.changeRepo.countInRange(from, to, { changeTypes: [ChangeType.PriceIncreased] }),
        this.changeRepo.countInRange(from, to, { changeTypes: [ChangeType.ProductCreated] }),
        this.changeRepo.countInRange(from, to, { changeTypes: [ChangeType.ProductRemoved] }),
        this.changeRepo.listInRange(from, to, BREAKDOWN_SAMPLE_LIMIT),
      ]);

    const { topCategories, cheapestCategory, mostExpensiveMoveCategory } = await this.categoryBreakdown(sample);
    const topStores = await this.storeBreakdown(sample);

    return {
      snapshotDate: from.toISOString().slice(0, 10),
      pricesChangedCount,
      pricesDroppedCount,
      pricesRaisedCount,
      productsAddedCount,
      productsRemovedCount,
      topCategories,
      topStores,
      cheapestCategory,
      mostExpensiveMoveCategory,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Top N products by absolute price swing within the range — the largest
   * single price_increased/price_decreased move per product, not a sum. */
  async getTopMovers(from: Date, to: Date, limit: number = TOP_N): Promise<TopMover[]> {
    const sample = await this.changeRepo.listInRange(from, to, BREAKDOWN_SAMPLE_LIMIT);
    const priceChanges = sample.filter(
      (c) => (c.changeType === ChangeType.PriceIncreased || c.changeType === ChangeType.PriceDecreased) && c.productId
    );
    if (priceChanges.length === 0) return [];

    const bestPerProduct = new Map<string, MarketChange & { pct: number }>();
    for (const change of priceChanges) {
      const before = change.previousValue !== null ? Number(change.previousValue) : null;
      const after = change.currentValue !== null ? Number(change.currentValue) : null;
      if (before === null || after === null || before === 0) continue;
      const pct = (after - before) / before;

      const key = change.productId as string;
      const existing = bestPerProduct.get(key);
      if (!existing || Math.abs(pct) > Math.abs(existing.pct)) {
        bestPerProduct.set(key, { ...change, pct });
      }
    }

    const top = [...bestPerProduct.values()].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)).slice(0, limit);
    if (top.length === 0) return [];

    const productIds = [...new Set(top.map((c) => c.productId as string))];
    const storeIds = [...new Set(top.map((c) => c.storeId).filter((id): id is string => !!id))];

    const [{ data: products }, { data: stores }] = await Promise.all([
      this.client.from("products").select("id, name").in("id", productIds),
      storeIds.length > 0
        ? this.client.from("stores").select("id, name").in("id", storeIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);

    const productNameById = new Map<string, string>(((products ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
    const storeNameById = new Map<string, string>(((stores ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));

    return top.map((c) => ({
      productId: c.productId as string,
      productName: productNameById.get(c.productId as string) ?? c.productId ?? "",
      storeId: c.storeId,
      storeName: c.storeId ? (storeNameById.get(c.storeId) ?? null) : null,
      previousValue: c.previousValue,
      currentValue: c.currentValue,
      percentChange: c.pct,
      changeType: c.changeType,
      detectedAt: c.detectedAt,
    }));
  }

  private async categoryBreakdown(sample: MarketChange[]): Promise<{
    topCategories: CategoryMovement[];
    cheapestCategory: CategoryMovement | null;
    mostExpensiveMoveCategory: CategoryMovement | null;
  }> {
    const priceChanges = sample.filter(
      (c) => (c.changeType === ChangeType.PriceIncreased || c.changeType === ChangeType.PriceDecreased) && c.productId
    );
    if (priceChanges.length === 0) return { topCategories: [], cheapestCategory: null, mostExpensiveMoveCategory: null };

    const productIds = [...new Set(priceChanges.map((c) => c.productId as string))];
    const { data: products } = await this.client
      .from("products")
      .select("id, category_id, categories(name)")
      .in("id", productIds);

    type ProductRow = { id: string; category_id: string | null; categories: { name: string } | { name: string }[] | null };
    const categoryByProduct = new Map<string, { id: string; name: string }>();
    for (const p of (products ?? []) as ProductRow[]) {
      if (!p.category_id) continue;
      const cat = Array.isArray(p.categories) ? p.categories[0] : p.categories;
      categoryByProduct.set(p.id, { id: p.category_id, name: cat?.name ?? "Sem categoria" });
    }

    const byCategory = new Map<string, { categoryName: string; count: number; pctSum: number }>();
    for (const change of priceChanges) {
      const cat = categoryByProduct.get(change.productId as string);
      if (!cat) continue;
      const before = change.previousValue !== null ? Number(change.previousValue) : null;
      const after = change.currentValue !== null ? Number(change.currentValue) : null;
      const pct = before && after && before !== 0 ? (after - before) / before : 0;

      const entry = byCategory.get(cat.id) ?? { categoryName: cat.name, count: 0, pctSum: 0 };
      entry.count += 1;
      entry.pctSum += pct;
      byCategory.set(cat.id, entry);
    }

    const movements: CategoryMovement[] = [...byCategory.entries()].map(([categoryId, v]) => ({
      categoryId,
      categoryName: v.categoryName,
      changeCount: v.count,
      avgPercentChange: v.count > 0 ? v.pctSum / v.count : 0,
    }));

    const topCategories = [...movements].sort((a, b) => b.changeCount - a.changeCount).slice(0, TOP_N);
    const cheapestCategory = movements.length
      ? [...movements].sort((a, b) => a.avgPercentChange - b.avgPercentChange)[0]
      : null;
    const mostExpensiveMoveCategory = movements.length
      ? [...movements].sort((a, b) => b.avgPercentChange - a.avgPercentChange)[0]
      : null;

    return { topCategories, cheapestCategory, mostExpensiveMoveCategory };
  }

  private async storeBreakdown(sample: MarketChange[]): Promise<StoreMovement[]> {
    const storeIds = [...new Set(sample.map((c) => c.storeId).filter((id): id is string => !!id))];
    if (storeIds.length === 0) return [];

    const { data: stores } = await this.client.from("stores").select("id, name").in("id", storeIds);
    const nameById = new Map<string, string>(((stores ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));

    const counts = new Map<string, number>();
    for (const change of sample) {
      if (!change.storeId) continue;
      counts.set(change.storeId, (counts.get(change.storeId) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([storeId, changeCount]) => ({ storeId, storeName: nameById.get(storeId) ?? storeId, changeCount }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, TOP_N);
  }
}
