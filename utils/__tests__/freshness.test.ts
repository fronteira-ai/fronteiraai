import {
  classifyFreshness,
  dataAgeMs,
  DEFAULT_FRESHNESS_RULES,
  type FreshnessRules,
} from "@/utils/freshness";

const HOUR = 60 * 60 * 1000;

describe("dataAgeMs", () => {
  it("retorna null para timestamp ausente", () => {
    expect(dataAgeMs(null)).toBeNull();
    expect(dataAgeMs(undefined)).toBeNull();
  });

  it("retorna null para data inválida", () => {
    expect(dataAgeMs("not-a-date")).toBeNull();
    expect(dataAgeMs(NaN)).toBeNull();
  });

  it("calcula idade em ms a partir de now", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(dataAgeMs("2026-01-01T10:00:00Z", now)).toBe(2 * HOUR);
  });

  it("aceita Date e número (epoch ms)", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(dataAgeMs(new Date("2026-01-01T10:00:00Z"), now)).toBe(2 * HOUR);
    expect(dataAgeMs(Date.parse("2026-01-01T10:00:00Z"), now)).toBe(2 * HOUR);
  });

  it("trata timestamp futuro como idade 0 (nunca negativo)", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(dataAgeMs("2026-01-01T14:00:00Z", now)).toBe(0);
  });
});

describe("classifyFreshness", () => {
  const now = Date.parse("2026-01-01T12:00:00Z");

  it("classifica UNKNOWN sem timestamp válido", () => {
    expect(classifyFreshness(null, DEFAULT_FRESHNESS_RULES, now)).toBe("UNKNOWN");
    expect(classifyFreshness("garbage", DEFAULT_FRESHNESS_RULES, now)).toBe("UNKNOWN");
  });

  it("classifica FRESH dentro da janela freshMaxAgeMs", () => {
    expect(classifyFreshness(new Date(now - 1 * HOUR).toISOString(), DEFAULT_FRESHNESS_RULES, now)).toBe("FRESH");
    // exatamente no limite de fresh → FRESH (inclusive)
    expect(classifyFreshness(new Date(now - 6 * HOUR).toISOString(), DEFAULT_FRESHNESS_RULES, now)).toBe("FRESH");
  });

  it("classifica AGING entre fresh e stale (inclusive no limite stale)", () => {
    expect(classifyFreshness(new Date(now - 12 * HOUR).toISOString(), DEFAULT_FRESHNESS_RULES, now)).toBe("AGING");
    expect(classifyFreshness(new Date(now - 72 * HOUR).toISOString(), DEFAULT_FRESHNESS_RULES, now)).toBe("AGING");
  });

  it("classifica STALE além de staleAfterMs", () => {
    expect(classifyFreshness(new Date(now - 73 * HOUR).toISOString(), DEFAULT_FRESHNESS_RULES, now)).toBe("STALE");
    expect(classifyFreshness(new Date(now - 30 * 24 * HOUR).toISOString(), DEFAULT_FRESHNESS_RULES, now)).toBe("STALE");
  });

  it("aceita regras customizadas (declarativas)", () => {
    const rules: FreshnessRules = { freshMaxAgeMs: HOUR, staleAfterMs: 24 * HOUR };
    expect(classifyFreshness(new Date(now - 2 * HOUR).toISOString(), rules, now)).toBe("AGING");
    expect(classifyFreshness(new Date(now - 25 * HOUR).toISOString(), rules, now)).toBe("STALE");
  });
});
