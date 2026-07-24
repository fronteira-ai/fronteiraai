import { OutboxExpirationService } from "../services/outbox/OutboxExpirationService";
import { InMemoryCanonicalSuggestionOutboxRepository } from "./helpers/InMemoryCanonicalSuggestionOutboxRepository";

describe("OutboxExpirationService", () => {
  afterEach(() => {
    delete process.env.MAX_RETRY_AGE_DAYS;
  });

  it("moves a stale 'pending' item to 'expired' and records the reason", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    repo.rows[0].enqueuedAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 days ago

    const service = new OutboxExpirationService(repo);
    const result = await service.expireStaleRetries();

    expect(result.expiredCount).toBe(1);
    expect(repo.rows[0].status).toBe("expired");
    expect(repo.rows[0].lastError).toContain("MAX_RETRY_AGE_DAYS");
  });

  it("expires based on enqueuedAt age, independent of attempts count", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    repo.rows[0].attempts = 0; // never even retried yet — still eligible if simply old enough
    repo.rows[0].enqueuedAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

    const service = new OutboxExpirationService(repo);
    const result = await service.expireStaleRetries();

    expect(result.expiredCount).toBe(1);
  });

  it("never expires processing/done/dead_letter/already-expired rows", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    const veryOld = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    for (const status of ["processing", "done", "dead_letter", "expired"] as const) {
      await repo.enqueue(`c-${status}`, "test:1");
      const entry = repo.rows[repo.rows.length - 1];
      entry.status = status;
      entry.enqueuedAt = veryOld;
    }

    const service = new OutboxExpirationService(repo);
    const result = await service.expireStaleRetries();

    expect(result.expiredCount).toBe(0);
  });

  it("never expires a 'pending' row still within MAX_RETRY_AGE_DAYS", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    repo.rows[0].enqueuedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago

    const service = new OutboxExpirationService(repo);
    const result = await service.expireStaleRetries();

    expect(result.expiredCount).toBe(0);
    expect(repo.rows[0].status).toBe("pending");
  });

  it("respects MAX_RETRY_AGE_DAYS override without a redeploy", async () => {
    process.env.MAX_RETRY_AGE_DAYS = "1";
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    repo.rows[0].enqueuedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const service = new OutboxExpirationService(repo);
    const result = await service.expireStaleRetries();

    expect(result.maxRetryAgeDays).toBe(1);
    expect(result.expiredCount).toBe(1);
  });

  it("is idempotent — an already-expired row is never re-expired or re-counted", async () => {
    const repo = new InMemoryCanonicalSuggestionOutboxRepository();
    await repo.enqueue("c1", "test:1");
    repo.rows[0].enqueuedAt = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();

    const service = new OutboxExpirationService(repo);
    await service.expireStaleRetries();
    const second = await service.expireStaleRetries();

    expect(second.expiredCount).toBe(0);
  });
});
