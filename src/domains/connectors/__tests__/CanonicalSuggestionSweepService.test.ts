import { CanonicalSuggestionSweepService } from "../services/CanonicalSuggestionSweepService";
import { MAX_ATTEMPTS } from "../services/outbox/backoff";
import type { ICanonicalSuggestionOutboxRepository } from "../repositories/ICanonicalSuggestionOutboxRepository";
import type { CanonicalSuggestionOutboxEntry } from "../domain/CanonicalSuggestionOutboxEntry";
import type { CanonicalMergeSuggestionService } from "@/src/domains/product-identity";

function makeEntry(overrides: Partial<CanonicalSuggestionOutboxEntry> = {}): CanonicalSuggestionOutboxEntry {
  return {
    id: "entry-1",
    canonicalProductId: "canonical-1",
    status: "processing",
    priority: "normal",
    attempts: 0,
    lastError: null,
    lastAttemptedAt: null,
    nextAttemptAt: "2026-07-24T00:00:00Z",
    claimedAt: "2026-07-24T00:00:00Z",
    algorithmVersion: null,
    source: "test:batch-1",
    enqueuedAt: "2026-07-24T00:00:00Z",
    completedAt: null,
    createdAt: "2026-07-24T00:00:00Z",
    ...overrides,
  };
}

function makeOutboxRepo(overrides: Partial<ICanonicalSuggestionOutboxRepository> = {}): ICanonicalSuggestionOutboxRepository {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
    claimBatch: jest.fn().mockResolvedValue([]),
    markDone: jest.fn().mockResolvedValue(undefined),
    markFailedForRetry: jest.fn().mockResolvedValue(undefined),
    markDeadLetter: jest.fn().mockResolvedValue(undefined),
    countByStatus: jest.fn().mockResolvedValue({ pending: 0, processing: 0, done: 0, failed: 0, dead_letter: 0, expired: 0 }),
    oldestPendingNextAttemptAt: jest.fn().mockResolvedValue(null),
    countRetrying: jest.fn().mockResolvedValue(0),
    averageAttempts: jest.fn().mockResolvedValue(0),
    recentCompletionSamples: jest.fn().mockResolvedValue([]),
    countCompletedSince: jest.fn().mockResolvedValue({ done: 0, deadLetter: 0, expired: 0 }),
    deleteDoneOlderThan: jest.fn().mockResolvedValue(0),
    expireStaleRetries: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}

describe("CanonicalSuggestionSweepService — adaptive batch sizing (Mission Ω-Hardening)", () => {
  it("passes an explicit batchLimit straight to claimBatch, unchanged — full backward compatibility, never computes an adaptive size", async () => {
    const outboxRepo = makeOutboxRepo();
    const mergeSuggestionService = { suggestMergesFor: jest.fn() } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    await service.sweep(37, 60_000);

    expect(outboxRepo.claimBatch).toHaveBeenCalledWith(37, 60_000);
    expect(outboxRepo.countCompletedSince).not.toHaveBeenCalled(); // adaptive computation never runs
  });

  it("computes an adaptive batch size from backlog + recent throughput when batchLimit is omitted", async () => {
    const outboxRepo = makeOutboxRepo({
      countByStatus: jest.fn().mockResolvedValue({ pending: 500, processing: 0, done: 0, failed: 0, dead_letter: 0, expired: 0 }),
      countCompletedSince: jest.fn().mockResolvedValue({ done: 60, deadLetter: 0, expired: 0 }), // 60 in 5min = 12/min
    });
    const mergeSuggestionService = { suggestMergesFor: jest.fn() } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    await service.sweep();

    expect(outboxRepo.countCompletedSince).toHaveBeenCalled();
    const [limitArg] = (outboxRepo.claimBatch as jest.Mock).mock.calls[0];
    expect(limitArg).toBeGreaterThan(0);
    expect(Number.isInteger(limitArg)).toBe(true);
  });
});

