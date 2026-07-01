import type { ConfidenceTier, MatchStrategy } from "../types/enums";
import type { AttributePenalty, SuggestedDecision } from "../types/product-identity.types";

export interface MatchLogEntry {
  batchId: string;
  connectorId: string;
  candidateSlug: string;
  candidateStoreSlug: string;
  suggestedProductId: string | null;
  suggestedProductSlug: string | null;
  algorithmVersion: string;
  confidenceScore: number;
  tier: ConfidenceTier;
  strategy: MatchStrategy;
  matchedAttributes: string[];
  mismatchedAttributes: string[];
  penalties: AttributePenalty[];
  finalDecision: SuggestedDecision;
  explainabilityReason: string;
  processingTimeMs: number;
}

// Shadow Mode audit trail — write-only from the engine's perspective. Errors
// are logged and swallowed by implementations (same fire-and-forget
// convention as ICatalogRepository.insertPriceHistory): a failure to record
// a shadow match must never abort or alter the real sync pipeline.
//
// CTO review (Wave 3 approval): this log is a permanent Brain-facing asset,
// not a debugging aid. Rows are append-only by design — there is
// deliberately no update()/upsert() method here. A historical evaluation is
// never recalculated in place; a future algorithm change ships as a new
// algorithmVersion and produces new rows, leaving old ones exactly as they
// were when produced.
export interface IProductIdentityMatchLogRepository {
  record(entry: MatchLogEntry): Promise<void>;
}
