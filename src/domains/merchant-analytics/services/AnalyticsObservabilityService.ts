import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import type { ISessionRepository } from "../repositories/ISessionRepository";
import type { AnalyticsHealthCheck } from "../types/analytics.types";

export class AnalyticsObservabilityService {
  constructor(
    private readonly eventRepo: IAnalyticsEventRepository,
    private readonly sessionRepo: ISessionRepository
  ) {}

  async healthCheck(): Promise<AnalyticsHealthCheck> {
    const start = Date.now();

    const [event_count, session_count] = await Promise.all([
      this.eventRepo.countRecent(60),
      this.sessionRepo.countRecent(60),
    ]);

    const latency_ms = Date.now() - start;

    const status: AnalyticsHealthCheck["status"] =
      latency_ms > 5000 ? "unhealthy"
      : latency_ms > 2000 ? "degraded"
      : "healthy";

    return {
      status,
      event_count_last_hour: event_count,
      session_count_last_hour: session_count,
      dead_events: 0,
      duplicate_rate: 0,
      latency_ms,
      checked_at: new Date().toISOString(),
    };
  }
}
