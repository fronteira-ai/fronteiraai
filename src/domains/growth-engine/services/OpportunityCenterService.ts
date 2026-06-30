import type { GrowthRecommendation, OpportunityCenter } from "../types/growth.types";

export class OpportunityCenterService {
  buildCenter(scored: GrowthRecommendation[], merchantId: string): OpportunityCenter {
    const opportunities = scored.filter((r) => r.opportunity_category !== null);

    return {
      merchant_id: merchantId,
      opportunities,
      total: opportunities.length,
      generated_at: new Date().toISOString(),
    };
  }
}
