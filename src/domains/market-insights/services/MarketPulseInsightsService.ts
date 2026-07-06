import type { ICanonicalCatalogRepository, CanonicalProduct } from "@/src/domains/canonical-catalog";
import { MarketPulseService } from "@/src/domains/realtime-commerce";
import type { CanonicalMarketMover } from "../types/market-pulse.types";

const DEFAULT_LIMIT = 10;

/**
 * Objective 3 (Market Pulse) — deliberately thin. "Quais lojas mais
 * atualizaram" and "quais categorias estão mais movimentadas" are already
 * fully answered by `MarketPulseService.computeToday()` (realtime-commerce,
 * Program A Wave 2) — callers should call that directly, this service does
 * not wrap or re-expose it. The one real gap this Wave closes is "quais
 * produtos tiveram maior queda/alta hoje" at the *canonical* level: today's
 * raw-product movers, rolled up so the same real-world product isn't
 * reported twice because two different stores' `products` rows both moved.
 */
export class MarketPulseInsightsService {
  constructor(
    private readonly marketPulseService: MarketPulseService,
    private readonly catalogRepo: ICanonicalCatalogRepository
  ) {}

  async getCanonicalMarketMovers(from: Date, to: Date, limit: number = DEFAULT_LIMIT): Promise<CanonicalMarketMover[]> {
    const rawMovers = await this.marketPulseService.getTopMovers(from, to, limit * 3);
    if (rawMovers.length === 0) return [];

    const canonicalIds = await Promise.all(rawMovers.map((m) => this.catalogRepo.findCanonicalProductIdByProductId(m.productId)));

    const bestPerCanonical = new Map<string, { mover: (typeof rawMovers)[number]; canonicalProductId: string }>();
    rawMovers.forEach((mover, i) => {
      const canonicalProductId = canonicalIds[i];
      if (!canonicalProductId) return; // not yet linked (Product Identity Shadow Mode) — excluded, never guessed

      const existing = bestPerCanonical.get(canonicalProductId);
      if (!existing || Math.abs(mover.percentChange) > Math.abs(existing.mover.percentChange)) {
        bestPerCanonical.set(canonicalProductId, { mover, canonicalProductId });
      }
    });

    const top = [...bestPerCanonical.values()]
      .sort((a, b) => Math.abs(b.mover.percentChange) - Math.abs(a.mover.percentChange))
      .slice(0, limit);

    const canonicalProducts = await Promise.all(top.map((t) => this.catalogRepo.findById(t.canonicalProductId)));
    const canonicalById = new Map<string, CanonicalProduct>(
      canonicalProducts.filter((p): p is CanonicalProduct => p !== null).map((p) => [p.id, p])
    );

    return top.map(({ mover, canonicalProductId }) => ({
      canonicalProductId,
      productId: mover.productId,
      productName: canonicalById.get(canonicalProductId)?.name ?? mover.productName,
      storeId: mover.storeId,
      storeName: mover.storeName,
      previousValue: mover.previousValue,
      currentValue: mover.currentValue,
      percentChange: mover.percentChange,
      changeType: mover.changeType,
      detectedAt: mover.detectedAt,
    }));
  }
}
