import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseCatalogSnapshotRepository } from "@/src/domains/catalog-intelligence/infrastructure/SupabaseCatalogSnapshotRepository";
import { CatalogHistoryService } from "@/src/domains/catalog-intelligence/services/CatalogHistoryService";

export function createCatalogIntelligenceServices(client: SupabaseClient) {
  const snapshotRepo = new SupabaseCatalogSnapshotRepository(client);
  const catalogHistory = new CatalogHistoryService(snapshotRepo);
  return { catalogHistory };
}
