/**
 * Merchant Feed Platform — config types e domínio.
 */

/** Níveis de confiança da origem (para futura UI "Feed oficial da loja"). */
export type MerchantFeedSourceTrust =
  | "OFFICIAL_MERCHANT_API"
  | "OFFICIAL_MERCHANT_FEED"
  | "PUBLIC_STORE_API"
  | "PUBLIC_STRUCTURED_SOURCE"
  | "PUBLIC_CONNECTOR";

export type MerchantFeedSourceType = "XML_FEED" | "JSON_FEED" | "CSV_FEED" | "PUBLIC_API";

/** Config persistente de um feed de lojista (armazenado em connectors.config). */
export interface MerchantFeedConfig {
  /** URL pública do feed (insumo externo). */
  feedUrl: string;
  sourceType: MerchantFeedSourceType;
  trust: MerchantFeedSourceTrust;
  /** Cadência recomendada (HOT/WARM) — o Adaptive Sync Engine decide quando due. */
  preferredTier: "HOT" | "WARM";
  /** ETag/If-None-Match do último fetch (conditional). Guardado como metadado não sensível. */
  etag?: string | null;
  lastModified?: string | null;
  enabled: boolean;
  /** Config declarativa do source (fieldMapping/rootPath/currency) para JSON/
   *  formatos não-default — usada pelo parser/connector/validator. */
  sourceConfig?: MerchantSourceConfig;
}

import type { MerchantSourceConfig } from "./MerchantSourceConfig";
export type { MerchantSourceConfig };
export type { MerchantFieldMapping, MerchantFieldSlot, MerchantPaginationConfig } from "./MerchantSourceConfig";
