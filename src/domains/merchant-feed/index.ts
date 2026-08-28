/**
 * Merchant Feed Platform V1 — barrel.
 *
 * Estratégia: "torne a integração mais fácil para a loja". Um lojista que já
 * mantém um feed XML informa apenas a URL; o ParaguAI valida, prevê, ativa e
 * sincroniza automaticamente via Adaptive Sync Engine (sem cron paralelo).
 */
export { MerchantFeedParser } from "./parser/MerchantFeedParser";
export { parseMerchantPrice } from "./parser/MerchantPriceParser";
export { MerchantFeedValidator, type FeedValidationStats } from "./validator/MerchantFeedValidator";
export { SecureFeedFetcher, assertSafeFeedUrl } from "./fetcher/SecureFeedFetcher";
export { MerchantFeedMatchPreview, normalizeTitleForMatch, type MatchPreviewRow, type MatchStatus } from "./canonical/MerchantFeedMatchPreview";
export { MerchantFeedConnector } from "./connector/MerchantFeedConnector";
export { MerchantFeedOnboardingService } from "./onboarding/MerchantFeedOnboardingService";
export { MerchantFeedRegistrationService, type MerchantFeedRegistrationInput, type MerchantFeedRegistrationResult } from "./registration/MerchantFeedRegistrationService";
export type { MerchantFeedConfig, MerchantFeedSourceType, MerchantFeedSourceTrust } from "./config/MerchantFeedConfig";
