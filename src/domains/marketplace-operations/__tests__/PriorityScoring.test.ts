import { scoreMerchantPriority, PRIORITY_FACTOR_WEIGHTS } from "../scoring/PriorityScoring";
import { MerchantPriorityTier, MerchantBusinessClass } from "../types/enums";

const fullInputs = {
  businessValue: 1,
  popularity: 1,
  freshness: 1,
  coverage: 1,
  catalogSize: 1,
  syncFrequency: 1,
  priceVolatility: 1,
};

const zeroInputs = {
  businessValue: 0,
  popularity: 0,
  freshness: 0,
  coverage: 0,
  catalogSize: 0,
  syncFrequency: 0,
  priceVolatility: 0,
};

describe("scoreMerchantPriority", () => {
  it("the documented weights sum to exactly 100", () => {
    const total = Object.values(PRIORITY_FACTOR_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBe(100);
  });

  it("scores 100 and tier Diamond when every factor is maxed out", () => {
    const result = scoreMerchantPriority("s1", "Loja A", "loja-a", fullInputs);
    expect(result.score).toBe(100);
    expect(result.tier).toBe(MerchantPriorityTier.Diamond);
    expect(result.businessClass).toBe(MerchantBusinessClass.StrategicPartner);
  });

  it("scores 0 and tier Bronze when every factor is zero", () => {
    const result = scoreMerchantPriority("s1", "Loja A", "loja-a", zeroInputs);
    expect(result.score).toBe(0);
    expect(result.tier).toBe(MerchantPriorityTier.Bronze);
    expect(result.businessClass).toBe(MerchantBusinessClass.DormantAccount);
  });

  it("clamps inputs outside [0, 1]", () => {
    const result = scoreMerchantPriority("s1", "Loja A", "loja-a", { ...zeroInputs, businessValue: 5 });
    expect(result.breakdown.businessValue).toBe(PRIORITY_FACTOR_WEIGHTS.businessValue);
  });

  it("does not weight premium or SEO — no such factors exist in the breakdown", () => {
    const result = scoreMerchantPriority("s1", "Loja A", "loja-a", fullInputs);
    expect(Object.keys(result.breakdown)).not.toContain("premium");
    expect(Object.keys(result.breakdown)).not.toContain("seo");
  });

  it("produces a non-empty, capitalized explanation", () => {
    const result = scoreMerchantPriority("s1", "Loja A", "loja-a", fullInputs);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.explanation[0]).toBe(result.explanation[0].toUpperCase());
  });

  it("falls back to a neutral explanation when nothing stands out", () => {
    // freshness must stay high enough to avoid the "stale sync" warning —
    // that flag is a standing warning (fires whenever freshness is low), not
    // just a positive highlight, so all-zero inputs always mention it.
    const result = scoreMerchantPriority("s1", "Loja A", "loja-a", {
      ...zeroInputs,
      businessValue: 0.5,
      popularity: 0.5,
      freshness: 1,
      coverage: 0.5,
      catalogSize: 0.5,
      priceVolatility: 0.5,
    });
    expect(result.explanation).toBe("Sem destaques — conta padrão");
  });

  it("warns about stale sync even when the overall score is otherwise unremarkable", () => {
    const result = scoreMerchantPriority("s1", "Loja A", "loja-a", zeroInputs);
    expect(result.explanation.toLowerCase()).toContain("sincronização desatualizada");
  });

  it("assigns tier boundaries at the documented thresholds", () => {
    // score exactly 60 -> Gold (businessValue 25 + popularity 20 + coverage 15 = 60)
    const gold = scoreMerchantPriority("s1", "L", "l", {
      ...zeroInputs,
      businessValue: 1,
      popularity: 1,
      coverage: 1,
    });
    expect(gold.score).toBe(60);
    expect(gold.tier).toBe(MerchantPriorityTier.Gold);
  });
});
