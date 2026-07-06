import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { IBuyerAlertCandidateRepository } from "../repositories/IBuyerAlertCandidateRepository";
import type { BuyerAlertCandidate } from "../types";
import { BuyerAlertEngine } from "./BuyerAlertEngine";

const DEFAULT_LOOKBACK_MINUTES = 15;
const DEFAULT_SAMPLE_LIMIT = 2000;

/** Epic 8 — application-facing entry point, meant to run on a schedule
 * (see app/api/cron/realtime-commerce/buyer-alerts/route.ts) shortly after
 * connector syncs land their market_changes. Populates buyer_alert_candidates
 * with status='pending' only — there is no further stage that sends
 * anything in this Wave. */
export class BuyerAlertService {
  private readonly engine = new BuyerAlertEngine();

  constructor(
    private readonly changeRepo: IMarketChangeRepository,
    private readonly candidateRepo: IBuyerAlertCandidateRepository
  ) {}

  async generateFromRecentChanges(lookbackMinutes: number = DEFAULT_LOOKBACK_MINUTES): Promise<number> {
    const to = new Date();
    const from = new Date(to.getTime() - lookbackMinutes * 60 * 1000);
    const changes = await this.changeRepo.listInRange(from, to, DEFAULT_SAMPLE_LIMIT);

    let created = 0;
    for (const change of changes) {
      const input = this.engine.classify(change);
      if (!input) continue;
      const result = await this.candidateRepo.createIfNotRateLimited(input);
      if (result) created++;
    }
    return created;
  }

  async listPending(limit: number = 50): Promise<BuyerAlertCandidate[]> {
    return this.candidateRepo.listPending(limit);
  }
}
