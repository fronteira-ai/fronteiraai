import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import type { ISessionRepository } from "../repositories/ISessionRepository";
import type { AnalyticsEventPayload, StoredAnalyticsEvent } from "../types/analytics.types";
import { AnalyticsEventType } from "../types/enums";
import type { BuyerEventBrainBridgeService } from "./BuyerEventBrainBridgeService";

// Valid event types for server-side validation
const VALID_EVENT_TYPES = new Set<string>(Object.values(AnalyticsEventType));

// Max metadata keys to prevent abuse
const MAX_METADATA_KEYS = 20;

export class EventPlatformService {
  constructor(
    private readonly eventRepo: IAnalyticsEventRepository,
    private readonly sessionRepo: ISessionRepository,
    // Optional so existing tests/callers that don't care about the Brain
    // don't need to construct one. Release 1.8, Program 0 Wave 0.
    private readonly brainBridge?: BuyerEventBrainBridgeService
  ) {}

  // Awaited, not fire-and-forget: in a serverless route handler, a promise
  // left running after the response is sent has no guarantee of completing
  // (the execution context can be frozen). A bridge failure must never fail
  // the buyer_events write it came from, though — Promise.allSettled, not
  // Promise.all, and every rejection is caught individually.
  private async bridgeToBrain(rows: StoredAnalyticsEvent[]): Promise<void> {
    if (!this.brainBridge) return;
    const eligible = rows.filter((r) => r.merchant_id);
    if (eligible.length === 0) return;
    await Promise.allSettled(
      eligible.map((row) =>
        this.brainBridge!.bridge(row).catch((err) =>
          console.error("[EventPlatformService.bridgeToBrain]", row.id, String(err))
        )
      )
    );
  }

  async processEvent(
    payload: AnalyticsEventPayload
  ): Promise<{ success: boolean; event_id?: string; error?: string }> {
    // Validate event type
    if (!VALID_EVENT_TYPES.has(payload.event_type)) {
      return { success: false, error: "invalid_event_type" };
    }

    // Validate anonymous_id
    if (!payload.anonymous_id || payload.anonymous_id.length > 128) {
      return { success: false, error: "invalid_anonymous_id" };
    }

    // Validate page_url
    if (!payload.page_url || payload.page_url.length > 2048) {
      return { success: false, error: "invalid_page_url" };
    }

    // Sanitize metadata
    const metadata = this.sanitizeMetadata(payload.metadata);

    // Auto-handle session on session events
    if (payload.event_type === AnalyticsEventType.SessionStarted) {
      await this.sessionRepo.create({
        anonymous_id: payload.anonymous_id,
        buyer_id: payload.buyer_id,
        entry_page: payload.page_url,
      });
    } else if (payload.event_type === AnalyticsEventType.SessionEnded && payload.session_id) {
      await this.sessionRepo.end(payload.session_id, payload.page_url);
    } else if (payload.session_id) {
      // Touch session for all other events
      await this.sessionRepo.touch(payload.session_id, payload.page_url).catch(() => null);
    }

    // Persist event
    const result = await this.eventRepo.insert({ ...payload, metadata });
    if (!result) {
      return { success: false, error: "storage_error" };
    }

    await this.bridgeToBrain([result]);

    return { success: true, event_id: result.id };
  }

  async processBatch(
    payloads: AnalyticsEventPayload[]
  ): Promise<{ success: boolean; inserted: number; errors: number }> {
    if (payloads.length === 0) return { success: true, inserted: 0, errors: 0 };
    if (payloads.length > 50) {
      return { success: false, inserted: 0, errors: payloads.length };
    }

    const valid = payloads.filter((p) => VALID_EVENT_TYPES.has(p.event_type));
    const invalid = payloads.length - valid.length;

    const sanitized = valid.map((p) => ({ ...p, metadata: this.sanitizeMetadata(p.metadata) }));
    const insertedRows = await this.eventRepo.insertBatch(sanitized);
    await this.bridgeToBrain(insertedRows);

    return { success: true, inserted: insertedRows.length, errors: invalid };
  }

  private sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
    if (!meta) return {};
    const keys = Object.keys(meta).slice(0, MAX_METADATA_KEYS);
    const safe: Record<string, unknown> = {};
    for (const key of keys) {
      const val = meta[key];
      if (typeof val === "string" && val.length > 512) {
        safe[key] = val.slice(0, 512);
      } else if (typeof val === "number" || typeof val === "boolean" || typeof val === "string") {
        safe[key] = val;
      }
      // Drop objects, arrays, nulls — keep only primitives
    }
    return safe;
  }
}
