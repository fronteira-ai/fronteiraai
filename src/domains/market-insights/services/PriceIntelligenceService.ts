import type { ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";
import type { PriceStatistics, SavingsOpportunity } from "../types/price-intelligence.types";

export interface StoreOfferPrice {
  storeId: string;
  storeSlug: string;
  priceUSD: number;
}

const OFFER_FETCH_LIMIT = 500;

function median(sortedValues: number[]): number {
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0 ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 : sortedValues[mid];
}

/**
 * Pure — no I/O, so it's directly testable without a repository mock (this
 * codebase's established convention, see catalog-intelligence/ProductHealthService).
 * Deliberately independent of `CanonicalPriceHistoryService.computePriceAggregation`
 * (canonical-catalog): that function blends *historical* `price_history`
 * points with today's live prices to compute a trend; this one is a pure
 * cross-store snapshot of *today's* prices only — median and dispersion
 * ("faixa de preço" / "dispersão entre lojas" from the Wave brief) that the
 * existing function doesn't compute. Objective 2 explicitly asks for both
 * "atual" statistics and reuse of the Canonical Catalog — this service reads
 * live offers via `ICanonicalCatalogRepository`, the same repository
 * `CompareFoundationService` already uses, never a second query path.
 */
export function computePriceStatistics(canonicalProductId: string, offers: StoreOfferPrice[]): PriceStatistics | null {
  if (offers.length === 0) return null;

  const prices = offers.map((o) => o.priceUSD).sort((a, b) => a - b);
  const lowestPriceUSD = prices[0];
  const highestPriceUSD = prices[prices.length - 1];
  const averagePriceUSD = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const medianPriceUSD = median(prices);

  const variance = prices.reduce((sum, p) => sum + (p - averagePriceUSD) ** 2, 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const dispersionPercent = averagePriceUSD > 0 ? (stdDev / averagePriceUSD) * 100 : 0;

  return {
    canonicalProductId,
    storeCount: offers.length,
    lowestPriceUSD,
    highestPriceUSD,
    averagePriceUSD,
    medianPriceUSD,
    priceRangeUSD: highestPriceUSD - lowestPriceUSD,
    dispersionPercent,
    computedAt: new Date().toISOString(),
  };
}

/** Pure — "Loja X USD 100, Loja Y USD 83, Economia 17 USD/17%" from the Wave
 * brief's own example, computed from the same offer list as
 * `computePriceStatistics`, never a second data source. */
export function computeSavingsOpportunity(canonicalProductId: string, offers: StoreOfferPrice[]): SavingsOpportunity | null {
  if (offers.length < 2) return null;

  const sorted = [...offers].sort((a, b) => a.priceUSD - b.priceUSD);
  const cheapest = sorted[0];
  const mostExpensive = sorted[sorted.length - 1];

  const maxSavingsUSD = mostExpensive.priceUSD - cheapest.priceUSD;
  const maxSavingsPercent = mostExpensive.priceUSD > 0 ? (maxSavingsUSD / mostExpensive.priceUSD) * 100 : 0;

  return {
    canonicalProductId,
    cheapestStoreId: cheapest.storeId,
    cheapestStoreSlug: cheapest.storeSlug,
    cheapestPriceUSD: cheapest.priceUSD,
    mostExpensiveStoreId: mostExpensive.storeId,
    mostExpensiveStoreSlug: mostExpensive.storeSlug,
    mostExpensivePriceUSD: mostExpensive.priceUSD,
    maxSavingsUSD,
    maxSavingsPercent,
  };
}

/** Application-facing entry point — resolves offers via the Canonical
 * Catalog's existing repository (same one `CompareFoundationService` uses),
 * then delegates to the pure functions above. */
export class PriceIntelligenceService {
  constructor(private readonly catalogRepo: ICanonicalCatalogRepository) {}

  async getStatistics(canonicalProductId: string): Promise<PriceStatistics | null> {
    const offers = await this.fetchOfferPrices(canonicalProductId);
    return computePriceStatistics(canonicalProductId, offers);
  }

  async getSavingsOpportunity(canonicalProductId: string): Promise<SavingsOpportunity | null> {
    const offers = await this.fetchOfferPrices(canonicalProductId);
    return computeSavingsOpportunity(canonicalProductId, offers);
  }

  private async fetchOfferPrices(canonicalProductId: string): Promise<StoreOfferPrice[]> {
    const { items } = await this.catalogRepo.findOffersByCanonicalProductId(canonicalProductId, {
      limit: OFFER_FETCH_LIMIT,
      offset: 0,
    });
    // Sprint 11: `available=false` é oferta ARQUIVADA e não participa de
    // preço ativo — regra de domínio já estabelecida (ADR-008,
    // services/offer.service.ts) e aplicada em todas as outras superfícies
    // pelas Sprints 5, 9B e 10. Este serviço era a última leitura que ainda
    // a ignorava, e a inconsistência era observável: o grid de /products e
    // /search calcula seu preço SEM as arquivadas, enquanto estas
    // estatísticas as incluíam — os dois lados da comparação do selo
    // "Melhor compra" (`priceUSD <= statistics.lowestPriceUSD`) usavam
    // conjuntos de ofertas diferentes.
    //
    // Medido no banco local: 3 produtos exibiam o selo apenas porque uma
    // oferta arquivada inflava `storeCount` de 1 para 2 (macbook-air-m3,
    // jbl-tune-770nc, galaxy-z-flip6) — "melhor compra entre lojas" com uma
    // única loja ativa vendendo.
    //
    // `available=false` ≠ `inStock=false`: a esgotada segue fora do preço
    // aqui, exatamente como antes — este filtro não mexe nessa regra.
    return items
      .filter((o) => o.available && o.inStock)
      .map((o) => ({ storeId: o.storeId, storeSlug: o.storeSlug, priceUSD: o.priceUSD }));
  }
}
