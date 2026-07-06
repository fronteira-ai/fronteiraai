import { MarketplaceHealthEngine } from "../health/MarketplaceHealthEngine";
import { MarketplaceHealthFactor } from "../types/enums";
import type { ConnectorHealthService } from "@/src/domains/connectors/services/ConnectorHealthService";
import { makeMockClient } from "./supabaseStub";

function makeConnectorHealthService(impl: Partial<ConnectorHealthService>): ConnectorHealthService {
  return {
    getSummaries: jest.fn().mockResolvedValue([]),
    ...impl,
  } as unknown as ConnectorHealthService;
}

describe("MarketplaceHealthEngine.compute", () => {
  it("returns all 8 factors when every sub-computation succeeds", async () => {
    const client = makeMockClient();
    const connectorHealthService = makeConnectorHealthService({});
    const engine = new MarketplaceHealthEngine(client, connectorHealthService);

    const breakdown = await engine.compute();

    expect(breakdown.factors).toHaveLength(Object.values(MarketplaceHealthFactor).length);
    expect(typeof breakdown.overallScore).toBe("number");
  });

  it("isolates a failing connector fetch — the other factors still compute (Promise.allSettled)", async () => {
    const client = makeMockClient();
    const connectorHealthService = makeConnectorHealthService({
      getSummaries: jest.fn().mockRejectedValue(new Error("conexão perdida")),
    });
    const engine = new MarketplaceHealthEngine(client, connectorHealthService);

    const breakdown = await engine.compute();

    const connectorFactor = breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.ConnectorHealth);
    const errorsFactor = breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.ConnectorErrors);
    const freshnessFactor = breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.Freshness);
    const coverageFactor = breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.Coverage);

    expect(connectorFactor?.score).toBe(0);
    expect(connectorFactor?.detail).toContain("Falha ao computar");
    expect(errorsFactor?.detail).toContain("Falha ao computar");
    expect(freshnessFactor?.detail).toContain("Falha ao computar");

    // A factor unrelated to the connector fetch is unaffected by its failure.
    expect(coverageFactor?.detail).not.toContain("Falha ao computar");
  });

  it("treats zero registered connectors as full connector health/errors but zero freshness", async () => {
    const client = makeMockClient();
    const connectorHealthService = makeConnectorHealthService({
      getSummaries: jest.fn().mockResolvedValue([]),
    });
    const engine = new MarketplaceHealthEngine(client, connectorHealthService);

    const breakdown = await engine.compute();

    expect(breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.ConnectorHealth)?.score).toBe(100);
    expect(breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.ConnectorErrors)?.score).toBe(100);
    expect(breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.Freshness)?.score).toBe(0);
  });
});