describe("CanonicalSuggestionSweepService", () => {
  it("returns an empty summary when nothing is claimed", async () => {
    const outboxRepo = makeOutboxRepo();
    const mergeSuggestionService = { suggestMergesFor: jest.fn() } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    const result = await service.sweep();

    expect(result).toMatchObject({ claimed: 0, succeeded: 0, retried: 0, deadLettered: 0 });
    expect(mergeSuggestionService.suggestMergesFor).not.toHaveBeenCalled();
  });

  it("marks a successfully processed entry as done, stamped with the algorithm version", async () => {
    const entry = makeEntry();
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue([entry]) });
    const mergeSuggestionService = { suggestMergesFor: jest.fn().mockResolvedValue(undefined) } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    const result = await service.sweep();

    expect(mergeSuggestionService.suggestMergesFor).toHaveBeenCalledWith("canonical-1");
    expect(outboxRepo.markDone).toHaveBeenCalledWith("entry-1", expect.any(String));
    expect(result.succeeded).toBe(1);
  });

  it("retries a failed entry with backoff when attempts remain below MAX_ATTEMPTS", async () => {
    const entry = makeEntry({ attempts: 0 });
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue([entry]) });
    const mergeSuggestionService = { suggestMergesFor: jest.fn().mockRejectedValue(new Error("transient")) } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    const result = await service.sweep();

    expect(outboxRepo.markFailedForRetry).toHaveBeenCalledWith(
      "entry-1",
      expect.objectContaining({ attempts: 1, lastError: expect.stringContaining("transient") })
    );
    expect(outboxRepo.markDeadLetter).not.toHaveBeenCalled();
    expect(result.retried).toBe(1);
  });

  it("dead-letters an entry once attempts reach MAX_ATTEMPTS — never auto-requeues", async () => {
    const entry = makeEntry({ attempts: MAX_ATTEMPTS - 1 });
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue([entry]) });
    const mergeSuggestionService = { suggestMergesFor: jest.fn().mockRejectedValue(new Error("persistent")) } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    const result = await service.sweep();

    expect(outboxRepo.markDeadLetter).toHaveBeenCalledWith("entry-1", expect.objectContaining({ attempts: MAX_ATTEMPTS }));
    expect(outboxRepo.markFailedForRetry).not.toHaveBeenCalled();
    expect(result.deadLettered).toBe(1);
  });

  it("isolates one entry's failure — the rest of the batch is still processed", async () => {
    const entries = [makeEntry({ id: "e1", canonicalProductId: "c1" }), makeEntry({ id: "e2", canonicalProductId: "c2" }), makeEntry({ id: "e3", canonicalProductId: "c3" })];
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue(entries) });
    const suggestMergesFor = jest
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);
    const mergeSuggestionService = { suggestMergesFor } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    const result = await service.sweep();

    expect(suggestMergesFor).toHaveBeenCalledTimes(3);
    expect(result.succeeded).toBe(2);
    expect(result.retried).toBe(1);
  });

  it("reports queue-depth observability signals from the outbox", async () => {
    const outboxRepo = makeOutboxRepo({
      countByStatus: jest.fn().mockResolvedValue({ pending: 3, processing: 0, done: 10, failed: 0, dead_letter: 1 }),
      oldestPendingNextAttemptAt: jest.fn().mockResolvedValue("2026-07-24T01:00:00Z"),
    });
    const mergeSuggestionService = { suggestMergesFor: jest.fn() } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    const result = await service.sweep();

    expect(result.statusCounts).toMatchObject({ pending: 3, dead_letter: 1 });
    expect(result.oldestPendingNextAttemptAt).toBe("2026-07-24T01:00:00Z");
  });
});

describe("CanonicalSuggestionSweepService — deadline (2026-07-29 hotfix, Runtime Timeout 504)", () => {
  it("omitting deadlineAt processes the full batch exactly as before — zero behavior change for every existing caller", async () => {
    const entries = [makeEntry({ id: "e1", canonicalProductId: "c1" }), makeEntry({ id: "e2", canonicalProductId: "c2" })];
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue(entries) });
    const suggestMergesFor = jest.fn().mockResolvedValue(undefined);
    const mergeSuggestionService = { suggestMergesFor } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    const result = await service.sweep();

    expect(suggestMergesFor).toHaveBeenCalledTimes(2);
    expect(result.succeeded).toBe(2);
    expect(result.stoppedForDeadline).toBe(false);
  });

  it("a deadline already in the past stops before starting any entry — nothing processed, batch left processing for the next sweep to reclaim", async () => {
    const entries = [makeEntry({ id: "e1", canonicalProductId: "c1" }), makeEntry({ id: "e2", canonicalProductId: "c2" })];
    const outboxRepo = makeOutboxRepo({ claimBatch: jest.fn().mockResolvedValue(entries) });
    const suggestMergesFor = jest.fn().mockResolvedValue(undefined);
    const mergeSuggestionService = { suggestMergesFor } as unknown as CanonicalMergeSuggestionService;
    const service = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);

    const result = await service.sweep(2, 60_000, Date.now() - 1);

    expect(suggestMergesFor).not.toHaveBeenCalled();
    expect(outboxRepo.markDone).not.toHaveBeenCalled();
    expect(result.claimed).toBe(2); // still reported claimed — they were claimed, just not processed
    expect(result.succeeded).toBe(0);
    expect(result.stoppedForDeadline).toBe(true);
  });
});
