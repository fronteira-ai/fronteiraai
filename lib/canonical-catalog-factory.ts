import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SupabaseCanonicalCatalogRepository,
  SupabaseMergeCandidateRepository,
  SupabaseCanonicalPriceHistoryRepository,
  CanonicalProductService,
  OfferRankingService,
  CanonicalPriceHistoryService,
  CompareFoundationService,
} from "@/src/domains/canonical-catalog";
import { CanonicalMergeSuggestionService } from "@/src/domains/product-identity";

export function createCanonicalCatalogServices(client: SupabaseClient) {
  const catalogRepo = new SupabaseCanonicalCatalogRepository(client);
  const mergeCandidateRepo = new SupabaseMergeCandidateRepository(client);
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

  return {
    catalogRepo,
    mergeCandidateRepo,
    priceHistoryRepo,
    canonicalProductService,
    rankingService,
    priceHistoryService,
    compareFoundationService,
    mergeSuggestionService,
  };
}
