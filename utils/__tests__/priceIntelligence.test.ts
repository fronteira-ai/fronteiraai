import {
  computePriceIntelligence,
  normalizeSeries,
  classifyPrice,
} from "../priceIntelligence";

const day = (n: number) => new Date(Date.UTC(2026, 5, 1 + n, 12)).toISOString();

function seq(priceAtDay: number[], startDay = 0): { recordedAt: string; priceUSD: number }[] {
  return priceAtDay.map((p, i) => ({ recordedAt: day(startDay + i), priceUSD: p }));
}

describe("computePriceIntelligence — PRICE INTELLIGENCE UI (determinístico)", () => {
  it("histórico vazio → insufficient", () => {
    const r = computePriceIntelligence([]);
    expect(r.status).toBe("insufficient");
    expect(r.currentPriceUSD).toBeNull();
  });

  it("1 observação → insufficient (sem mínimo de observações)", () => {
    const r = computePriceIntelligence(seq([100], 0));
    expect(r.status).toBe("insufficient");
    expect(r.currentPriceUSD).toBe(100);
  });

  it("< MIN_OBSERVATIONS → insufficient", () => {
    const r = computePriceIntelligence(seq([100, 99]));
    expect(r.reason).toBe("insufficient_observations");
  });

  it("observações suficientes mas span curto demais → insufficient (não inventa histórico)", () => {
    // 3 pontos em 2 dias → span(2d) < MIN_SPAN_MS(3d)
    const r = computePriceIntelligence([
      { recordedAt: day(0), priceUSD: 100 },
      { recordedAt: day(1), priceUSD: 99 },
      { recordedAt: day(2), priceUSD: 98 },
    ]);
    expect(r.reason).toBe("insufficient_span");
  });

  it("queda → trend down, best/good e mensagem abaixo da média", () => {
    // preço cai de 200 para 100 ao longo de dias
    const r = computePriceIntelligence(seq([200, 190, 180, 160, 140, 120, 100], 0));
    expect(r.status).toBe("ok");
    expect(r.trend).toBe("down");
    expect(r.currentPriceUSD).toBe(100);
    expect(r.minPriceUSD).toBe(100);
    expect(r.maxPriceUSD).toBe(200);
    expect(r.classification).toBe("best"); // no piso
    expect(r.message).toContain("abaixo");
  });

  it("alta → trend up", () => {
    const r = computePriceIntelligence(seq([100, 120, 150, 170, 200], 0));
    expect(r.trend).toBe("up");
  });

  it("estabilidade → trend flat / normal", () => {
    const r = computePriceIntelligence(seq([100, 100, 101, 100, 100], 0));
    expect(r.trend).toBe("flat");
  });

  it("outlier não distorce a média (mediana) nem a classificação", () => {
    // outlier de 1000 no meio; média real perto de 100
    const r = computePriceIntelligence(seq([100, 100, 1000, 100, 100, 100, 100], 0));
    expect(r.status).toBe("ok");
    expect(r.averagePriceUSD).toBe(100); // mediana
    expect(r.maxPriceUSD).toBe(1000);
  });

  it("preço atual igual à mínima histórica → best", () => {
    const r = computePriceIntelligence(seq([100, 110, 105, 100], 0));
    expect(r.classification).toBe("best");
    expect(r.positionInRange).toBe(0);
  });

  it("preço atual acima da média → não 'best'; pode ser normal/high", () => {
    const r = computePriceIntelligence(seq([80, 90, 85, 95, 92], 0));
    expect(r.currentPriceUSD).toBe(92);
    expect(r.averagePriceUSD).toBe(90);
    expect(r.classification).not.toBe("best");
  });

  it("várias lojas (pontos por tempo) deduplicam pelo menor preço por timestamp", () => {
    const raw = [
      { recordedAt: day(0), priceUSD: 120 },
      { recordedAt: day(0), priceUSD: 100 }, // mesmo dia — fica o menor
      { recordedAt: day(1), priceUSD: 105 },
      { recordedAt: day(3), priceUSD: 95 },
    ];
    const r = computePriceIntelligence(raw);
    expect(r.status).toBe("ok");
    expect(normalizeSeries(raw).length).toBe(3);
    expect(r.minPriceUSD).toBe(95);
  });

  it("input null → treated as ausente (não lança)", () => {
    const r = computePriceIntelligence([{ recordedAt: day(0), priceUSD: NaN } as unknown as { recordedAt: string; priceUSD: number }]);
    expect(r.status).toBe("insufficient");
  });

  it("série fora de ordem → normaliza e calcula corretamente", () => {
    const unordered = [
      { recordedAt: day(3), priceUSD: 120 },
      { recordedAt: day(0), priceUSD: 100 },
      { recordedAt: day(1), priceUSD: 110 },
    ];
    const r = computePriceIntelligence(unordered);
    expect(r.status).toBe("ok");
    expect(r.currentPriceUSD).toBe(120);
    expect(r.minPriceUSD).toBe(100);
  });

  it("delta7d / delta30d quando há janela suficiente", () => {
    // 10 dias de preços subindo
    const days = Array.from({ length: 10 }, (_, i) => 100 + i * 2);
    const r = computePriceIntelligence(seq(days, 0));
    expect(r.status).toBe("ok");
    // current = 118
    expect(r.currentPriceUSD).toBe(118);
  });

  it("classifyPrice é determinística e cobre os níveis", () => {
    expect(classifyPrice(100, 100, 200, 150)).toBe("best"); // no piso
    expect(classifyPrice(152, 100, 200, 150)).toBe("normal");
    expect(classifyPrice(186, 100, 200, 150)).toBe("high");
  });
});
