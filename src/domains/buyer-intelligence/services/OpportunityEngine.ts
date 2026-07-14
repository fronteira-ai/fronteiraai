import type { ICanonicalCatalogRepository, CanonicalProduct, CanonicalOfferView } from "@/src/domains/canonical-catalog";
import type { PriceIntelligenceService, SavingsOpportunity } from "@/src/domains/market-insights";
import type { FreshnessService } from "@/src/domains/realtime-commerce";
import { FreshnessClass } from "@/src/domains/realtime-commerce";
import type { IMerchantStoreLinkRepository } from "@/src/domains/merchant-ownership/repositories/IMerchantStoreLinkRepository";
import type { BadgeService } from "@/src/domains/trust/services/BadgeService";
import type { IAnalyticsEventRepository } from "@/src/domains/merchant-analytics/repositories/IAnalyticsEventRepository";
import { AnalyticsEventType, AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";
import type { ComparisonIntelligenceComposer } from "./ComparisonIntelligenceComposer";
import type { PurchaseTimingComposer } from "./PurchaseTimingComposer";
import type { Opportunity } from "../types/buyer-intelligence.types";

// Release 2.0 — Experience Iteration 6.5 (Opportunity Engine). A decision
// tree over already-existing signals — CTO-approved architecture, see
// docs/product/OPPORTUNITY_ENGINE_ARCHITECTURE.md. Replaces
// lib/home-premium-service.ts's rankSavingsAcrossCatalog (single-factor,
// percent-only) as the one place that decides what "Achado do Dia"/"Economia
// do dia" means — every consumer now reads from getTopOpportunities.
//
// Gates run cheapest-first, most expensive last, so the small number of
// products that survive the cheap gates are the only ones that pay for a
// full ComparisonIntelligenceComposer + PurchaseTimingComposer call:
//   1. Estoque (CanonicalOfferView.inStock)
//   2. Preço atualizado (FreshnessService, exclui Old/Stale)
//   3. Economia real relevante (piso de US$ e de % — ver constantes abaixo)
//   4. Vale a pena comprar agora (PurchaseTimingComposer.verdict !== "better_wait")
// Sobreviventes disputam por maior economia ABSOLUTA; empate é resolvido por
// (1) maior percentual, (2) maior popularidade (buyer_events já coletados),
// (3) atualização de preço mais recente — nunca uma escolha arbitrária.
//
// Confiança da loja (isVerifiedStore) é lida e exposta, mas NÃO elimina
// candidatos: a cobertura real de lojas verificadas no catálogo nunca foi
// medida, e um gate eliminatório sem essa medição arriscaria esvaziar os
// candidatos por um limiar não calibrado (nota de calibração honesta,
// OPPORTUNITY_ENGINE_ARCHITECTURE.md §3).
//
// Resolução de nomes legíveis (slug do produto vencedor → rota, nome da
// loja a partir do slug) é uma consulta a tabelas cruas (`products`,
// `stores`), fora deste domínio — feita pelo chamador
// (lib/home-premium-service.ts), no mesmo padrão já usado por
// app/product/[slug]/_cache.ts's getProductBestDeal para o nome da loja.

const CANDIDATE_SAMPLE = 50;
/** Piso de economia — mesma disciplina de limiar documentado (não um score)
 * já usada em toda a Release 2.0 (ex.: banda de 10% do Best Deal, banda de
 * 2% do Purchase Timing). Calibrável em uma futura revisão, não uma
 * constante escondida. */
const MIN_SAVINGS_USD = 5;
const MIN_SAVINGS_PERCENT = 5;
const POPULARITY_WINDOW = AnalyticsWindow.Last30Days;

interface Candidate {
  product: CanonicalProduct;
  savings: SavingsOpportunity;
  winningOffer: CanonicalOfferView;
  isVerifiedStore: boolean;
}

export class OpportunityEngine {
  constructor(
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly priceIntelligenceService: PriceIntelligenceService,
    private readonly freshnessService: FreshnessService,
    private readonly merchantStoreLinkRepo: IMerchantStoreLinkRepository,
    private readonly badgeService: BadgeService,
    private readonly comparisonComposer: ComparisonIntelligenceComposer,
    private readonly purchaseTimingComposer: PurchaseTimingComposer,
    private readonly analyticsEventRepository: IAnalyticsEventRepository
  ) {}

  async getTopOpportunities(limit: number): Promise<Opportunity[]> {
    const { items: canonicalProducts } = await this.catalogRepo.findAll({ limit: CANDIDATE_SAMPLE, offset: 0 });

    const candidateResults = await Promise.allSettled(canonicalProducts.map((p) => this.evaluateCandidate(p)));
    const candidates = candidateResults
      .filter((r): r is PromiseFulfilledResult<Candidate | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((c): c is Candidate => c !== null);

    const survivors = await this.applyTimingGate(candidates);
    const ranked = await this.rankSurvivors(survivors);

    return ranked.slice(0, limit).map((c) => ({
      canonicalProductId: c.product.id,
      productName: c.product.name,
      winningOfferProductId: c.winningOffer.productId,
      cheapestStoreSlug: c.savings.cheapestStoreSlug,
      oldPriceUSD: c.savings.mostExpensivePriceUSD,
      newPriceUSD: c.savings.cheapestPriceUSD,
      savingsUSD: c.savings.maxSavingsUSD,
      savingsPercent: c.savings.maxSavingsPercent,
      isVerifiedStore: c.isVerifiedStore,
    }));
  }

  /** Gates 1-3 (estoque, frescor, economia real) — cheap, run for every
   * candidate in parallel. Returns null (never throws) when the candidate
   * is eliminated or its data is incomplete. */
  private async evaluateCandidate(product: CanonicalProduct): Promise<Candidate | null> {
    const savings = await this.priceIntelligenceService.getSavingsOpportunity(product.id).catch((err) => {
      console.error("[OpportunityEngine.evaluateCandidate] getSavingsOpportunity failed", product.id, err);
      return null;
    });
    if (!savings) return null;

    // Objetivo 4/6: economia absoluta alta e economia percentual alta são
    // duas provas independentes de relevância — um candidato só é eliminado
    // se FALHAR as duas ao mesmo tempo. Um desconto de US$500 a 15% deve
    // vencer mesmo não cruzando um piso percentual pensado para descontos
    // pequenos, e vice-versa (ver Exemplo B, OPPORTUNITY_ENGINE_ARCHITECTURE.md §4).
    if (savings.maxSavingsUSD < MIN_SAVINGS_USD && savings.maxSavingsPercent < MIN_SAVINGS_PERCENT) return null;

    const { items: offers } = await this.catalogRepo.findOffersByCanonicalProductId(product.id, { limit: 50, offset: 0 });
    const winningOffer = offers.find((o) => o.storeId === savings.cheapestStoreId);
    if (!winningOffer) return null;
    if (!winningOffer.inStock) return null;

    const freshness = await this.freshnessService.computeForOffer(winningOffer.offerId, new Date(winningOffer.updatedAt)).catch((err) => {
      console.error("[OpportunityEngine.evaluateCandidate] FreshnessService failed", product.id, err);
      return null;
    });
    if (freshness && (freshness.classification === FreshnessClass.Old || freshness.classification === FreshnessClass.Stale)) return null;

    const isVerifiedStore = await this.resolveIsVerified(winningOffer.storeId);

    return { product, savings, winningOffer, isVerifiedStore };
  }

  /** Gate 4 (timing) — the expensive check, applied only to the candidates
   * that already survived gates 1-3. */
  private async applyTimingGate(candidates: Candidate[]): Promise<Candidate[]> {
    const results = await Promise.allSettled(
      candidates.map(async (candidate) => {
        const bundle = await this.comparisonComposer.composeForSlug(candidate.product.canonicalSlug);
        if (!bundle) return candidate; // no comparison bundle — never block on missing data
        const timing = await this.purchaseTimingComposer.compose(bundle);
        return timing.verdict === "better_wait" ? null : candidate;
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<Candidate | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((c): c is Candidate => c !== null);
  }

  /** Ranking: maior economia absoluta vence; empate resolvido por percentual,
   * depois popularidade, depois frescor — nunca uma escolha arbitrária. */
  private async rankSurvivors(survivors: Candidate[]): Promise<Candidate[]> {
    const popularityByProductId = await this.resolvePopularity(survivors.map((c) => c.winningOffer.productId));

    return [...survivors].sort((a, b) => {
      if (b.savings.maxSavingsUSD !== a.savings.maxSavingsUSD) return b.savings.maxSavingsUSD - a.savings.maxSavingsUSD;
      if (b.savings.maxSavingsPercent !== a.savings.maxSavingsPercent) return b.savings.maxSavingsPercent - a.savings.maxSavingsPercent;

      const popularityA = popularityByProductId.get(a.winningOffer.productId) ?? 0;
      const popularityB = popularityByProductId.get(b.winningOffer.productId) ?? 0;
      if (popularityB !== popularityA) return popularityB - popularityA;

      return new Date(b.winningOffer.updatedAt).getTime() - new Date(a.winningOffer.updatedAt).getTime();
    });
  }

  /** Objetivo 6 (popularidade) — buyer_events (ProductClicked) já coletados
   * desde a Release 2.0 Wave 1, nunca antes agregados por produto. Reusa
   * IAnalyticsEventRepository.findByProduct — nenhum novo método de
   * repositório, nenhuma nova coleta de dado. */
  private async resolvePopularity(productIds: string[]): Promise<Map<string, number>> {
    const entries = await Promise.allSettled(
      productIds.map(async (productId): Promise<[string, number]> => {
        const events = await this.analyticsEventRepository.findByProduct(productId, POPULARITY_WINDOW);
        return [productId, events.filter((e) => e.event_type === AnalyticsEventType.ProductClicked).length];
      })
    );

    const map = new Map<string, number>();
    for (const entry of entries) {
      if (entry.status === "fulfilled") map.set(entry.value[0], entry.value[1]);
    }
    return map;
  }

  private async resolveIsVerified(storeId: string): Promise<boolean> {
    const merchantIdByStoreId = await this.merchantStoreLinkRepo.findMerchantIdsByStoreIds([storeId]);
    const merchantId = merchantIdByStoreId.get(storeId);
    if (!merchantId) return false;
    const badgeByMerchantId = await this.badgeService.getActiveBadges([merchantId]);
    return badgeByMerchantId.has(merchantId);
  }
}
