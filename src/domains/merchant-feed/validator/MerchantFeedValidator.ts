/**
 * Merchant Feed Platform — feed validator.
 *
 * Dada uma URL/file, faz fetch seguro + detecção de formato + parse + estatísticas
 * SEM ingestão no catálogo (utilizado no onboarding antes de ativar).
 */

import { SecureFeedFetcher, assertSafeFeedUrl, type FeedFetchResult } from "../fetcher/SecureFeedFetcher";
import { MerchantFeedParser } from "../parser/MerchantFeedParser";
import { MerchantJsonFeedParser } from "../parser/MerchantJsonFeedParser";
import { DEFAULT_FIELD_MAPPING, type MerchantSourceConfig } from "../config/MerchantSourceConfig";
import type { RawOffer } from "../../connectors/types/raw.types";

export type FeedFormat = "XML_FEED" | "JSON_FEED" | "CSV_FEED" | "UNKNOWN";

export interface FeedValidationStats {
  fetchStatus: "OK" | "FAILED" | "NOT_MODIFIED";
  formatDetected: FeedFormat;
  encoding: string;
  totalItems: number;
  validItems: number;
  invalidItems: number;
  duplicateExternalIds: number;
  priceErrors: number;
  stockErrors: number;
  imageCoverage: number;   // 0..1
  brandCoverage: number;   // 0..1
  externalIdCoverage: number; // 0..1
  httpStatus: number;
  bytes: number;
  notModified: boolean;
  errors: Array<{ codigo?: string; reason: string }>;
  offers?: RawOffer[];
}

export interface FeedValidatorOptions {
  fetch?: Pick<SecureFeedFetcher, "fetch">;
  /** Config declarativa para feeds JSON (fieldMapping/rootPath/currency). */
  sourceConfig?: MerchantSourceConfig;
}

export class MerchantFeedValidator {
  constructor(private readonly deps: FeedValidatorOptions = {}) {}

  async validate(rawUrl: string, bodyInput?: string): Promise<FeedValidationStats> {
    // Permitir teste com conteúdo já em mãos (unit) sem rede.
    if (bodyInput !== undefined) {
      return this.fromBody(bodyInput);
    }

    assertSafeFeedUrl(rawUrl);
    const fetcher = this.deps.fetch ?? new SecureFeedFetcher();
    const fetched: FeedFetchResult = await fetcher.fetch({ url: rawUrl });

    if (fetched.notModified) {
      return {
        fetchStatus: "NOT_MODIFIED",
        formatDetected: "UNKNOWN",
        encoding: "utf-8",
        totalItems: 0,
        validItems: 0,
        invalidItems: 0,
        duplicateExternalIds: 0,
        priceErrors: 0,
        stockErrors: 0,
        imageCoverage: 0,
        brandCoverage: 0,
        externalIdCoverage: 0,
        httpStatus: 304,
        bytes: 0,
        notModified: true,
        errors: [],
      };
    }

    if (!fetched.ok) {
      return {
        fetchStatus: "FAILED",
        formatDetected: "UNKNOWN",
        encoding: "utf-8",
        totalItems: 0,
        validItems: 0,
        invalidItems: 0,
        duplicateExternalIds: 0,
        priceErrors: 0,
        stockErrors: 0,
        imageCoverage: 0,
        brandCoverage: 0,
        externalIdCoverage: 0,
        httpStatus: fetched.status,
        bytes: fetched.bytes,
        notModified: false,
        errors: [{ reason: fetched.error ?? "FETCH_FAILED" }],
      };
    }

    return this.fromBody(fetched.body, { httpStatus: fetched.status, bytes: fetched.bytes });
  }

