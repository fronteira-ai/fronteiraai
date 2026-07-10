import { DeltaEngine } from "../delta/DeltaEngine";
import type { DeltaCandidate } from "../delta/DeltaEngine";

describe("DeltaEngine", () => {
  const engine = new DeltaEngine();

  it("fetches a key with no previous checkpoint", () => {
    const candidates: DeltaCandidate[] = [{ key: "https://x.com/a", checkpoint: "2026-07-01" }];
    const { toFetch, skipped } = engine.plan(candidates, new Map());
    expect(toFetch).toEqual(["https://x.com/a"]);
    expect(skipped).toEqual([]);
  });

  it("skips a key whose checkpoint is unchanged since the last known state", () => {
    const candidates: DeltaCandidate[] = [{ key: "https://x.com/a", checkpoint: "2026-07-01" }];
    const previous = new Map([["https://x.com/a", "2026-07-01"]]);
    const { toFetch, skipped } = engine.plan(candidates, previous);
    expect(toFetch).toEqual([]);
    expect(skipped).toEqual(["https://x.com/a"]);
  });

  it("fetches a key whose checkpoint moved forward", () => {
    const candidates: DeltaCandidate[] = [{ key: "https://x.com/a", checkpoint: "2026-07-02" }];
    const previous = new Map([["https://x.com/a", "2026-07-01"]]);
    const { toFetch, skipped } = engine.plan(candidates, previous);
    expect(toFetch).toEqual(["https://x.com/a"]);
    expect(skipped).toEqual([]);
  });

  it("always fetches a key with no checkpoint declared, even with a previous state present for other keys", () => {
    const candidates: DeltaCandidate[] = [{ key: "https://x.com/b", checkpoint: null }];
    const previous = new Map([["https://x.com/a", "2026-07-01"]]);
    const { toFetch, skipped } = engine.plan(candidates, previous);
    expect(toFetch).toEqual(["https://x.com/b"]);
    expect(skipped).toEqual([]);
  });

  it("handles a mixed batch correctly", () => {
    const candidates: DeltaCandidate[] = [
      { key: "https://x.com/unchanged", checkpoint: "2026-07-01" },
      { key: "https://x.com/changed", checkpoint: "2026-07-03" },
      { key: "https://x.com/new", checkpoint: "2026-07-01" },
      { key: "https://x.com/no-checkpoint", checkpoint: null },
    ];
    const previous = new Map([
      ["https://x.com/unchanged", "2026-07-01"],
      ["https://x.com/changed", "2026-07-01"],
    ]);

    const { toFetch, skipped } = engine.plan(candidates, previous);
    expect(skipped).toEqual(["https://x.com/unchanged"]);
    expect(toFetch.sort()).toEqual(["https://x.com/changed", "https://x.com/new", "https://x.com/no-checkpoint"].sort());
  });
});
