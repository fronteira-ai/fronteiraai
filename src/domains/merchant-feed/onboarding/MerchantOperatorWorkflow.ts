/**
 * Merchant Feed Platform — operator onboarding workflow (INTERNAL, PART C).
 *
 * Fluxo do operador (NÃO self-service; sem dashboard de lojista):
 *   CREATE/SELECT STORE
 *   → ADD SOURCE
 *   → VALIDATE
 *   → PREVIEW (match + métricas §17)
 *   → REVIEW METRICS
 *   → ACTIVATE  (exige autorização EXPLÍCITA do lojista — §18/§34)
 *   → INITIAL SYNC / VERIFY / SCHEDULE (via Adaptive Sync).
 *
 * GATES:
 *   - dry-run/validação são AUTÔNOMOS (sem escrita).
 *   - ATIVAÇÃO oficial NÃO acontece só porque a URL valida: exige um
 *     `MerchantAuthorizationRecord` com consentimento real do lojista.
 */

import { MerchantFeedOnboardingService } from "./MerchantFeedOnboardingService";
import { canOnboardMerchant, type MerchantAuthorizationRecord } from "../auth/MerchantAuthorization";
import { migrationDryRun, type ExistingOfferRef } from "../migration/MerchantSourceMigration";
import type { MerchantFeedConfig } from "../config/MerchantFeedConfig";
import type { MerchantSourceConfig } from "../config/MerchantSourceConfig";
import { validateMerchantSourceConfig } from "../config/MerchantSourceConfig";

export interface OperatorActivationInput {
  storeSlug: string;
  feedUrl: string;
  sourceConfig?: MerchantSourceConfig;
  sourceType?: MerchantFeedConfig["sourceType"];
  trust?: MerchantFeedConfig["trust"];
  preferredTier?: "HOT" | "WARM";
  /** Autorização do lojista (obrigatória p/ ativação oficial). */
  authorization?: MerchantAuthorizationRecord;
  /** Ofertas existentes da loja (origem atual) p/ dry-run de migração. */
  existingOffers?: ExistingOfferRef[];
}

export interface OperatorOnboardingReport {
  step: string;
  validation?: {
    totalItems: number;
    valid: number;
    invalid: number;
    duplicateExternalIds: number;
    priceCoverage: number;
    stockCoverage: number;
    imageCoverage: number;
    brandCoverage: number;
    couldValidate: boolean;
  };
  matchPreview?: {
    matchedExisting: number;
    newProductCandidates: number;
    ambiguous: number;
    prohibitedRejected: number;
  };
  migration?: ReturnType<typeof migrationDryRun>;
  activation: {
    authorized: boolean;
    canActivate: boolean;
  };
  config?: MerchantFeedConfig;
}

/**
 * Executa o fluxo do operador. `dryRun()` é autônomo. `activate()` exige
 * autorização explícita do lojista (nunca valida ⇒ ativa).
 */
export class MerchantOperatorWorkflow {
  constructor(private readonly onboarding: MerchantFeedOnboardingService = new MerchantFeedOnboardingService()) {}

  /** Passo VALIDATE + PREVIEW (dry-run, SEM escrita, autônomo). */
  async validateAndPreview(input: OperatorActivationInput, bodyInput?: string): Promise<OperatorOnboardingReport> {
    // Retorna preview sem depender de rede (testável com bodyInput).
    const stats = bodyInput !== undefined
      ? await this.onboarding.validateBody({ body: bodyInput, sourceType: input.sourceType, trust: input.trust, sourceConfig: input.sourceConfig })
      : await this.onboarding.validate({ feedUrl: input.feedUrl, sourceType: input.sourceType, trust: input.trust, preferredTier: input.preferredTier, sourceConfig: input.sourceConfig });

    const valid = stats.validation.validItems;
    const invalid = stats.validation.invalidItems;
    const previewRows = stats.matchPreview;
    const v = stats.validation;

    const matchedExisting = previewRows.filter((r) => r.status === "MATCHED_EXISTING_PRODUCT").length;
    const newCandidates = previewRows.filter((r) => r.status === "NEW_PRODUCT_CANDIDATE").length;
    const ambiguous = previewRows.filter((r) => r.status === "AMBIGUOUS").length;
    const prohibited = previewRows.filter((r) => r.status === "INVALID").length;

    const migration = input.existingOffers && input.existingOffers.length > 0
      ? migrationDryRun(input.existingOffers, stats.validation.offers ?? [])
      : undefined;

    return {
      step: "VALIDATE_PREVIEW",
      validation: {
        totalItems: v.totalItems,
        valid,
        invalid,
        duplicateExternalIds: v.duplicateExternalIds,
        priceCoverage: v.validItems ? (v.validItems - v.priceErrors) / v.validItems : 0,
        stockCoverage: stockCoverage(stats.validation.offers ?? []),
        imageCoverage: v.imageCoverage,
        brandCoverage: v.brandCoverage,
        couldValidate: v.fetchStatus === "OK" && v.formatDetected !== "UNKNOWN",
      },
      matchPreview: { matchedExisting, newProductCandidates: newCandidates, ambiguous, prohibitedRejected: prohibited },
      migration,
      activation: { authorized: canOnboardMerchant(input.authorization), canActivate: false },
    };
  }

  /** Passo ACTIVATE: exige autorização real + validação mínima. Retorna config persistível (não grava). */
  activate(input: OperatorActivationInput, preview: OperatorOnboardingReport["validation"] & object): OperatorOnboardingReport {
    const authorized = canOnboardMerchant(input.authorization);
    if (input.sourceConfig) validateMerchantSourceConfig(input.sourceConfig);
    const couldValidate = preview?.couldValidate === true && (preview?.valid ?? 0) > 0;
    const canActivate = authorized && couldValidate;

    const config: MerchantFeedConfig = {
      feedUrl: input.feedUrl,
      sourceType: input.sourceType ?? input.sourceConfig?.sourceType ?? "XML_FEED",
      trust: input.trust ?? "OFFICIAL_MERCHANT_FEED",
      preferredTier: input.preferredTier ?? "WARM",
      enabled: canActivate,
      sourceConfig: input.sourceConfig,
    };

    return {
      step: canActivate ? "ACTIVATED" : "BLOCKED",
      validation: preview,
      activation: { authorized, canActivate },
      config,
    };
  }
}

function stockCoverage(offers: unknown[]): number {
  if (offers.length === 0) return 0;
  const hasStock = offers.filter((o) => {
    const x = o as { inStock?: boolean; stockQuantity?: number | null };
    return x.inStock !== undefined || x.stockQuantity !== null && x.stockQuantity !== undefined;
  }).length;
  return hasStock / offers.length;
}
