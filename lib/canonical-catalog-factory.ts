import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SupabaseCanonicalCatalogRepository,
  SupabaseMergeCandidateRepository,
  SupabaseMergeExecutionRepository,
  SupabaseCanonicalPriceHistoryRepository,
  CanonicalProductService,
  OfferRankingService,
  CanonicalPriceHistoryService,
  CompareFoundationService,
  MergeAuditService,
  MergeExecutorService,
  MergeQueueDashboardService,
} from "@/src/domains/canonical-catalog";
import { CanonicalMergeSuggestionService } from "@/src/domains/product-identity";
import {
  MarketplaceMemoryService,
  SupabaseLearnedFactRepository,
  SupabaseMerchantAttributePatternRepository,
} from "@/src/domains/marketplace-memory";

export function createCanonicalCatalogServices(client: SupabaseClient) {
  const catalogRepo = new SupabaseCanonicalCatalogRepository(client);
  const mergeCandidateRepo = new SupabaseMergeCandidateRepository(client);
  const mergeExecutionRepo = new SupabaseMergeExecutionRepository(client);
  const priceHistoryRepo = new SupabaseCanonicalPriceHistoryRepository(client);

  const canonicalProductService = new CanonicalProductService(catalogRepo);
  const rankingService = new OfferRankingService();
  const priceHistoryService = new CanonicalPriceHistoryService(priceHistoryRepo);
  const compareFoundationService = new CompareFoundationService(
    canonicalProductService,
    catalogRepo,
    rankingService,
    priceHistoryService
  );
  // Program Ω — Mission Ω-3 (Product Identity Read-Through Integration).
  // Always constructed and always passed in — the safety net is the
  // PRODUCT_IDENTITY_MEMORY_ROLLOUT_PERCENT env var (default 0, read at
  // call time inside CanonicalMergeSuggestionService), never the presence
  // or absence of this service. Wiring it here unconditionally means
  // raising the rollout percent needs no redeploy, exactly Objetivo 7's
  // requirement — the code path is already live, just dormant.
  const marketplaceMemoryService = new MarketplaceMemoryService(
    new SupabaseLearnedFactRepository(client),
    new SupabaseMerchantAttributePatternRepository(client)
  );
  const mergeSuggestionService = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo, marketplaceMemoryService);
  // Program Ω — Mission Ω-1 (Merge Execution Engine)
  const mergeAuditService = new MergeAuditService(mergeCandidateRepo);
  const mergeExecutorService = new MergeExecutorService(mergeCandidateRepo, catalogRepo, mergeExecutionRepo);
  const mergeQueueDashboardService = new MergeQueueDashboardService(mergeCandidateRepo, mergeExecutionRepo);

  return {
    catalogRepo,
    mergeCandidateRepo,
    mergeExecutionRepo,
    priceHistoryRepo,
    canonicalProductService,
    rankingService,
    priceHistoryService,
    compareFoundationService,
    mergeSuggestionService,
    marketplaceMemoryService,
    mergeAuditService,
    mergeExecutorService,
    mergeQueueDashboardService,
  };
}
