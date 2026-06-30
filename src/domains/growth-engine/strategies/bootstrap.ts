import { StrategyRegistry } from "./StrategyRegistry";
import { CatalogGrowthStrategy } from "./CatalogGrowthStrategy";
import { TrustGrowthStrategy } from "./TrustGrowthStrategy";
import { VisibilityGrowthStrategy } from "./VisibilityGrowthStrategy";
import { PricingOpportunityStrategy } from "./PricingOpportunityStrategy";
import { DemandOpportunityStrategy } from "./DemandOpportunityStrategy";
import { FreshnessStrategy } from "./FreshnessStrategy";
import { MerchantProfileStrategy } from "./MerchantProfileStrategy";
import { TrafficOpportunityStrategy } from "./TrafficOpportunityStrategy";
import { ConversationStrategy } from "./ConversationStrategy";
import { ReviewGrowthStrategy } from "./ReviewGrowthStrategy";

let bootstrapped = false;

export function bootstrapStrategies(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  StrategyRegistry.register(new CatalogGrowthStrategy());
  StrategyRegistry.register(new TrustGrowthStrategy());
  StrategyRegistry.register(new VisibilityGrowthStrategy());
  StrategyRegistry.register(new PricingOpportunityStrategy());
  StrategyRegistry.register(new DemandOpportunityStrategy());
  StrategyRegistry.register(new FreshnessStrategy());
  StrategyRegistry.register(new MerchantProfileStrategy());
  StrategyRegistry.register(new TrafficOpportunityStrategy());
  StrategyRegistry.register(new ConversationStrategy());
  StrategyRegistry.register(new ReviewGrowthStrategy());
}
