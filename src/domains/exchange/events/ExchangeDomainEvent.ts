// Plain data shapes only — deliberately NOT trust-typed (no import from
// src/domains/trust). Epic 1's rule ("exchange never depends on other
// domains") applies here too. Emission into TrustEventType lives one layer
// up, in the application layer (the cron route), which is allowed to depend
// on both domains.

export interface RateRefreshedEvent {
  type: "rate_refreshed";
  providerId: string;
  pairs: string[];
  usingFallback: boolean;
  occurredAt: string;
}

export interface SignificantMoveDetectedEvent {
  type: "significant_move_detected";
  pair: string;
  deltaPercent: number;
  occurredAt: string;
}

export interface ProviderFailoverOccurredEvent {
  type: "provider_failover_occurred";
  failedProviderId: string;
  /** null when every registered provider failed (degraded to last-known-good) */
  succeededProviderId: string | null;
  occurredAt: string;
}

export type ExchangeDomainEvent =
  | RateRefreshedEvent
  | SignificantMoveDetectedEvent
  | ProviderFailoverOccurredEvent;
