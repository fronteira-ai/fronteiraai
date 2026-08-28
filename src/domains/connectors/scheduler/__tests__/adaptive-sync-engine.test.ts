import {
  computeNextSyncAt,
  isDue,
  classifyHealth,
  onSyncOutcome,
  effectiveFrequencyMin,
  backoffMinute,
  TIER_DEFAULTS_MIN,
} from "../AdaptiveSyncEngine";

const T0 = new Date("2026-08-28T12:00:00Z");

describe("AdaptiveSyncEngine — scheduling/freshness (puro)", () => {
  it("effectiveFrequencyMin: tier > legacy config (retrocompat)", () => {
    expect(effectiveFrequencyMin({ tier: "HOT", configSyncFrequencyHours: 24 })).toBe(TIER_DEFAULTS_MIN.HOT);
    expect(effectiveFrequencyMin({ configSyncFrequencyHours: 24 })).toBe(1440);
    expect(effectiveFrequencyMin({ sync_frequency_min: 45 })).toBe(45);
    expect(effectiveFrequencyMin({})).toBe(TIER_DEFAULTS_MIN.COLD);
  });

  it("next_sync_at no due→agenda na cadência do tier (HOT=30min)", () => {
    const next = computeNextSyncAt({ state: { tier: "HOT" }, now: T0 });
    const ms = new Date(next).getTime() - T0.getTime();
    // 30 min ± jitter(1 min)
    expect(ms).toBeGreaterThan(29 * 60_000);
    expect(ms).toBeLessThanOrEqual(31 * 60_000);
  });

  it("next_sync_at com falhas usa backoff exponencial (>= cadência)", () => {
    const next = computeNextSyncAt({
      state: { tier: "HOT", consecutive_failures: 3 },
      now: T0,
      justFailed: true,
    });
    const ms = new Date(next).getTime() - T0.getTime();
    expect(ms).toBeGreaterThanOrEqual(60 * 60_000); // backoff 15*2^2=60min
  });

  it("backoffMinute dobra e capa no teto", () => {
    expect(backoffMinute(1)).toBe(15);
    expect(backoffMinute(2)).toBe(30);
    expect(backoffMinute(3)).toBe(60);
    expect(backoffMinute(10)).toBe(240); // cap
  });

  it("isDue: enabled=false → nunca; com next_sync_at no futuro → não due; passado → due", () => {
    expect(isDue({ state: { next_sync_at: new Date(T0.getTime() - 1000).toISOString() }, now: T0, enabled: false })).toBe(false);
    expect(isDue({ state: { next_sync_at: new Date(T0.getTime() + 60_000).toISOString() }, now: T0, enabled: true })).toBe(false);
    expect(isDue({ state: { next_sync_at: new Date(T0.getTime() - 60_000).toISOString() }, now: T0, enabled: true })).toBe(true);
    expect(isDue({ state: null, now: T0, enabled: true })).toBe(true); // nunca agendado
  });

  it("classifyHealth: HEALTHY / DEGRADED / STALE / FAILING / DISABLED", () => {
    expect(classifyHealth({ health_status: "DISABLED" }, T0)).toBe("DISABLED");
    expect(classifyHealth({ consecutive_failures: 3 }, T0)).toBe("FAILING");
    expect(classifyHealth({ last_success_at: new Date(T0.getTime() - 30 * 60_000).toISOString(), tier: "HOT" }, T0)).toBe("HEALTHY");
    expect(classifyHealth({ last_success_at: new Date(T0.getTime() - 35 * 60_000).toISOString(), consecutive_failures: 1, tier: "HOT" }, T0)).toBe("DEGRADED");
    expect(classifyHealth({ last_success_at: new Date(T0.getTime() - 25 * 3_600_000).toISOString(), tier: "HOT" }, T0)).toBe("STALE");
    expect(classifyHealth({}, T0)).toBe("STALE"); // nunca sincronizou
  });

  it("onSyncOutcome: sucesso zera failures e agenda próximo; falha incrementa + backoff", () => {
    const ok = onSyncOutcome({ state: { tier: "WARM", consecutive_failures: 2 }, outcome: "success", now: T0, priceChanged: true });
    expect(ok.consecutive_failures).toBe(0);
    expect(ok.last_price_change_at).toBe(T0.toISOString());
    expect(ok.health_status).toBe("HEALTHY");

    const fail = onSyncOutcome({ state: { tier: "WARM", consecutive_failures: 2 }, outcome: "failed", now: T0 });
    expect(fail.consecutive_failures).toBe(3);
    expect(fail.health_status).toBe("FAILING");
    expect(fail.last_failure_at).toBe(T0.toISOString());

    const fail2 = onSyncOutcome({ state: fail, outcome: "failed", now: new Date(T0.getTime() + 1) });
    expect(fail2.consecutive_failures).toBe(4);
  });

  it("onSyncOutcome: freshness timestamps para price/stock change", () => {
    const st = onSyncOutcome({ state: { tier: "COLD" }, outcome: "success", now: T0, priceChanged: true, stockChanged: true });
    expect(st.last_price_change_at).toBe(T0.toISOString());
    expect(st.last_stock_change_at).toBe(T0.toISOString());
  });
});
