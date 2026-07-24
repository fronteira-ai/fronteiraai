import { OutboxRetentionService } from "../services/outbox/OutboxRetentionService";
import { InMemoryCanonicalSuggestionOutboxRepository } from "./helpers/InMemoryCanonicalSuggestionOutboxRepository";

describe("OutboxRetentionService", () => {
  afterEach(() => {
    delete process.env.OUTBOX_RETENTION_DAYS;
  });

  it("deletes only 'done' rows older than the retention window", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    const old = repo.rows[0];
    old.status = "done";
    old.createdAt = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(); // 200 days ago

    const service = new OutboxRetentionService(repo);
    const result = await service.cleanup();

    expect(result.deletedCount).toBe(1);
    expect(repo.rows).toHaveLength(0);
  });

  it("never deletes pending/processing/dead_letter/expired, regardless of age", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    const veryOld = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    for (const status of ["pending", "processing", "dead_letter", "expired"] as const) {
      await repo.enqueue(`c-${status}`, "test:1");
      const entry = repo.rows[repo.rows.length - 1];
      entry.status = status;
      entry.createdAt = veryOld;
    }

    const service = new OutboxRetentionService(repo);
    const result = await service.cleanup();

    expect(result.deletedCount).toBe(0);
    expect(repo.rows).toHaveLength(4);
  });

  it("never deletes a 'done' row still within the retention window", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    repo.rows[0].status = "done";
    repo.rows[0].createdAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago

    const service = new OutboxRetentionService(repo);
    const result = await service.cleanup();

    expect(result.deletedCount).toBe(0);
    expect(repo.rows).toHaveLength(1);
  });

  it("respects OUTBOX_RETENTION_DAYS override without a redeploy", async () => {
    process.env.OUTBOX_RETENTION_DAYS = "1";
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    repo.rows[0].status = "done";
    repo.rows[0].createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago

    const service = new OutboxRetentionService(repo);
    const result = await service.cleanup();

    expect(result.retentionDays).toBe(1);
    expect(result.deletedCount).toBe(1);
  });

  it("is idempotent — running cleanup twice in a row deletes nothing the second time", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    repo.rows[0].status = "done";
    repo.rows[0].createdAt = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();

    const service = new OutboxRetentionService(repo);
    await service.cleanup();
    const second = await service.cleanup();

    expect(second.deletedCount).toBe(0);
  });
});
