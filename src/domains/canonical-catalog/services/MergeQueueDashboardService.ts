import { MergeCandidateStatus, MergeExecutionStatus } from "../types/enums";
import type { IMergeCandidateRepository } from "../repositories/IMergeCandidateRepository";
import type { IMergeExecutionRepository } from "../repositories/IMergeExecutionRepository";

// Program Ω — Mission Ω-1 (Merge Execution Engine), Objetivo 4. Same
// compute-on-read discipline as every other *DashboardService in this
// codebase (ExchangeDashboardService, RealtimeCommerceDashboardService,
// MarketplaceOperationsDashboardService) — no new aggregate table, every
// number is a live count/sum over merge_candidates/merge_executions.
export interface MergeQueueStats {
  pending: number;
  approved: number;
  merged: number;
  rejected: number;
  rolledBack: number;
  totalOffersMoved: number;
  /** merged / (merged + rolledBack). null when there have been zero
   * executions at all — an honest "not yet measurable", never a fabricated 0
   * or 100 (same discipline as ExchangeProviderHealthService's NeverStarted
   * fix, ADR-precedent this Wave reuses rather than reinvents). */
  successRate: number | null;
}

const EXECUTIONS_SAMPLE_LIMIT = 5000;

function countOf(page: { total: number }): number {
  return page.total;
}

export class MergeQueueDashboardService {
  constructor(
    private readonly candidateRepo: IMergeCandidateRepository,
    private readonly executionRepo: IMergeExecutionRepository
  ) {}

  async getStats(): Promise<MergeQueueStats> {
    const zeroPage = { limit: 1, offset: 0 };

    const [pendingPage, approvedPage, mergedPage, rejectedPage, rolledBackPage, executedExecutions] = await Promise.all([
      this.candidateRepo.findByStatus(MergeCandidateStatus.Pending, zeroPage),
      this.candidateRepo.findByStatus(MergeCandidateStatus.Approved, zeroPage),
      this.candidateRepo.findByStatus(MergeCandidateStatus.Merged, zeroPage),
      this.candidateRepo.findByStatus(MergeCandidateStatus.Rejected, zeroPage),
      this.candidateRepo.findByStatus(MergeCandidateStatus.RolledBack, zeroPage),
      this.executionRepo.findByStatus(MergeExecutionStatus.Executed, { limit: EXECUTIONS_SAMPLE_LIMIT, offset: 0 }),
    ]);

    const merged = countOf(mergedPage);
    const rolledBack = countOf(rolledBackPage);
    const totalAttempts = merged + rolledBack;

    const totalOffersMoved = executedExecutions.items.reduce((sum, execution) => sum + execution.movedOfferIds.length, 0);

    return {
      pending: countOf(pendingPage),
      approved: countOf(approvedPage),
      merged,
      rejected: countOf(rejectedPage),
      rolledBack,
      totalOffersMoved,
      successRate: totalAttempts === 0 ? null : merged / totalAttempts,
    };
  }
}
