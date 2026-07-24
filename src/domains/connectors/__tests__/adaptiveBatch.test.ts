import { computeAdaptiveBatchSize } from "../services/outbox/adaptiveBatch";

describe("computeAdaptiveBatchSize", () => {
  it("returns minBatch when there is no backlog", () => {
    expect(computeAdaptiveBatchSize(0, 20, 10, 200)).toBe(10);
  });

  it("never returns less than minBatch, even with a tiny backlog and zero throughput", () => {
    expect(computeAdaptiveBatchSize(1, 0, 10, 200)).toBeGreaterThanOrEqual(10);
  });

  it("never returns more than maxBatch, even with a huge backlog and high throughput", () => {
    expect(computeAdaptiveBatchSize(1_000_000, 10_000, 10, 200)).toBe(200);
  });

  it("never exceeds the backlog itself when the backlog is smaller than the throughput target", () => {
    const result = computeAdaptiveBatchSize(15, 100, 10, 200);
    expect(result).toBeLessThanOrEqual(15);
  });

  it("scales up with a larger backlog when there is no throughput signal yet (cold start)", () => {
    const small = computeAdaptiveBatchSize(50, 0, 10, 200);
    const large = computeAdaptiveBatchSize(5000, 0, 10, 200);
    expect(large).toBeGreaterThan(small);
  });

  it("targets roughly one minute of recent throughput when a signal exists", () => {
    const result = computeAdaptiveBatchSize(10_000, 75, 10, 200);
    expect(result).toBe(75);
  });
});
