import { BuyerEventBrainBridgeService } from "../services/BuyerEventBrainBridgeService";
import { AnalyticsEventType } from "../types/enums";
import type { StoredAnalyticsEvent } from "../types/analytics.types";
import { TrustEventType, TrustSource, BrainEntityType, CognitiveBrainActorRole } from "@/src/domains/trust/types/enums";
import type { CognitiveBrainService } from "@/src/domains/trust/brain/CognitiveBrainService";

function makeEvent(overrides: Partial<StoredAnalyticsEvent> = {}): StoredAnalyticsEvent {
  return {
    id: "evt-1",
    event_type: AnalyticsEventType.MerchantViewed,
    session_id: "sess-1",
    buyer_id: null,
    anonymous_id: "anon-11111111-1111-1111-1111-111111111111",
    merchant_id: "merchant-1",
    store_id: "store-1",
    product_id: null,
    search_query: null,
    page_url: "https://paraguai.com/lojas/loja-teste",
    referrer: null,
    metadata: {},
    occurred_at: new Date("2026-07-02T12:00:00.000Z").toISOString(),
    created_at: new Date("2026-07-02T12:00:00.000Z").toISOString(),
    ...overrides,
  };
}

function makeClient(overrides: { update?: jest.Mock } = {}) {
  const eq = jest.fn().mockResolvedValue({ error: null });
  const update = overrides.update ?? jest.fn().mockReturnValue({ eq });
  const from = jest.fn().mockReturnValue({ update });
  return { from, update, eq } as unknown as import("@supabase/supabase-js").SupabaseClient & {
    from: jest.Mock;
    update: jest.Mock;
    eq: jest.Mock;
  };
}

function makeBrain(result: Partial<Awaited<ReturnType<CognitiveBrainService["ingest"]>>> = {}): jest.Mocked<CognitiveBrainService> {
  return {
    ingest: jest.fn().mockResolvedValue({
      success: true,
      correlation_id: "corr-1",
      event_type: TrustEventType.MerchantViewed,
      assets_impacted: [],
      validation_warnings: [],
      persisted: true,
      ...result,
    }),
    deriveGraphRelations: jest.fn(),
  } as unknown as jest.Mocked<CognitiveBrainService>;
}

describe("BuyerEventBrainBridgeService", () => {
  it("skips events with no merchant_id — buyer_events with no merchant context never reach the Brain", async () => {
    const client = makeClient();
    const brain = makeBrain();
    const service = new BuyerEventBrainBridgeService(client, brain);

    const result = await service.bridge(makeEvent({ merchant_id: null }));

    expect(result).toEqual({ eventId: "evt-1", bridged: false, reason: "no_merchant_context" });
    expect(brain.ingest).not.toHaveBeenCalled();
  });

  it("skips event types with no mapping — e.g. a merchant-attributed SearchPerformed", async () => {
    const client = makeClient();
    const brain = makeBrain();
    const service = new BuyerEventBrainBridgeService(client, brain);

    const result = await service.bridge(makeEvent({ event_type: AnalyticsEventType.SearchPerformed }));

    expect(result).toEqual({ eventId: "evt-1", bridged: false, reason: "no_mapping" });
    expect(brain.ingest).not.toHaveBeenCalled();
  });

  it("maps MerchantViewed to TrustEventType.MerchantViewed and calls the Brain with the buyer pseudonym, never created_by/PII", async () => {
    const client = makeClient();
    const brain = makeBrain();
    const service = new BuyerEventBrainBridgeService(client, brain);

    await service.bridge(makeEvent());

    expect(brain.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TrustEventType.MerchantViewed,
        merchantId: "merchant-1",
        source: TrustSource.Buyer,
        metadata: expect.objectContaining({
          buyer_pseudonym: "anon-11111111-1111-1111-1111-111111111111",
          buyer_events_id: "evt-1",
          store_id: "store-1",
        }),
      }),
      expect.objectContaining({
        entity_type: BrainEntityType.Merchant,
        entity_id: "merchant-1",
        actor_id: "anon-11111111-1111-1111-1111-111111111111",
        actor_role: CognitiveBrainActorRole.Buyer,
      })
    );
  });

  it("prefers buyer_id over anonymous_id as the pseudonym when both are present", async () => {
    const client = makeClient();
    const brain = makeBrain();
    const service = new BuyerEventBrainBridgeService(client, brain);

    await service.bridge(makeEvent({ buyer_id: "buyer-99" }));

    expect(brain.ingest).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ buyer_pseudonym: "buyer-99" }) }),
      expect.objectContaining({ actor_id: "buyer-99" })
    );
  });

  it("consolidates the 3 channel-specific contact clicks into TrustEventType.MerchantContactClicked with a contact_channel", async () => {
    const client = makeClient();
    const brain = makeBrain();
    const service = new BuyerEventBrainBridgeService(client, brain);

    await service.bridge(makeEvent({ event_type: AnalyticsEventType.MerchantWhatsAppClicked }));

    expect(brain.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: TrustEventType.MerchantContactClicked,
        metadata: expect.objectContaining({ contact_channel: "whatsapp" }),
      }),
      expect.anything()
    );
  });

  it("marks the source row synced after a successful bridge — the entire idempotency mechanism", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ update });
    const client = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const brain = makeBrain();
    const service = new BuyerEventBrainBridgeService(client, brain);

    const result = await service.bridge(makeEvent());

    expect(result.bridged).toBe(true);
    expect(from).toHaveBeenCalledWith("buyer_events");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ brain_synced_at: expect.any(String) }));
    expect(eq).toHaveBeenCalledWith("id", "evt-1");
  });

  it("marks brain_sync_error, not brain_synced_at, when the Brain rejects the event", async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    const from = jest.fn().mockReturnValue({ update });
    const client = { from } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const brain = makeBrain({ success: false, persisted: false, validation_warnings: ["missing merchant_id"] });
    const service = new BuyerEventBrainBridgeService(client, brain);

    const result = await service.bridge(makeEvent());

    expect(result).toEqual({ eventId: "evt-1", bridged: false, reason: "validation_failed" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ brain_sync_error: expect.any(String) }));
    expect(update).not.toHaveBeenCalledWith(expect.objectContaining({ brain_synced_at: expect.anything() }));
  });
});
