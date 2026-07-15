import { MergeQueueDashboardService } from "../services/MergeQueueDashboardService";
import type { IMergeCandidateRepository } from "../repositories/IMergeCandidateRepository";
import type { IMergeExecutionRepository } from "../repositories/IMergeExecutionRepository";
import { MergeCandidateStatus, MergeExecutionStatus } from "../types/enums";
import type { MergeExecution } from "../domain/MergeExecution";

function totalPage(total: number) {
  return { items: [], total };
}

function makeCandidateRepo(totals: Partial<Record<MergeCandidateStatus, number>>): IMergeCandidateRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByPair: jest.fn(),
    updateStatus: jest.fn(),
    findByStatus: jest.fn().mockImplementation(async (status: MergeCandidateStatus) => totalPage(totals[status] ?? 0)),
  };
}

function makeExecution(overrides: Partial<MergeExecution> = {}): MergeExecution {
  return {
    id: "e1",
    mergeCandidateId: "c1",
    sourceCanonicalProductId: "s1",
    targetCanonicalProductId: "t1",
    movedOfferIds: ["o1", "o2"],
    status: MergeExecutionStatus.Executed,
    executedAt: "2026-07-14T00:00:00Z",
    executedBy: null,
    rolledBackAt: null,
    rolledBackBy: null,
    ...overrides,
  };
}

function makeExecutionRepo(executedItems: MergeExecution[]): IMergeExecutionRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByCandidateId: jest.fn(),
    markRolledBack: jest.fn(),
    findByStatus: jest.fn().mockImplementation(async (status: MergeExecutionStatus) =>
      status === MergeExecutionStatus.Executed ? { items: executedItems, total: executedItems.length } : totalPage(0)
    ),
  };
}

describe("MergeQueueDashboardService.getStats", () => {
  it("reports counts per status, total offers moved, and a success rate", async () => {
    const candidateRepo = makeCandidateRepo({
      [MergeCandidateStatus.Pending]: 3106,
      [MergeCandidateStatus.Approved]: 5,
      [MergeCandidateStatus.Merged]: 8,
      [MergeCandidateStatus.Rejected]: 2,
      [MergeCandidateStatus.RolledBack]: 2,
    });
    const executionRepo = makeExecutionRepo([
      makeExecution({ movedOfferIds: ["a", "b"] }),
      makeExecution({ movedOfferIds: ["c"] }),
    ]);
    const service = new MergeQueueDashboardService(candidateRepo, executionRepo);

    const stats = await service.getStats();

    expect(stats).toEqual({
      pending: 3106,
      approved: 5,
      merged: 8,
      rejected: 2,
      rolledBack: 2,
      totalOffersMoved: 3,
      successRate: 8 / 10,
    });
  });

  it("returns successRate=null when there have been zero merge attempts — never a fabricated 0 or 100", async () => {
    const candidateRepo = makeCandidateRepo({});
    const executionRepo = makeExecutionRepo([]);
    const service = new MergeQueueDashboardService(candidateRepo, executionRepo);

    const stats = await service.getStats();

    expect(stats.successRate).toBeNull();
    expect(stats.totalOffersMoved).toBe(0);
  });

  it("a rolled-back merge counts against success rate but its offers are not counted as currently moved", async () => {
    const candidateRepo = makeCandidateRepo({
      [MergeCandidateStatus.Merged]: 1,
      [MergeCandidateStatus.RolledBack]: 1,
    });
    // Only the still-Executed execution shows up in findByStatus(Executed, ...)
    const executionRepo = makeExecutionRepo([makeExecution({ movedOfferIds: ["a"] })]);
    const service = new MergeQueueDashboardService(candidateRepo, executionRepo);

    const stats = await service.getStats();

    expect(stats.successRate).toBe(0.5);
    expect(stats.totalOffersMoved).toBe(1);
  });
});
