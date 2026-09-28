// Mission 03B (PHASE 2) — verdade do fallback de câmbio em `getExchangeSnapshot`.
//
// Antes: `usingFallback` era o literal `false`, então o CambioCard nunca
// conseguia sinalizar câmbio degradado (fabricava frescor). Agora vem do
// serviço canônico (`AutomaticCurrencyService.convert` → `isStale`).
import type { SupabaseClient } from "@supabase/supabase-js";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

const mockGetCurrentRate = jest.fn();
const mockGetRange = jest.fn();
const mockConvert = jest.fn();

jest.mock("@/lib/exchange-factory", () => ({
  createExchangeServices: () => ({
    rateService: { getCurrentRate: mockGetCurrentRate },
    historyService: { getRange: mockGetRange },
    currencyService: { convert: mockConvert },
  }),
}));

// Importados no topo do módulo; mockados para não arrastar
// connectors-factory → crawlers (ESM puro) para dentro do Jest.
jest.mock("@/lib/marketplace-operations-factory", () => ({
  createMarketplaceOperationsServices: () => ({ metricsService: {}, priorityService: {} }),
}));
jest.mock("@/lib/realtime-commerce-factory", () => ({
  createRealtimeCommerceServices: () => ({}),
}));
jest.mock("@/lib/buyer-intelligence-factory", () => ({
  createBuyerIntelligenceServices: () => ({ opportunityEngine: { getTopOpportunities: jest.fn() } }),
}));
jest.mock("@/lib/connector-directory-service", () => ({
  ConnectorDirectoryService: class {
    async listAll() {
      return [];
    }
  },
}));

type HomeService = typeof import("@/lib/home-premium-service");
let getExchangeSnapshot: HomeService["getExchangeSnapshot"];

beforeAll(async () => {
  const mod = await import("@/lib/home-premium-service");
  getExchangeSnapshot = mod.getExchangeSnapshot;
});

const client = {} as SupabaseClient;

const BRL_POINT = { rate: 5.42, capturedAt: "2026-01-01T00:00:00.000Z", pair: "USD/BRL" };
const PYG_POINT = { rate: 7300, capturedAt: "2026-01-01T00:00:00.000Z", pair: "USD/PYG" };

beforeEach(() => {
  mockGetCurrentRate.mockReset();
  mockGetRange.mockReset();
  mockConvert.mockReset();

  mockGetCurrentRate.mockImplementation(async (pair: { toString(): string }) =>
    String(pair).toLowerCase().includes("pyg") ? PYG_POINT : BRL_POINT
  );
  mockGetRange.mockResolvedValue([]);
  mockConvert.mockResolvedValue({ usingFallback: false });
});

describe("Mission 03B — câmbio: usingFallback reflete o estado real", () => {
  it("cotação fresca ⇒ usingFallback false", async () => {
    mockConvert.mockResolvedValue({ usingFallback: false });

    const snapshot = await getExchangeSnapshot(client);

    expect(snapshot.usingFallback).toBe(false);
  });

  it("cotação degradada / last-known-good ⇒ usingFallback true", async () => {
    mockConvert.mockResolvedValue({ usingFallback: true });

    const snapshot = await getExchangeSnapshot(client);

    expect(snapshot.usingFallback).toBe(true);
  });

  it("falha ao verificar frescor com taxa exibida ⇒ usingFallback true (honesto)", async () => {
    mockConvert.mockRejectedValue(new Error("no rate"));

    const snapshot = await getExchangeSnapshot(client);

    expect(snapshot.usdBrl).not.toBeNull();
    expect(snapshot.usingFallback).toBe(true);
  });

  it("sem taxa USD/BRL ⇒ preserva o estado vazio e não chama o conversor", async () => {
    mockGetCurrentRate.mockResolvedValue(null);

    const snapshot = await getExchangeSnapshot(client);

    expect(snapshot.usdBrl).toBeNull();
    expect(snapshot.usdPyg).toBeNull();
    expect(snapshot.usingFallback).toBe(false);
    expect(mockConvert).not.toHaveBeenCalled();
  });

  it("os dados de câmbio existentes permanecem intactos", async () => {
    const historyBrl = [
      { rate: 5.3, capturedAt: "2026-01-01T00:00:00.000Z" },
      { rate: 5.42, capturedAt: "2026-01-02T00:00:00.000Z" },
    ];
    const historyPyg = [{ rate: 7300, capturedAt: "2026-01-02T00:00:00.000Z" }];
    mockGetRange.mockImplementation(async (pair: { toString(): string }) =>
      String(pair).toLowerCase().includes("pyg") ? historyPyg : historyBrl
    );

    const snapshot = await getExchangeSnapshot(client);

    expect(snapshot.usdBrl).toEqual({ rate: 5.42, capturedAt: BRL_POINT.capturedAt });
    expect(snapshot.usdPyg).toEqual({ rate: 7300, capturedAt: PYG_POINT.capturedAt });
    expect(snapshot.history).toEqual([
      { rate: 5.3, capturedAt: "2026-01-01T00:00:00.000Z" },
      { rate: 5.42, capturedAt: "2026-01-02T00:00:00.000Z" },
    ]);
    expect(snapshot.usdPygHistory).toEqual([{ rate: 7300, capturedAt: "2026-01-02T00:00:00.000Z" }]);
    // A verificação de frescor usa a MESMA taxa exibida (USD -> BRL).
    expect(mockConvert).toHaveBeenCalledTimes(1);
    expect(mockConvert.mock.calls[0][0]).toMatchObject({ amountOriginal: 1 });
  });
});
