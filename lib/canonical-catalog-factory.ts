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
  const mergeSuggestionService = new CanonicalMergeSuggestionService(catalogRepo, mergeCandidateRepo);
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
    mergeAuditService,
    mergeExecutorService,
    mergeQueueDashboardService,
  };
}
