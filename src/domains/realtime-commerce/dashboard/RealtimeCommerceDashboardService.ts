import type { SupabaseClient } from "@supabase/supabase-js";
import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import { MarketPulseService } from "../market-pulse/MarketPulseService";
import { LiveActivityFeedService } from "../market-pulse/LiveActivityFeedService";
import { StoreUpdateIntelligenceService } from "../services/StoreUpdateIntelligenceService";
import { BuyerAlertService } from "../alerts/BuyerAlertService";
import type {
  BuyerAlertCandidate,
  LiveActivityEntry,
  MarketPulseSnapshot,
  StoreUpdateProfile,
  TopMover,
} from "../types";

type OverviewKey = "marketPulse" | "liveActivity" | "topMovers" | "topStores" | "pendingAlerts";

export interface RealtimeCommerceOverview {
  marketPulse: MarketPulseSnapshot | null;
  liveActivity: LiveActivityEntry[] | null;
  topMovers: TopMover[] | null;
  topStores: StoreUpdateProfile[] | null;
  pendingAlerts: BuyerAlertCandidate[] | null;
  errors: Partial<Record<OverviewKey, string>>;
  generatedAt: string;
}

const RANKED_STORES_LIMIT = 10;

/** Epic 10 — composition layer for /admin/realtime-commerce. Same
 * Promise.allSettled + index-mapped-fallback isolation as
 * ExchangeDashboardService / MarketplaceOperationsDashboardService — one
 * failing sub-section never breaks the payload. */
export class RealtimeCommerceDashboardService {
  constructor(
    private readonly client: SupabaseClient,
    private readonly changeRepo: IMarketChangeRepository,
    private readonly marketPulseService: MarketPulseService,
    private readonly liveActivityFeedService: LiveActivityFeedService,
    private readonly storeUpdateService: StoreUpdateIntelligenceService,
    private readonly buyerAlertService: BuyerAlertService
  ) {}

  async getOverview(): Promise<RealtimeCommerceOverview> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [marketPulse, liveActivity, topMovers, topStores, pendingAlerts] = await Promise.allSettled([
      this.marketPulseService.computeToday(),
      this.liveActivityFeedService.getRecent(),
      this.marketPulseService.getTopMovers(startOfToday, now),
      this.rankActiveStores(startOfToday, now),
      this.buyerAlertService.listPending(20),
    ]);

    const errors: Partial<Record<OverviewKey, string>> = {};

    function resolve<T>(result: PromiseSettledResult<T>, key: OverviewKey): T | null {
      if (result.status === "fulfilled") return result.value;
      errors[key] = String(result.reason);
      return null;
    }

    return {
      marketPulse: resolve(marketPulse, "marketPulse"),
      liveActivity: resolve(liveActivity, "liveActivity"),
      topMovers: resolve(topMovers, "topMovers"),
      topStores: resolve(topStores, "topStores"),
      pendingAlerts: resolve(pendingAlerts, "pendingAlerts"),
      errors,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Ranking is scoped to stores with at least one detected change in the
   * window — a store with zero activity has nothing to rank on and is
   * omitted rather than shown with fabricated zero-signal scores. */
  private async rankActiveStores(from: Date, to: Date): Promise<StoreUpdateProfile[]> {
    const sample = await this.changeRepo.listInRange(from, to, 3000);
    const storeIds = [...new Set(sample.map((c) => c.storeId).filter((id): id is string => !!id))].slice(0, RANKED_STORES_LIMIT);
    if (storeIds.length === 0) return [];

    const { data: stores } = await this.client.from("stores").select("id, name").in("id", storeIds);
    const nameById = new Map<string, string>(((stores ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));

    const profiles = await Promise.all(
      storeIds.map((id) => this.storeUpdateService.computeForStore(id, nameById.get(id) ?? id))
    );

    return this.storeUpdateService.rank(profiles);
  }
}
