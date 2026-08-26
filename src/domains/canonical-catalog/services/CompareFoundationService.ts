import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type { PaginationParams } from "../types/canonical-catalog.types";
import { CanonicalProductService } from "./CanonicalProductService";
import { OfferRankingService, type OfferRankInput, type RankedCanonicalOffer } from "./OfferRankingService";
import { CanonicalPriceHistoryService, type CanonicalPriceAggregation } from "./CanonicalPriceHistoryService";

export interface CompareFoundationResult {
  canonicalProduct: CanonicalProduct;
  rankedOffers: RankedCanonicalOffer[];
  priceAggregation: CanonicalPriceAggregation;
  totalOffers: number;
}

const DEFAULT_PAGINATION: PaginationParams = { limit: 100, offset: 0 };

// The actual "Compare Foundation" (mission objective 3): composes offers,
// ranking, and aggregated price history for one canonical product.
// Backend-only this Wave — no page consumes it yet (confirmed with the
// CTO), but it's real, callable, and tested end-to-end.
export class CompareFoundationService {
  constructor(
    private readonly canonicalProductService: CanonicalProductService,
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly rankingService: OfferRankingService,
    private readonly priceHistoryService: CanonicalPriceHistoryService
  ) {}

  async getForSlug(
    canonicalSlug: string,
    resolveIsVerified: (storeId: string) => Promise<boolean> | boolean,
    pagination: PaginationParams = DEFAULT_PAGINATION
  ): Promise<CompareFoundationResult | null> {
    const canonicalProduct = await this.canonicalProductService.getBySlug(canonicalSlug);
    if (!canonicalProduct) return null;

    const { items: allOffers } = await this.catalogRepo.findOffersByCanonicalProductId(
      canonicalProduct.id,
      pagination
    );

    // Sprint 9B (P3-1): uma oferta ARQUIVADA (`available=false`) sai do
    // conjunto comparável AQUI, antes de qualquer cálculo. Não basta escondê-la
    // no card: antes desta linha ela entrava no ranking, podia ser a `lowest`,
    // podia vencer como "Melhor compra" e ainda alimentava a evidência
    // "vs. lowest $X among compared offers" que o BestDeal exibe em
    // /product — medido em /compare/jbl-charge-6, onde o ParaguAI
    // recomendava "comprar agora" uma oferta arquivada, marcada "Em estoque".
    //
    // `available=false` ≠ `inStock=false`: a segunda é ativa e apenas
    // esgotada, e continua comparável (ADR-008). Esta é a mesma regra que
    // services/offer.service.ts já aplica em getOffersByProduct/ByStore —
    // aqui ela passa a valer também para o caminho do Canonical Catalog.
    //
    // O filtro fica no serviço, não no repositório: aquele é compartilhado
    // com market-insights e buyer-intelligence, e filtrar lá mudaria a
    // semântica de preço/economia desses domínios (P2-2/P2-4).
    const offers = allOffers.filter((offer) => offer.available);

    const rankInputs: OfferRankInput[] = await Promise.all(
      offers.map(async (offer) => ({ offer, isVerifiedStore: await resolveIsVerified(offer.storeId) }))
    );
    const rankedOffers = this.rankingService.rank(rankInputs);

    const priceAggregation = await this.priceHistoryService.getAggregatedPriceHistory(
      canonicalProduct.id,
      offers.map((o) => o.priceUSD)
    );

    // `totalOffers` alimenta o texto "1º lugar entre N ofertas comparadas"
    // (BestDealComposer). Precisa ser a contagem do conjunto COMPARÁVEL — o
    // `count` do repositório inclui as arquivadas e faria a UI anunciar uma
    // comparação que não aconteceu.
    return { canonicalProduct, rankedOffers, priceAggregation, totalOffers: offers.length };
  }
}
