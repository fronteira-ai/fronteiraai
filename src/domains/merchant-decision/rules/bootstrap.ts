// ── Rule Bootstrap ────────────────────────────────────────────────────────────
// Register all rules at module load time. Import this once from the application
// entry point (e.g. API routes) to ensure all rules are available before the
// RecommendationEngine is invoked.
//
// To add a new rule:
// 1. Implement Rule interface in an appropriate *-rules.ts file
// 2. Export it
// 3. Add RuleRegistry.register(YourNewRule) below

import { RuleRegistry } from "./RuleRegistry";

// Catalog rules
import {
  CatalogImageCoverageRule,
  StaleImportRule,
  LowActiveProductsRule,
} from "./catalog-rules";

// Trust rules
import {
  TrustNoVerificationRule,
  LowTrustScoreRule,
  TrustNoSignalsRule,
} from "./trust-rules";

// Analytics rules
import {
  HighViewsLowContactRule,
  LowCTRRule,
  ZeroOfferSavesRule,
} from "./analytics-rules";

// Profile rules
import {
  ProfileNoContactRule,
  ProfileSingleChannelRule,
} from "./profile-rules";

let bootstrapped = false;

export function bootstrapRules(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  // Catalog
  RuleRegistry.register(CatalogImageCoverageRule);
  RuleRegistry.register(StaleImportRule);
  RuleRegistry.register(LowActiveProductsRule);

  // Trust
  RuleRegistry.register(TrustNoVerificationRule);
  RuleRegistry.register(LowTrustScoreRule);
  RuleRegistry.register(TrustNoSignalsRule);

  // Analytics
  RuleRegistry.register(HighViewsLowContactRule);
  RuleRegistry.register(LowCTRRule);
  RuleRegistry.register(ZeroOfferSavesRule);

  // Profile
  RuleRegistry.register(ProfileNoContactRule);
  RuleRegistry.register(ProfileSingleChannelRule);
}
