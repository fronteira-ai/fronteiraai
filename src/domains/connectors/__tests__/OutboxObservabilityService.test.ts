import { OutboxObservabilityService, summarizeCanonicalLinkStageMetrics } from "../services/outbox/OutboxObservabilityService";
import { InMemoryCanonicalSuggestionOutboxRepository } from "./helpers/InMemoryCanonicalSuggestionOutboxRepository";
import type { StageMetrics } from "../types/pipeline.types";

describe("OutboxObservabilityService", () => {
  it("reports queue composition matching real row counts", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    await repo.enqueue("c2", "test:1");
    repo.rows[1].status = "done";

    const service = new OutboxObservabilityService(repo);
    const snapshot = await service.snapshot();

    expect(snapshot.pending).toBe(1);
    expect(snapshot.done).toBe(1);
    expect(snapshot.queueSizeActive).toBe(1);
    expect(snapshot.backlogRemaining).toBe(1);
  });

  it("computes deadLetterRate as dead_letter / terminal total", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    await repo.enqueue("c2", "test:1");
    await repo.enqueue("c3", "test:1");
    repo.rows[0].status = "done";
    repo.rows[1].status = "done";
    repo.rows[2].status = "dead_letter";

    const service = new OutboxObservabilityService(repo);
    const snapshot = await service.snapshot();

    expect(snapshot.deadLetterRate).toBeCloseTo(1 / 3);
  });

  it("returns null rates/percentiles (never NaN or Infinity) when there is no data yet", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    const service = new OutboxObservabilityService(repo);

    const snapshot = await service.snapshot();

    expect(snapshot.deadLetterRate).toBeNull();
    expect(snapshot.averageProcessingTimeMs).toBeNull();
    expect(snapshot.p95ProcessingTimeMs).toBeNull();
    expect(snapshot.p99ProcessingTimeMs).toBeNull();
    expect(snapshot.estimatedCompletionMinutes).toBeNull();
  });

  it("computes average processing time from real claimedAt/completedAt samples", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    const entry = repo.rows[0];
    entry.status = "done";
    entry.claimedAt = "2026-07-24T00:00:00.000Z";
    entry.completedAt = "2026-07-24T00:00:02.000Z"; // 2000ms

    const service = new OutboxObservabilityService(repo);
    const snapshot = await service.snapshot();

    expect(snapshot.averageProcessingTimeMs).toBe(2000);
  });

  it("suggestionsGenerated/Skipped map to done vs dead_letter+expired, documented as evaluation outcomes not literal candidate counts", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    await repo.enqueue("c2", "test:1");
    await repo.enqueue("c3", "test:1");
    repo.rows[0].status = "done";
    repo.rows[1].status = "dead_letter";
    repo.rows[2].status = "expired";

    const service = new OutboxObservabilityService(repo);
    const snapshot = await service.snapshot();

    expect(snapshot.suggestionsGenerated).toBe(1);
    expect(snapshot.suggestionsSkipped).toBe(2);
  });
});

describe("summarizeCanonicalLinkStageMetrics", () => {
  function makeStage(details: Record<string, number>): StageMetrics {
    return { stage: "canonical-link", startedAt: "t0", completedAt: "t1", durationMs: 10, accepted: 0, rejected: 0, skipped: 0, details };
  }

  it("computes success/failure rate from the canonical-link stage's own details bag", () => {
    const stages: StageMetrics[] = [
      makeStage({ offersProcessed: 10, canonicalCreated: 3, canonicalReused: 6, linksSucceeded: 9, bootstrapFailures: 1, linkFailures: 0, enqueued: 9, enqueueFailures: 0 }),
    ];

    const summary = summarizeCanonicalLinkStageMetrics(stages);

    expect(summary).toMatchObject({ offersProcessed: 10, linksSucceeded: 9, bootstrapFailures: 1, linkFailures: 0 });
    expect(summary!.successRate).toBeCloseTo(0.9);
    expect(summary!.failureRate).toBeCloseTo(0.1);
  });

  it("returns null when there is no canonical-link stage entry (e.g. dry-run or feature not wired)", () => {
    const stages: StageMetrics[] = [{ stage: "persistence", startedAt: "t0", completedAt: "t1", durationMs: 5, accepted: 1, rejected: 0, skipped: 0 }];

    expect(summarizeCanonicalLinkStageMetrics(stages)).toBeNull();
  });
});
