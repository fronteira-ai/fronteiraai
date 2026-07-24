import { InMemoryCanonicalSuggestionOutboxRepository } from "./helpers/InMemoryCanonicalSuggestionOutboxRepository";

describe("canonical_suggestion_outbox — priority ordering (claimBatch)", () => {
  it("claims HIGH priority items before NORMAL, and NORMAL before LOW", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("low-1", "test:1", "low");
    await repo.enqueue("normal-1", "test:1", "normal");
    await repo.enqueue("high-1", "test:1", "high");

    const claimed = await repo.claimBatch(10, 5 * 60_000);

    expect(claimed.map((c) => c.canonicalProductId)).toEqual(["high-1", "normal-1", "low-1"]);
  });

  it("orders by createdAt within the same priority", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("normal-first", "test:1", "normal");
    await repo.enqueue("normal-second", "test:1", "normal");

    const claimed = await repo.claimBatch(10, 5 * 60_000);

    expect(claimed.map((c) => c.canonicalProductId)).toEqual(["normal-first", "normal-second"]);
  });

  it("a HIGH item enqueued after a NORMAL item still claims first (priority beats FIFO)", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("normal-1", "test:1", "normal");
    await repo.enqueue("high-1", "test:1", "high");

    const claimed = await repo.claimBatch(10, 5 * 60_000);

    expect(claimed[0].canonicalProductId).toBe("high-1");
  });

  it("defaults to NORMAL when no priority is passed — every pre-existing enqueue() call (CanonicalLinkStage) is unaffected", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");

    expect(repo.rows[0].priority).toBe("normal");
  });

  it("respects the limit even when more due candidates exist", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    for (let i = 0; i < 5; i++) await repo.enqueue(`c${i}`, "test:1");

    const claimed = await repo.claimBatch(2, 5 * 60_000);

    expect(claimed).toHaveLength(2);
  });
});

describe("canonical_suggestion_outbox — idempotency under concurrent-looking invocation", () => {
  it("only one active row ever exists for the same canonicalProductId, even under Promise.all", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();

    await Promise.all([repo.enqueue("c1", "test:1"), repo.enqueue("c1", "test:2"), repo.enqueue("c1", "test:3")]);

    const active = repo.rows.filter((r) => r.canonicalProductId === "c1" && (r.status === "pending" || r.status === "processing"));
    expect(active).toHaveLength(1);
  });

  it("a claimed row is never returned by a second claimBatch call before it's finalized", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");

    const firstClaim = await repo.claimBatch(10, 5 * 60_000);
    const secondClaim = await repo.claimBatch(10, 5 * 60_000);

    expect(firstClaim).toHaveLength(1);
    expect(secondClaim).toHaveLength(0); // already 'processing', not yet stale
  });

  it("a stale 'processing' claim (worker died mid-item) becomes reclaimable after the staleness window", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    await repo.claimBatch(10, 5 * 60_000);
    repo.rows[0].claimedAt = new Date(Date.now() - 10 * 60_000).toISOString(); // 10 minutes ago

    const reclaimed = await repo.claimBatch(10, 5 * 60_000); // 5-minute staleness window

    expect(reclaimed).toHaveLength(1);
    expect(reclaimed[0].canonicalProductId).toBe("c1");
  });
});
