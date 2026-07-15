import type { MergeCandidate } from "../domain/MergeCandidate";
import type { IMergeCandidateRepository } from "../repositories/IMergeCandidateRepository";
import { MergeCandidateStatus } from "../types/enums";

// Program Ω — Mission Ω-1 (Merge Execution Engine), Objetivo 1. "Não criar
// novos algoritmos" — these thresholds are deliberately duplicated from
// product-identity's CONFIDENCE_THRESHOLDS (src/domains/product-identity/
// types/enums.ts: auto=95, probable=85, possible=70), never imported,
// because canonical-catalog/ must never depend on product-identity/ (see
// domain/MergeCandidate.ts's own comment on this rule). Every
// merge_candidates row already has confidence >= 70 by construction
// (CanonicalMergeSuggestionService only ever writes "possible" tier or
// above) — this classifier just re-labels the same number the engine
// already computed, using the same tier boundaries the CTO already approved.
export const MERGE_AUDIT_ALTA_THRESHOLD = 95;
export const MERGE_AUDIT_MEDIA_THRESHOLD = 85;

export type MergeConfidenceClassification = "alta" | "media" | "revisao_manual";

export function classifyMergeConfidence(confidence: number): MergeConfidenceClassification {
  if (confidence >= MERGE_AUDIT_ALTA_THRESHOLD) return "alta";
  if (confidence >= MERGE_AUDIT_MEDIA_THRESHOLD) return "media";
  return "revisao_manual";
}

export interface MergeCandidateAudit {
  total: number;
  alta: MergeCandidate[];
  media: MergeCandidate[];
  revisaoManual: MergeCandidate[];
}

const PAGE_SIZE = 500;

export class MergeAuditService {
  constructor(private readonly candidateRepo: IMergeCandidateRepository) {}

  // Paginates through every `pending` candidate (findByStatus already
  // supports pagination) and buckets each by the reused confidence tiers
  // above. Read-only — never touches status.
  async classifyPending(): Promise<MergeCandidateAudit> {
    const all: MergeCandidate[] = [];
    let offset = 0;

    while (true) {
      const page = await this.candidateRepo.findByStatus(MergeCandidateStatus.Pending, { limit: PAGE_SIZE, offset });
      all.push(...page.items);
      offset += PAGE_SIZE;
      if (page.items.length === 0 || all.length >= page.total) break;
    }

    const alta: MergeCandidate[] = [];
    const media: MergeCandidate[] = [];
    const revisaoManual: MergeCandidate[] = [];

    for (const candidate of all) {
      const tier = classifyMergeConfidence(candidate.confidence);
      if (tier === "alta") alta.push(candidate);
      else if (tier === "media") media.push(candidate);
      else revisaoManual.push(candidate);
    }

    return { total: all.length, alta, media, revisaoManual };
  }
}
