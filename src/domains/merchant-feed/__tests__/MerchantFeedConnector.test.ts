import { MerchantFeedConnector } from "../connector/MerchantFeedConnector";
import { MerchantFeedRegistrationService } from "../registration/MerchantFeedRegistrationService";

const GOOD_XML = `<?xml version="1.0"?><rss><channel><item><codigo>1</codigo><preco>199.50 USD</preco><title>Produto A</title><marca>LG</marca></item></channel></rss>`;

describe("MerchantFeedConnector — IConnector reusando pipeline (XML_FEED)", () => {
  it("fetchStream produz RawOffer com storeSlug e identidade estável", async () => {
    const c = new MerchantFeedConnector(
      { feedUrl: "https://x/feed.xml", sourceType: "XML_FEED", trust: "OFFICIAL_MERCHANT_FEED", preferredTier: "HOT", enabled: true },
      "minhaloja",
      { fetchBody: async () => ({ body: GOOD_XML }) },
    );
    const offers = [];
    for await (const o of c.fetchStream()) offers.push(o);
    expect(offers).toHaveLength(1);
    expect(offers[0].storeSlug).toBe("minhaloja");
    expect(offers[0].product.externalId).toBe("1");
    expect(offers[0].priceUSD).toBeCloseTo(199.5, 2);
    expect(offers[0].currency).toBe("USD");
  });

  it("metadata registrável por merchant-feed-<slug> (tipo xml-file)", () => {
    const c = new MerchantFeedConnector(
      { feedUrl: "https://x/feed.xml", sourceType: "XML_FEED", trust: "OFFICIAL_MERCHANT_FEED", preferredTier: "HOT", enabled: true },
      "minhaloja",
      { fetchBody: async () => ({ body: GOOD_XML }) },
    );
    expect(c.metadata.id).toBe("merchant-feed-minhaloja");
    expect(c.metadata.type).toBe("xml-file");
  });
});

describe("MerchantFeedRegistrationService — Adaptive Sync integration (sem cron paralelo)", () => {
  it("persiste config de feed em connectors (upsert idempotente) + syncFrequencyHours (gate legado do cron)", async () => {
    const box: { value: Record<string, unknown> | null } = { value: null };
    const client = {
      from() {
        return {
          upsert: (payload: Record<string, unknown>) => {
            box.value = payload as Record<string, unknown>;
            return {
              select: () => ({ single: () => Promise.resolve({ data: { ...payload, id: "c1", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, error: null }) }),
            };
          },
        };
      },
    };
    const service = new MerchantFeedRegistrationService(client as never);
    const res = await service.register({ storeSlug: "minhaloja", feedUrl: "https://x/feed.xml", preferredTier: "WARM" });
    expect(res.canActivate).toBe(true);
    expect(box.value?.connector_key).toBe("merchant-feed-minhaloja");
    expect(box.value?.type).toBe("xml-file");
    const cfg = box.value?.config as { merchantFeed: { feedUrl: string; trust: string }; syncFrequencyHours: number };
    expect(cfg.merchantFeed.feedUrl).toBe("https://x/feed.xml");
    expect(cfg.merchantFeed.trust).toBe("OFFICIAL_MERCHANT_FEED");
    expect(cfg.syncFrequencyHours).toBe(2); // WARM
  });

  it("classifica health via Adaptive Sync Engine", async () => {
    const client = { from: () => ({ upsert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) }) };
    const service = new MerchantFeedRegistrationService(client as never);
    expect(service.health({ syncState: { tier: "WARM", next_sync_at: new Date().toISOString() } } as never)).toBeTruthy();
  });
});
