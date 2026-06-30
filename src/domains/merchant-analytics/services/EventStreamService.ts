import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import type { ISessionRepository } from "../repositories/ISessionRepository";
import type { EventStream } from "../types/analytics.types";

export class EventStreamService {
  constructor(
    private readonly eventRepo: IAnalyticsEventRepository,
    private readonly sessionRepo: ISessionRepository
  ) {}

  async getStream(sessionId: string): Promise<EventStream | null> {
    const [session, events] = await Promise.all([
      this.sessionRepo.findById(sessionId),
      this.eventRepo.findBySession(sessionId, 200),
    ]);

    if (!session) return null;

    const journeySteps = events.map((e) => e.event_type);

    return {
      session_id: sessionId,
      anonymous_id: session.anonymous_id,
      events: events.map((e) => ({
        event_type: e.event_type,
        occurred_at: e.occurred_at,
        page_url: e.page_url,
        merchant_id: e.merchant_id,
        product_id: e.product_id,
        metadata: e.metadata,
      })),
      journey_steps: journeySteps,
      total_events: events.length,
      duration_seconds: session.duration_seconds,
    };
  }
}
