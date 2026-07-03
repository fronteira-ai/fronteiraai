import { EventPlatformService } from "../services/EventPlatformService";
import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import type { ISessionRepository } from "../repositories/ISessionRepository";
import { AnalyticsEventType } from "../types/enums";

function makeEventRepo(): jest.Mocked<IAnalyticsEventRepository> {
  return {
    insert: jest.fn().mockResolvedValue({ id: "evt-1" }),
    insertBatch: jest.fn().mockResolvedValue([{ id: "evt-1" }, { id: "evt-2" }]),
    countByType: jest.fn().mockResolvedValue(0),
    findBySession: jest.fn().mockResolvedValue([]),
    findByMerchant: jest.fn().mockResolvedValue([]),
    findByProduct: jest.fn().mockResolvedValue([]),
    countRecent: jest.fn().mockResolvedValue(0),
  };
}

function makeSessionRepo(): jest.Mocked<ISessionRepository> {
  return {
    create: jest.fn().mockResolvedValue({ id: "sess-1", anonymous_id: "anon-1", event_count: 0, started_at: new Date().toISOString(), last_event_at: new Date().toISOString() }),
    findById: jest.fn().mockResolvedValue(null),
    touch: jest.fn().mockResolvedValue(undefined),
    end: jest.fn().mockResolvedValue(undefined),
    countRecent: jest.fn().mockResolvedValue(0),
  };
}

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    event_type: AnalyticsEventType.ProductClicked,
    anonymous_id: "anon-test-123",
    page_url: "https://paraguai.com/produto/xyz",
    ...overrides,
  };
}

describe("EventPlatformService", () => {
  let service: EventPlatformService;
  let eventRepo: jest.Mocked<IAnalyticsEventRepository>;
  let sessionRepo: jest.Mocked<ISessionRepository>;

  beforeEach(() => {
    eventRepo = makeEventRepo();
    sessionRepo = makeSessionRepo();
    service = new EventPlatformService(eventRepo, sessionRepo);
  });

  describe("processEvent", () => {
    it("inserts valid event and returns success", async () => {
      const result = await service.processEvent(makePayload());
      expect(result.success).toBe(true);
      expect(result.event_id).toBe("evt-1");
      expect(eventRepo.insert).toHaveBeenCalledTimes(1);
    });

    it("rejects invalid event_type", async () => {
      const result = await service.processEvent(makePayload({ event_type: "NotAnEvent" }));
      expect(result.success).toBe(false);
      expect(result.error).toBe("invalid_event_type");
      expect(eventRepo.insert).not.toHaveBeenCalled();
    });

    it("rejects empty anonymous_id", async () => {
      const result = await service.processEvent(makePayload({ anonymous_id: "" }));
      expect(result.success).toBe(false);
      expect(result.error).toBe("invalid_anonymous_id");
    });

    it("rejects too-long anonymous_id", async () => {
      const result = await service.processEvent(makePayload({ anonymous_id: "a".repeat(129) }));
      expect(result.success).toBe(false);
      expect(result.error).toBe("invalid_anonymous_id");
    });

    it("rejects empty page_url", async () => {
      const result = await service.processEvent(makePayload({ page_url: "" }));
      expect(result.success).toBe(false);
      expect(result.error).toBe("invalid_page_url");
    });

    it("returns storage_error when repo fails", async () => {
      eventRepo.insert.mockResolvedValue(null);
      const result = await service.processEvent(makePayload());
      expect(result.success).toBe(false);
      expect(result.error).toBe("storage_error");
    });

    it("creates session on SessionStarted event", async () => {
      await service.processEvent(makePayload({ event_type: AnalyticsEventType.SessionStarted }));
      expect(sessionRepo.create).toHaveBeenCalledTimes(1);
    });

    it("ends session on SessionEnded event with session_id", async () => {
      await service.processEvent(makePayload({
        event_type: AnalyticsEventType.SessionEnded,
        session_id: "sess-abc",
      }));
      expect(sessionRepo.end).toHaveBeenCalledWith("sess-abc", "https://paraguai.com/produto/xyz");
    });

    it("touches session for events with session_id", async () => {
      await service.processEvent(makePayload({ session_id: "sess-abc" }));
      expect(sessionRepo.touch).toHaveBeenCalledWith("sess-abc", "https://paraguai.com/produto/xyz");
    });

    it("strips non-primitive metadata values", async () => {
      await service.processEvent(makePayload({
        metadata: { valid: "yes", obj: { nested: 1 }, arr: [1, 2], num: 42, bool: true },
      }));
      const call = eventRepo.insert.mock.calls[0][0];
      expect(call.metadata).toEqual({ valid: "yes", num: 42, bool: true });
      expect(call.metadata).not.toHaveProperty("obj");
      expect(call.metadata).not.toHaveProperty("arr");
    });
  });

  describe("processBatch", () => {
    it("inserts valid batch", async () => {
      const result = await service.processBatch([
        makePayload(),
        makePayload({ event_type: AnalyticsEventType.MerchantViewed }),
      ]);
      expect(result.success).toBe(true);
      expect(result.inserted).toBe(2);
      expect(result.errors).toBe(0);
    });

    it("filters invalid event types in batch", async () => {
      const result = await service.processBatch([
        makePayload(),
        makePayload({ event_type: "BadEvent" }),
      ]);
      expect(result.errors).toBe(1);
      expect(eventRepo.insertBatch).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ event_type: AnalyticsEventType.ProductClicked })])
      );
    });

    it("returns success immediately for empty batch", async () => {
      const result = await service.processBatch([]);
      expect(result).toEqual({ success: true, inserted: 0, errors: 0 });
      expect(eventRepo.insertBatch).not.toHaveBeenCalled();
    });

    it("rejects batches larger than 50", async () => {
      const events = Array.from({ length: 51 }, () => makePayload());
      const result = await service.processBatch(events);
      expect(result.success).toBe(false);
      expect(result.errors).toBe(51);
    });
  });
});
