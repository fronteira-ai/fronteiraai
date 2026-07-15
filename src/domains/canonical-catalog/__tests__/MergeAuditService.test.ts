import { MergeAuditService, classifyMergeConfidence } from "../services/MergeAuditService";
import type { IMergeCandidateRepository } from "../repositories/IMergeCandidateRepository";
import type { MergeCandidate } from "../domain/MergeCandidate";
import { MergeCandidateStatus } from "../types/enums";

function makeCandidate(overrides: Partial<MergeCandidate> = {}): MergeCandidate {
  return {
    id: "candidate-1",
    sourceCanonicalProductId: "source-1",
    targetCanonicalProductId: "target-1",
    confidence: 90,
    algorithmVersion: "1.0.0",
    matchedAttributes: [],
    mismatchedAttributes: [],
    penalties: [],
    reason: "test",
    status: MergeCandidateStatus.Pending,
    reviewedAt: null,
    reviewedBy: null,
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

function makeRepo(overrides: Partial<IMergeCandidateRepository> = {}): IMergeCandidateRepository {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByStatus: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    findByPair: jest.fn(),
    updateStatus: jest.fn(),
    ...overrides,
  };
}

describe("classifyMergeConfidence", () => {
  it("classifies confidence >= 95 as alta", () => {
    expect(classifyMergeConfidence(95)).toBe("alta");
    expect(classifyMergeConfidence(99)).toBe("alta");
  });

  it("classifies confidence in [85, 95) as media", () => {
    expect(classifyMergeConfidence(85)).toBe("media");
    expect(classifyMergeConfidence(94.9)).toBe("media");
  });

  it("classifies confidence in [70, 85) as revisao_manual — the floor CanonicalMergeSuggestionService already enforces", () => {
    expect(classifyMergeConfidence(70)).toBe("revisao_manual");
    expect(classifyMergeConfidence(84.9)).toBe("revisao_manual");
  });
});

describe("MergeAuditService.classifyPending", () => {
  it("buckets candidates by tier and reports the correct total", async () => {
    const items = [
      makeCandidate({ id: "a", confidence: 98 }),
      makeCandidate({ id: "b", confidence: 90 }),
      makeCandidate({ id: "c", confidence: 72 }),
      makeCandidate({ id: "d", confidence: 100 }),
    ];
    const findByStatus = jest.fn().mockResolvedValue({ items, total: items.length });
    const service = new MergeAuditService(makeRepo({ findByStatus }));

    const audit = await service.classifyPending();

    expect(audit.total).toBe(4);
    expect(audit.alta.map((c) => c.id)).toEqual(["a", "d"]);
    expect(audit.media.map((c) => c.id)).toEqual(["b"]);
    expect(audit.revisaoManual.map((c) => c.id)).toEqual(["c"]);
  });

  it("only ever classifies status=Pending candidates", async () => {
    const findByStatus = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const service = new MergeAuditService(makeRepo({ findByStatus }));

    await service.classifyPending();

    expect(findByStatus).toHaveBeenCalledWith(MergeCandidateStatus.Pending, expect.any(Object));
  });

  it("paginates through every page until every candidate has been fetched", async () => {
    const page1 = Array.from({ length: 2 }, (_, i) => makeCandidate({ id: `p1-${i}`, confidence: 95 }));
    const page2 = Array.from({ length: 1 }, (_, i) => makeCandidate({ id: `p2-${i}`, confidence: 95 }));
    const findByStatus = jest
      .fn()
      .mockResolvedValueOnce({ items: page1, total: 3 })
      .mockResolvedValueOnce({ items: page2, total: 3 });
    const service = new MergeAuditService(makeRepo({ findByStatus }));

    const audit = await service.classifyPending();

    expect(audit.total).toBe(3);
    expect(findByStatus).toHaveBeenCalledTimes(2);
  });

  it("returns an empty audit when there are no pending candidates", async () => {
    const service = new MergeAuditService(makeRepo());
    const audit = await service.classifyPending();
    expect(audit).toEqual({ total: 0, alta: [], media: [], revisaoManual: [] });
  });
});
