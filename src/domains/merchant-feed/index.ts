/**
 * Merchant Feed Platform V1 — barrel.
 *
 * Estratégia: "torne a integração mais fácil para a loja". Um lojista que já
 * mantém um feed XML informa apenas a URL; o ParaguAI valida, prevê, ativa e
 * sincroniza automaticamente via Adaptive Sync Engine (sem cron paralelo).
 */
export { MerchantFeedParser } from "./parser/MerchantFeedParser";
export { parseMerchantPrice } from "./parser/MerchantPriceParser";
export { MerchantJsonFeedParser } from "./parser/MerchantJsonFeedParser";
export { MerchantJsonPaginator } from "./parser/MerchantJsonPaginator";
export { MerchantCsvFeedParser, neutralizeFormula } from "./parser/MerchantCsvFeedParser";
export { rowToOffer, parseInteger, normalizeAvailability2 } from "./parser/rowNormalizer";
export { MerchantFeedValidator, type FeedValidationStats } from "./validator/MerchantFeedValidator";
export { SecureFeedFetcher, assertSafeFeedUrl } from "./fetcher/SecureFeedFetcher";
export { MerchantFeedMatchPreview, normalizeTitleForMatch, type MatchPreviewRow, type MatchStatus } from "./canonical/MerchantFeedMatchPreview";
export { MerchantFeedConnector } from "./connector/MerchantFeedConnector";
export { MerchantFeedOnboardingService } from "./onboarding/MerchantFeedOnboardingService";
export { MerchantOperatorWorkflow, type OperatorActivationInput, type OperatorOnboardingReport } from "./onboarding/MerchantOperatorWorkflow";
export { MerchantFeedRegistrationService, type MerchantFeedRegistrationInput, type MerchantFeedRegistrationResult } from "./registration/MerchantFeedRegistrationService";
export {
  sourcePriorityRank, canonicalImagePriority, officialStockPrecedence, migrationDryRun,
  type ExistingOfferRef, type MigrationDryRunResult, type SourcePriorityRank,
} from "./migration/MerchantSourceMigration";
export {
  canOnboardMerchant, isValidSourceUrl, type MerchantAuthorizationRecord, type MerchantAuthorizationStatus,
} from "./auth/MerchantAuthorization";
export type { MerchantFeedConfig, MerchantFeedSourceType, MerchantFeedSourceTrust } from "./config/MerchantFeedConfig";
export {
  validateMerchantSourceConfig,
  normalizeFieldMapping,
  resolvePath,
  extractItems,
  DEFAULT_FIELD_MAPPING,
  type MerchantSourceConfig,
  type MerchantFieldMapping,
  type MerchantFieldSlot,
  type MerchantPaginationConfig,
} from "./config/MerchantSourceConfig";

