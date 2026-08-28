/**
 * Merchant Feed Platform — feed onboarding service (dry-run + ativação).
 *
 * Onboarding do lojista (V1 = via operador):
 *   1. informar URL do feed + loja + frequência
 *   2. validate(dry-run): fetch → parse → normalize → match preview (SEM escrita)
 *   3. activate: persiste registo do connector (connectors.config + sync_state)
 *      e registra o IConnector no registry → Adaptive Sync começa.
 *
 * Prepara serviços para um futuro self-service (componente separado, não UI aqui).
 */

import { MerchantFeedValidator, type FeedValidationStats } from "../validator/MerchantFeedValidator";
import { MerchantFeedMatchPreview, type MatchPreviewRow } from "../canonical/MerchantFeedMatchPreview";
import type { MerchantFeedConfig, MerchantFeedSourceType, MerchantFeedSourceTrust } from "../config/MerchantFeedConfig";
import type { ExistingProductRef } from "../canonical/MerchantFeedMatchPreview";

export interface FeedOnboardingPreview {
  validation: FeedValidationStats;
  matchPreview: MatchPreviewRow[];
}

export interface FeedRegistrationInput {
  storeSlug: string;
  feedUrl: string;
  sourceType?: MerchantFeedSourceType;
  trust?: MerchantFeedSourceTrust;
  preferredTier?: "HOT" | "WARM";
  /** existentes p/ simulação de casamento (default: vazia → tudo NEW). */
  existingProducts?: ExistingProductRef[];
}

export interface MerchantFeedOnboardingResult {
  canActivate: boolean;
  preview: FeedOnboardingPreview;
  config: MerchantFeedConfig;
}

export class MerchantFeedOnboardingService {
  constructor(
    private readonly validator: MerchantFeedValidator = new MerchantFeedValidator(),
  ) {}

  /** Dry-run: valida o feed e simula o casamento canônico, SEM escrever. */
  async validate(input: FeedRegistrationInput): Promise<FeedOnboardingPreview> {
    const stats = await this.validator.validate(input.feedUrl);
    const matchPreview = new MerchantFeedMatchPreview(input.existingProducts ?? []).preview(
      (stats.offers ?? []).map((o) => ({ product: o.product })),
    );
    return { validation: stats, matchPreview };
  }

  /** Ativa: exige validation OK; retorna a config persistível (não grava aqui —
   * o chamador persiste via connector repo). */
  activate(input: FeedRegistrationInput, preview: FeedOnboardingPreview): MerchantFeedOnboardingResult {
    const validation = preview.validation;
    const invalidRows = preview.matchPreview.filter((r) => r.status === "INVALID").length;
    const canActivate = validation.fetchStatus === "OK"
      && validation.formatDetected === "XML_FEED"
      && validation.validItems > 0
      && (validation.validItems - invalidRows) > 0;
    const config: MerchantFeedConfig = {
      feedUrl: input.feedUrl,
      sourceType: input.sourceType ?? "XML_FEED",
      trust: input.trust ?? "OFFICIAL_MERCHANT_FEED",
      preferredTier: input.preferredTier ?? "HOT",
      enabled: canActivate,
    };
    return { canActivate, preview, config };
  }
}