  private fromBody(body: string, meta?: { httpStatus: number; bytes: number }): FeedValidationStats {
    const format = detectFormat(body);

    if (format === "XML_FEED") {
      const parsed = new MerchantFeedParser().parse(body);
      const { duplicates, priceErrors, stockErrors } = analyzeOffers(parsed.offers, parsed.errors);
      return {
        fetchStatus: "OK",
        formatDetected: format,
        encoding: "utf-8",
        totalItems: parsed.totalItems,
        validItems: parsed.validItems,
        invalidItems: parsed.totalItems - parsed.validItems,
        duplicateExternalIds: duplicates,
        priceErrors,
        stockErrors,
        imageCoverage: coverage(parsed.offers, (o) => !!o.product.imageUrl),
        brandCoverage: coverage(parsed.offers, (o) => !!o.product.brand),
        externalIdCoverage: coverage(parsed.offers, (o) => !!o.product.externalId),
        httpStatus: meta?.httpStatus ?? 200,
        bytes: meta?.bytes ?? 0,
        notModified: false,
        errors: parsed.errors,
        offers: parsed.offers,
      };
    }

    if (format === "JSON_FEED") {
      const cfg: MerchantSourceConfig = this.deps.sourceConfig ?? {
        sourceType: "JSON_FEED",
        feedUrl: "inline",
        fieldMapping: DEFAULT_FIELD_MAPPING,
      };
      const parsed = new MerchantJsonFeedParser(cfg).parse(body);
      const { duplicates, priceErrors, stockErrors } = analyzeOffers(parsed.offers, parsed.errors);
      return {
        fetchStatus: "OK",
        formatDetected: format,
        encoding: "utf-8",
        totalItems: parsed.totalItems,
        validItems: parsed.validItems,
        invalidItems: parsed.totalItems - parsed.validItems,
        duplicateExternalIds: duplicates,
        priceErrors,
        stockErrors,
        imageCoverage: coverage(parsed.offers, (o) => !!o.product.imageUrl),
        brandCoverage: coverage(parsed.offers, (o) => !!o.product.brand),
        externalIdCoverage: coverage(parsed.offers, (o) => !!o.product.externalId),
        httpStatus: meta?.httpStatus ?? 200,
        bytes: meta?.bytes ?? 0,
        notModified: false,
        errors: parsed.errors,
        offers: parsed.offers,
      };
    }

    // Formatos não implementados → contagem honesta sem ingestão.
    return {
      fetchStatus: "OK",
      formatDetected: format,
      encoding: "utf-8",
      totalItems: 0,
      validItems: 0,
      invalidItems: 0,
      duplicateExternalIds: 0,
      priceErrors: 0,
      stockErrors: 0,
      imageCoverage: 0,
      brandCoverage: 0,
      externalIdCoverage: 0,
      httpStatus: meta?.httpStatus ?? 200,
      bytes: meta?.bytes ?? 0,
      notModified: false,
      errors: [{ reason: `UNSUPPORTED_FORMAT:${format}` }],
    };
  }
}

function detectFormat(body: string): FeedFormat {
  const t = body.trimStart();
  if (t.startsWith("<?xml") || t.startsWith("<rss") || t.startsWith("<feed") || t.startsWith("<channel") || /<item>/.test(body.slice(0, 4000))) {
    return "XML_FEED";
  }
  if (t.startsWith("{")) return "JSON_FEED";
  if (/^[ \t]*[^,]+,[^,\n]+/.test(t) && !t.startsWith("<")) return "CSV_FEED";
  return "UNKNOWN";
}

function analyzeOffers(offers: RawOffer[], errors: Array<{ codigo?: string; reason: string }>) {
  const ids = new Set<string>();
  let duplicates = 0;
  for (const o of offers) {
    const id = o.product.externalId;
    if (id) {
      if (ids.has(id)) duplicates++;
      else ids.add(id);
    }
  }
  const priceErrors = errors.filter((e) => e.reason.startsWith("INVALID_PRICE")).length;
  const stockErrors = errors.filter((e) => e.reason.includes("STOCK") || e.reason.includes("ESTOQUE")).length;
  return { duplicates, priceErrors, stockErrors };
}

function coverage(offers: RawOffer[], pred: (o: RawOffer) => boolean): number {
  if (offers.length === 0) return 0;
  return offers.filter(pred).length / offers.length;
}
