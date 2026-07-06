import { MerchantPriorityService } from "../services/MerchantPriorityService";
import { makeMockClient } from "./supabaseStub";

describe("MerchantPriorityService.listAll", () => {
  it("returns an empty list when there are no stores", async () => {
    const client = makeMockClient({ stores: { data: [] } });
    const service = new MerchantPriorityService(client);

    const result = await service.listAll();

    expect(result).toEqual([]);
  });

  it("scores a verified+claimed store higher than an unverified, unclaimed one, sorted descending", async () => {
    const client = makeMockClient({
      stores: {
        data: [
          { id: "s1", name: "Loja Verificada", slug: "loja-verificada", is_verified: true },
          { id: "s2", name: "Loja Comum", slug: "loja-comum", is_verified: false },
        ],
      },
      store_claims: { data: [{ store_id: "s1" }] },
      connectors: { data: [] },
      connector_sync_runs: { data: [] },
      offers: { data: [] },
      price_history: { data: [] },
      buyer_events: { data: [] },
      buyer_sessions: { data: [] },
    });

    const service = new MerchantPriorityService(client);
    const result = await service.listAll();

    expect(result).toHaveLength(2);
    expect(result[0].storeId).toBe("s1");
    expect(result[0].score).toBeGreaterThan(result[1].score);
    // Descending order is preserved for the whole list.
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });

  it("gives every store a score of 0 when there is no signal at all (honest zero, not fabricated)", async () => {
    const client = makeMockClient({
      stores: { data: [{ id: "s1", name: "Loja", slug: "loja", is_verified: false }] },
      store_claims: { data: [] },
      connectors: { data: [] },
      connector_sync_runs: { data: [] },
      offers: { data: [] },
      price_history: { data: [] },
      buyer_events: { data: [] },
      buyer_sessions: { data: [] },
    });

    const service = new MerchantPriorityService(client);
    const [result] = await service.listAll();

    expect(result.score).toBe(0);
  });
});
