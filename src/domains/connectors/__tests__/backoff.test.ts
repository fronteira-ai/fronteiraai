import { computeBackoffDelayMs, computeNextAttemptAt, isDeadLetter, MAX_ATTEMPTS } from "../services/outbox/backoff";

describe("computeBackoffDelayMs", () => {
  it("grows exponentially with attempts", () => {
    const d1 = computeBackoffDelayMs(1);
    const d2 = computeBackoffDelayMs(2);
    const d3 = computeBackoffDelayMs(3);
    expect(d2).toBeGreaterThan(d1);
    expect(d3).toBeGreaterThan(d2);
  });

  it("never exceeds the 1-hour cap, even for a very large attempts count", () => {
    expect(computeBackoffDelayMs(50)).toBe(3_600_000);
  });
});

describe("computeNextAttemptAt", () => {
  it("returns a timestamp strictly after `now`, offset by the backoff delay", () => {
    const now = new Date("2026-07-24T00:00:00Z");
    const next = computeNextAttemptAt(2, now);

    expect(new Date(next).getTime()).toBe(now.getTime() + computeBackoffDelayMs(2));
  });
});

describe("isDeadLetter", () => {
  it("is false below MAX_ATTEMPTS", () => {
    expect(isDeadLetter(MAX_ATTEMPTS - 1)).toBe(false);
  });

  it("is true at or above MAX_ATTEMPTS", () => {
    expect(isDeadLetter(MAX_ATTEMPTS)).toBe(true);
    expect(isDeadLetter(MAX_ATTEMPTS + 1)).toBe(true);
  });
});
