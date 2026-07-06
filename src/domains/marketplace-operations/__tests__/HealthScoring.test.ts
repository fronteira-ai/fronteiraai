import { scoreMarketplaceHealth, HEALTH_FACTOR_WEIGHTS } from "../scoring/HealthScoring";
import { MarketplaceHealthFactor, MarketplaceHealthStatus } from "../types/enums";

function allFactorsAt(score: number) {
  return Object.values(MarketplaceHealthFactor).map((factor) => ({
    factor,
    score,
    detail: `factor ${factor} at ${score}`,
  }));
}

describe("scoreMarketplaceHealth", () => {
  it("the documented weights sum to exactly 100", () => {
    const total = Object.values(HEALTH_FACTOR_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBe(100);
  });

  it("returns overallScore 100 when every factor scores 100", () => {
    const breakdown = scoreMarketplaceHealth(allFactorsAt(100));
    expect(breakdown.overallScore).toBe(100);
    expect(breakdown.status).toBe(MarketplaceHealthStatus.Healthy);
  });

  it("returns overallScore 0 when every factor scores 0", () => {
    const breakdown = scoreMarketplaceHealth(allFactorsAt(0));
    expect(breakdown.overallScore).toBe(0);
    expect(breakdown.status).toBe(MarketplaceHealthStatus.Critical);
  });

  it("classifies status by the documented thresholds (80/50)", () => {
    // Crafted so each factor's weighted contribution is an exact integer
    // (no per-factor rounding ambiguity) — avoids the trap of "every factor
    // at score 79" rounding UP to an overall 80 (0.79 * every weight happens
    // to round up for every weight in this table).
    const at = (overrides: Partial<Record<MarketplaceHealthFactor, number>>) =>
      Object.values(MarketplaceHealthFactor).map((factor) => ({
        factor,
        score: overrides[factor] ?? 100,
        detail: "",
      }));

    // 20 (ConnectorHealth) + 15 (Freshness) + 15 (Coverage) = 50, rest 0.
    const exactly50 = at({
      [MarketplaceHealthFactor.CanonicalCatalog]: 0,
      [MarketplaceHealthFactor.Discovery]: 0,
      [MarketplaceHealthFactor.Claims]: 0,
      [MarketplaceHealthFactor.AnalyticsBrainVolume]: 0,
      [MarketplaceHealthFactor.ConnectorErrors]: 0,
    });
    expect(scoreMarketplaceHealth(exactly50).overallScore).toBe(50);
    expect(scoreMarketplaceHealth(exactly50).status).toBe(MarketplaceHealthStatus.Attention);

    // Same as above, Coverage (weight 15) nudged down to score 93 ->
    // round(93 * 15/100) = round(13.95) = 14, dropping the total to 49.
    const exactly49 = at({
      [MarketplaceHealthFactor.Coverage]: 93,
      [MarketplaceHealthFactor.CanonicalCatalog]: 0,
      [MarketplaceHealthFactor.Discovery]: 0,
      [MarketplaceHealthFactor.Claims]: 0,
      [MarketplaceHealthFactor.AnalyticsBrainVolume]: 0,
      [MarketplaceHealthFactor.ConnectorErrors]: 0,
    });
    expect(scoreMarketplaceHealth(exactly49).overallScore).toBe(49);
    expect(scoreMarketplaceHealth(exactly49).status).toBe(MarketplaceHealthStatus.Critical);

    // ConnectorHealth(20) + Freshness(15) + Coverage(15) + CanonicalCatalog(10)
    // + Discovery(10) + Claims(10) + AnalyticsBrainVolume(10) = 90, ConnectorErrors 0 -> 90? No:
    // sum of all weights except ConnectorErrors(10) = 90. We want exactly 80:
    // drop ConnectorErrors AND Discovery: 100 - 10 - 10 = 80.
    const exactly80 = at({
      [MarketplaceHealthFactor.Discovery]: 0,
      [MarketplaceHealthFactor.ConnectorErrors]: 0,
    });
    expect(scoreMarketplaceHealth(exactly80).overallScore).toBe(80);
    expect(scoreMarketplaceHealth(exactly80).status).toBe(MarketplaceHealthStatus.Healthy);
  });

  it("weights each factor's contribution proportionally to its declared weight", () => {
    const breakdown = scoreMarketplaceHealth([
      { factor: MarketplaceHealthFactor.ConnectorHealth, score: 100, detail: "" }, // weight 20
      { factor: MarketplaceHealthFactor.Freshness, score: 0, detail: "" }, // weight 15
    ]);
    const connectorFactor = breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.ConnectorHealth);
    expect(connectorFactor?.weightedScore).toBe(20);
    expect(breakdown.overallScore).toBe(20);
  });

  it("clamps out-of-range factor scores to [0, 100]", () => {
    const breakdown = scoreMarketplaceHealth([
      { factor: MarketplaceHealthFactor.Coverage, score: 150, detail: "" },
      { factor: MarketplaceHealthFactor.Claims, score: -30, detail: "" },
    ]);
    expect(breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.Coverage)?.score).toBe(100);
    expect(breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.Claims)?.score).toBe(0);
  });
});
