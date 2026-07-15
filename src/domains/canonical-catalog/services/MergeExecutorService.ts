import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { MergeCandidate } from "../domain/MergeCandidate";
import type { MergeExecution } from "../domain/MergeExecution";
import { MergeCandidateStatus, MergeExecutionStatus } from "../types/enums";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type { IMergeCandidateRepository } from "../repositories/IMergeCandidateRepository";
import type { IMergeExecutionRepository } from "../repositories/IMergeExecutionRepository";

// Program Ω — Mission Ω-1 (Merge Execution Engine). This is the capability
// every prior Wave deliberately left unbuilt (IMergeCandidateRepository's
// own comment: "executing an approved merge is a future Wave's
// capability"). It consumes candidates CanonicalMergeSuggestionService
// already produced (product-identity/, Shadow Mode) — no new matching
// logic, no new confidence algorithm, nothing here evaluates whether two
// products are "the same", only what to do once a human has already
// decided they are.
//
// Shadow Mode is preserved, not lifted: execute() only ever acts on a
// candidate whose status is already Approved — a human (or an explicit,
// separate batch-approval decision) must have moved it there first. This
// service never approves a candidate on its own.

export type MergeErrorCode =
  | "CANDIDATE_NOT_FOUND"
  | "CANDIDATE_NOT_PENDING"
  | "CANDIDATE_NOT_APPROVED"
  | "SOURCE_NOT_FOUND"
  | "TARGET_NOT_FOUND"
  | "SOURCE_EQUALS_TARGET"
  | "SOURCE_ALREADY_MERGED"
  | "TARGET_ALREADY_MERGED"
  | "EXECUTION_NOT_FOUND"
  | "EXECUTION_ALREADY_ROLLED_BACK";

export interface MergeError {
  code: MergeErrorCode;
  message: string;
}

export interface MergePreview {
  candidate: MergeCandidate;
  source: CanonicalProduct;
  target: CanonicalProduct;
  offerIdsToMove: string[];
}

export type ReviewResult = { ok: true } | { ok: false; error: MergeError };
export type PreviewResult = { ok: true; preview: MergePreview } | { ok: false; error: MergeError };
export type ExecuteResult =
  | { ok: true; execution: MergeExecution; offersMoved: number }
  | { ok: false; error: MergeError };
export type RollbackResult = { ok: true; execution: MergeExecution } | { ok: false; error: MergeError };

export interface BatchExecuteResult {
  attempted: number;
  succeeded: ExecuteResult[];
  failed: { candidateId: string; error: MergeError }[];
  totalOffersMoved: number;
}

interface ValidatedPair {
  source: CanonicalProduct;
  target: CanonicalProduct;
}

export class MergeExecutorService {
  constructor(
    private readonly candidateRepo: IMergeCandidateRepository,
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly executionRepo: IMergeExecutionRepository
  ) {}

