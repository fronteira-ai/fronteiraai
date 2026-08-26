import { FreshnessService } from "../freshness/FreshnessService";
import { ChangeType, MarketChangeEntityType } from "../enums";
import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { MarketChange } from "../types";

/**
 * Sprint 13 — o objetivo destes testes é uma coisa só: provar que
 * `computeForOffers` (uma leitura em lote) devolve exatamente o que a
 * sequência de `computeForOffer` devolvia (uma leitura por oferta).
 *
 * O repositório falso abaixo responde às DUAS assinaturas a partir da mesma
 * lista de mudanças, com o mesmo critério do PostgREST real (`detected_at`
 * decrescente, o primeiro vence). Assim uma divergência de regra aparece,
 * em vez de ser mascarada por dois mocks combinados entre si.
 */
function makeChange(overrides: Partial<MarketChange> & Pick<MarketChange, "entityId" | "detectedAt">): MarketChange {
  return {
    id: `${overrides.entityId}-${overrides.detectedAt}`,
    changeType: ChangeType.PriceDecreased,
    entityType: MarketChangeEntityType.Offer,
    productId: null,
    storeId: null,
    field: "price_usd",
    previousValue: "100",
    currentValue: "90",
    confidence: 1,
    source: "test",
    ...overrides,
  };
}

function makeRepo(changes: MarketChange[]): IMarketChangeRepository & { calls: { individual: number; batch: number } } {
  const calls = { individual: 0, batch: 0 };

  const latestFor = (entityType: string, entityId: string) =>
    changes
      .filter((c) => c.entityType === entityType && c.entityId === entityId)
      // Sprint 13B: mesmo desempate do repositório real — maior detectedAt e,
      // em empate, maior id.
      .sort((a, b) => (a.detectedAt === b.detectedAt ? (a.id < b.id ? 1 : -1) : a.detectedAt < b.detectedAt ? 1 : -1))[0] ?? null;

  return {
    calls,
    insertMany: jest.fn(),
    countInRange: jest.fn(),
    listInRange: jest.fn(),
    listForProduct: jest.fn(),
    listForStore: jest.fn(),
    async latestForEntity(entityType: string, entityId: string) {
      calls.individual += 1;
      return latestFor(entityType, entityId);
    },
    async latestForEntities(entityType: string, entityIds: string[]) {
      calls.batch += 1;
      const map = new Map<string, MarketChange>();
      for (const id of entityIds) {
        const latest = latestFor(entityType, id);
        if (latest) map.set(id, latest);
      }
      return map;
    },
  };
}

describe("FreshnessService.computeForOffers", () => {
  // O score depende de `now`: congelar o relógio faz a comparação individual
  // vs. lote medir a regra, não o intervalo entre as duas execuções.
  beforeAll(() => jest.useFakeTimers().setSystemTime(new Date("2026-07-03T12:00:00Z")));
  afterAll(() => jest.useRealTimers());

  const fallback = new Date("2026-07-03T09:00:00Z");

  const changes = [
    // duas mudanças para a mesma oferta: só a mais recente pode vencer
    makeChange({ entityId: "offer-a", detectedAt: "2026-07-03T11:00:00Z" }),
    makeChange({ entityId: "offer-a", detectedAt: "2026-07-01T11:00:00Z" }),
    makeChange({ entityId: "offer-b", detectedAt: "2026-07-02T08:00:00Z" }),
    // mudança de outra entidade com o MESMO id de oferta: não pode vazar
    makeChange({ entityId: "offer-c", detectedAt: "2026-07-03T11:59:00Z", entityType: MarketChangeEntityType.Product }),
  ];

  const offerIds = ["offer-a", "offer-b", "offer-c", "offer-sem-mudanca"];

  it("produz, campo a campo, o mesmo resultado de chamar computeForOffer N vezes", async () => {
    const repo = makeRepo(changes);
    const service = new FreshnessService(repo);

    const individual = new Map(
      await Promise.all(offerIds.map(async (id) => [id, await service.computeForOffer(id, fallback)] as const))
    );
    const batched = await service.computeForOffers(offerIds.map((offerId) => ({ offerId, fallbackUpdatedAt: fallback })));

    expect([...batched.keys()].sort()).toEqual([...individual.keys()].sort());
    for (const id of offerIds) {
      expect(batched.get(id)).toEqual(individual.get(id));
    }
  });

  it("faz uma leitura em lote no lugar de uma leitura por oferta", async () => {
    const repo = makeRepo(changes);
    const service = new FreshnessService(repo);

    await service.computeForOffers(offerIds.map((offerId) => ({ offerId, fallbackUpdatedAt: fallback })));

    expect(repo.calls.batch).toBe(1);
    expect(repo.calls.individual).toBe(0);
  });

  it("mantém o fallback para ofertas sem mudança registrada e Stale quando não há fallback", async () => {
    const service = new FreshnessService(makeRepo(changes));

    const withFallback = await service.computeForOffers([{ offerId: "offer-sem-mudanca", fallbackUpdatedAt: fallback }]);
    expect(withFallback.get("offer-sem-mudanca")?.lastChangeAt).toBe(fallback.toISOString());

    const withoutFallback = await service.computeForOffers([{ offerId: "offer-sem-mudanca" }]);
    expect(withoutFallback.get("offer-sem-mudanca")).toEqual(await service.computeForOffer("offer-sem-mudanca"));
  });

  it("devolve um resultado por oferta pedida, e um Map vazio para lista vazia", async () => {
    const repo = makeRepo(changes);
    const service = new FreshnessService(repo);

    const empty = await service.computeForOffers([]);
    expect(empty.size).toBe(0);

    const scores = await service.computeForOffers(offerIds.map((offerId) => ({ offerId })));
    expect(scores.size).toBe(offerIds.length);
  });
});
