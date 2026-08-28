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
import type { MerchantSourceConfig } from "../config/MerchantSourceConfig";
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
  /** Config declarativa p/ feeds não-default (JSON/root/fieldMapping). */
  sourceConfig?: MerchantSourceConfig;
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
  async validate(input: Pick<FeedRegistrationInput, "feedUrl" | "sourceType" | "trust" | "preferredTier" | "existingProducts" | "sourceConfig">): Promise<FeedOnboardingPreview> {
    // Validador recebe sourceConfig injetável (JSON fieldMapping) — passa como opção.
    const validator = input.sourceConfig ? new MerchantFeedValidator({ sourceConfig: input.sourceConfig }) : this.validator;
    const stats = await validator.validate(input.feedUrl);
    const matchPreview = new MerchantFeedMatchPreview(input.existingProducts ?? []).preview(
      (stats.offers ?? []).map((o) => ({ product: o.product })),
    );
    return { validation: stats, matchPreview };
  }

  /** Dry-run com conteúdo já em mãos (offline / testes / simulação de piloto). */
  async validateBody(input: {
    body: string;
    existingProducts?: ExistingProductRef[];
    sourceType?: MerchantFeedSourceType;
    trust?: MerchantFeedSourceTrust;
    sourceConfig?: MerchantSourceConfig;
  }): Promise<FeedOnboardingPreview> {
    const validator = input.sourceConfig ? new MerchantFeedValidator({ sourceConfig: input.sourceConfig }) : this.validator;
    const stats = await validator.validate("inline", input.body);
    const matchPreview = new MerchantFeedMatchPreview(input.existingProducts ?? []).preview(
      (stats.offers ?? []).map((o) => ({ product: o.product })),
    );
    return { validation: stats, matchPreview };
  }

  /** Ativa: defere a validação ao operador — aqui apenas devolve a config
   * persistível e o flag (não grava; o chamador persiste via connector repo). */
  activate(input: FeedRegistrationInput, preview: FeedOnboardingPreview): MerchantFeedOnboardingResult {
    const validation = preview.validation;
    const invalidRows = preview.matchPreview.filter((r) => r.status === "INVALID").length;
    const canActivate = validation.fetchStatus === "OK"
      && validation.formatDetected !== "UNKNOWN"
      && validation.validItems > 0
      && (validation.validItems - invalidRows) > 0;
    const config: MerchantFeedConfig = {
      feedUrl: input.feedUrl,
      sourceType: input.sourceType ?? input.sourceConfig?.sourceType ?? "XML_FEED",
      trust: input.trust ?? "OFFICIAL_MERCHANT_FEED",
      preferredTier: input.preferredTier ?? "HOT",
      enabled: canActivate,
      sourceConfig: input.sourceConfig,
    };
    return { canActivate, preview, config };
  }
}