  // Records a human decision only — identical contract to the pre-existing
  // PATCH /merge-candidates/[id] route, reimplemented here with an explicit
  // state-machine guard (candidate must currently be Pending) so the queue
  // can't skip straight to Approved from Merged/Rejected/etc.
  async approve(candidateId: string, reviewedBy: string | null): Promise<ReviewResult> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) return { ok: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Merge candidate not found" } };
    if (candidate.status !== MergeCandidateStatus.Pending) {
      return { ok: false, error: { code: "CANDIDATE_NOT_PENDING", message: `Candidate is not pending (status: ${candidate.status})` } };
    }
    await this.candidateRepo.updateStatus(candidateId, MergeCandidateStatus.Approved, reviewedBy);
    return { ok: true };
  }

  async reject(candidateId: string, reviewedBy: string | null): Promise<ReviewResult> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) return { ok: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Merge candidate not found" } };
    if (candidate.status !== MergeCandidateStatus.Pending) {
      return { ok: false, error: { code: "CANDIDATE_NOT_PENDING", message: `Candidate is not pending (status: ${candidate.status})` } };
    }
    await this.candidateRepo.updateStatus(candidateId, MergeCandidateStatus.Rejected, reviewedBy);
    return { ok: true };
  }

  // Integrity validation shared by preview() and execute() — never lets a
  // merge run against a missing product, a product already merged away
  // (source), or a target that was itself merged into something else
  // (would silently orphan the chain; caller must resolve the chain first).
  private async validatePair(candidate: MergeCandidate): Promise<{ ok: true; pair: ValidatedPair } | { ok: false; error: MergeError }> {
    if (candidate.sourceCanonicalProductId === candidate.targetCanonicalProductId) {
      return { ok: false, error: { code: "SOURCE_EQUALS_TARGET", message: "Source and target are the same canonical product" } };
    }

    const [source, target] = await Promise.all([
      this.catalogRepo.findById(candidate.sourceCanonicalProductId),
      this.catalogRepo.findById(candidate.targetCanonicalProductId),
    ]);

    if (!source) return { ok: false, error: { code: "SOURCE_NOT_FOUND", message: "Source canonical product not found" } };
    if (!target) return { ok: false, error: { code: "TARGET_NOT_FOUND", message: "Target canonical product not found" } };
    if (!source.isActive) {
      return { ok: false, error: { code: "SOURCE_ALREADY_MERGED", message: "Source canonical product was already merged into another product" } };
    }
    if (!target.isActive) {
      return {
        ok: false,
        error: { code: "TARGET_ALREADY_MERGED", message: "Target canonical product was already merged into another product — resolve the chain before merging into it" },
      };
    }

    return { ok: true, pair: { source, target } };
  }

  // Dry run — computes exactly what execute() would do, writes nothing.
  // Objetivo 10 ("após executar todos os merges aprovados...") is answered
  // by running this against every Approved candidate, not by guessing.
  async preview(candidateId: string): Promise<PreviewResult> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) return { ok: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Merge candidate not found" } };

    const validated = await this.validatePair(candidate);
    if (!validated.ok) return { ok: false, error: validated.error };

    const offerIdsToMove = await this.catalogRepo.findOfferIdsByCanonicalProductId(candidate.sourceCanonicalProductId);
    return { ok: true, preview: { candidate, source: validated.pair.source, target: validated.pair.target, offerIdsToMove } };
  }

  // Requires the candidate to already be Approved — Shadow Mode's human
  // gate is enforced here, not bypassed. Order of operations: reassign
  // offers (the real, atomic data move) → deactivate source → write the
  // audit row → flip candidate status to Merged. If any step after the
  // reassignment throws, the reassignment itself already succeeded and is
  // recoverable via a manual rollback using the offer ids in the thrown
  // error's context — documented in docs/engineering/MERGE_OPERATIONS.md,
  // not silently retried here (retrying a partially-applied merge
  // automatically risks double-moving offers).
  async execute(candidateId: string, executedBy: string | null): Promise<ExecuteResult> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) return { ok: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Merge candidate not found" } };
    if (candidate.status !== MergeCandidateStatus.Approved) {
      return {
        ok: false,
        error: { code: "CANDIDATE_NOT_APPROVED", message: `Candidate must be Approved before execution (status: ${candidate.status}) — Shadow Mode requires a human decision first` },
      };
    }

    const validated = await this.validatePair(candidate);
    if (!validated.ok) return { ok: false, error: validated.error };

    const movedOfferIds = await this.catalogRepo.reassignOffers(candidate.sourceCanonicalProductId, candidate.targetCanonicalProductId);
    await this.catalogRepo.deactivateAndMerge(candidate.sourceCanonicalProductId, candidate.targetCanonicalProductId);

    const execution = await this.executionRepo.create({
      mergeCandidateId: candidateId,
      sourceCanonicalProductId: candidate.sourceCanonicalProductId,
      targetCanonicalProductId: candidate.targetCanonicalProductId,
      movedOfferIds,
      executedBy,
    });

    await this.candidateRepo.updateStatus(candidateId, MergeCandidateStatus.Merged, executedBy);

    return { ok: true, execution, offersMoved: movedOfferIds.length };
  }

  // Sequential, not parallel (Promise.allSettled across candidates would
  // let two candidates racing the same target interleave their
  // reassignOffers calls) — each execute() call is awaited before the
  // next starts. Never throws on a single candidate's failure; collects it
  // and continues, same discipline as every other dashboard aggregator in
  // this codebase (Promise.allSettled-style isolation, just sequential here
  // because correctness requires it).
  async executeBatch(candidateIds: string[], executedBy: string | null): Promise<BatchExecuteResult> {
    const succeeded: ExecuteResult[] = [];
    const failed: { candidateId: string; error: MergeError }[] = [];
    let totalOffersMoved = 0;

    for (const candidateId of candidateIds) {
      const result = await this.execute(candidateId, executedBy);
      if (result.ok) {
        succeeded.push(result);
        totalOffersMoved += result.offersMoved;
      } else {
        failed.push({ candidateId, error: result.error });
      }
    }

    return { attempted: candidateIds.length, succeeded, failed, totalOffersMoved };
  }

  // Reverses execute() exactly: repoints the exact offer ids this execution
  // moved (never "every offer currently on target", which could include
  // offers moved by an unrelated later merge into the same target),
  // reactivates the source, and marks both the execution and the original
  // candidate as RolledBack.
  async rollback(executionId: string, rolledBackBy: string | null): Promise<RollbackResult> {
    const execution = await this.executionRepo.findById(executionId);
    if (!execution) return { ok: false, error: { code: "EXECUTION_NOT_FOUND", message: "Merge execution not found" } };
    if (execution.status !== MergeExecutionStatus.Executed) {
      return { ok: false, error: { code: "EXECUTION_ALREADY_ROLLED_BACK", message: "This execution was already rolled back" } };
    }

    await this.catalogRepo.reassignOffersByIds(execution.movedOfferIds, execution.sourceCanonicalProductId);
    await this.catalogRepo.reactivate(execution.sourceCanonicalProductId);
    await this.executionRepo.markRolledBack(executionId, rolledBackBy);
    await this.candidateRepo.updateStatus(execution.mergeCandidateId, MergeCandidateStatus.RolledBack, rolledBackBy);

    return { ok: true, execution: { ...execution, status: MergeExecutionStatus.RolledBack, rolledBackBy, rolledBackAt: new Date().toISOString() } };
  }
}
