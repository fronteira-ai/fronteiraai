import {
  startSweep,
  advanceSweep,
  sweepProgressPercent,
  isSweepComplete,
} from "../scheduler/AdaptiveSyncEngine";

describe("Adaptive Sync Engine — Full Sweep continuation (Catalog Convergence Part B)", () => {
  const now = () => new Date("2026-08-28T12:00:00Z");

  it("inicia sweep do zero com cursor 0 e progresso 0%", () => {
    const s = startSweep({ sweepId: "sw1", totalCategories: 10, now: now() });
    expect(s.sweep_id).toBe("sw1");
    expect(s.category_offset).toBe(0);
    expect(s.processed_categories).toBe(0);
    expect(sweepProgressPercent(s)).toBe(0);
    expect(isSweepComplete(s)).toBe(false);
  });

  it("advanceSweep avança o cursor e acumula contagens (continuation)", () => {
    let s = startSweep({ sweepId: "sw1", totalCategories: 10, now: now() });
    s = advanceSweep(s, { categoriesProcessed: 3, now: now(), discovered: 200, processed: 180, valid: 170, invalid: 10, errors: 2 });
    expect(s.category_offset).toBe(3);
    expect(s.processed_categories).toBe(3);
    expect(sweepProgressPercent(s)).toBe(30);
    expect(isSweepComplete(s)).toBe(false);

    // próximo wake retoma a partir do cursor persistido
    const resumed = startSweep({ sweepId: "sw1", totalCategories: 10, now: now(), resumeFrom: s });
    expect(resumed.category_offset).toBe(3);
    expect(resumed.valid).toBe(170); // contagens acumuladas preservadas

    // completa
    s = advanceSweep(s, { categoriesProcessed: 7, now: now(), discovered: 0, processed: 0, valid: 0, invalid: 0, errors: 0 });
    expect(sweepProgressPercent(s)).toBe(100);
    expect(isSweepComplete(s)).toBe(true);
    expect(s.category_offset).toBe(10); // cursor = total quando completo
    expect(s.completed_at).toBeTruthy();
  });

  it("sweep diferente descarta o cursor anterior (sweep semântico)", () => {
    const prev = startSweep({ sweepId: "OLD", totalCategories: 5, now: now() });
    prev.category_offset = 4;
    const fresh = startSweep({ sweepId: "NEW", totalCategories: 8, now: now(), resumeFrom: prev });
    expect(fresh.category_offset).toBe(0); // não herda cursor de outro sweep
    expect(fresh.processed_categories).toBe(0);
  });

  it("sweepProgressPercent é null quando não determinável", () => {
    expect(sweepProgressPercent(null)).toBeNull();
    expect(sweepProgressPercent({})).toBeNull();
  });
});
