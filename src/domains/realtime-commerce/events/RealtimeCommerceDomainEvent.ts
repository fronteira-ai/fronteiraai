// Plain data shapes only — deliberately NOT trust-typed (no import from
// src/domains/trust), same rule and same reason as
// src/domains/exchange/events/ExchangeDomainEvent.ts: emission into
// TrustEventType is application-layer wiring one layer up (a bridge in
// lib/), never inside the domain itself.

import type { ChangeType } from "../enums";

export interface MarketChangeDetectedEvent {
  type: "market_change_detected";
  changeType: ChangeType;
  productId: string | null;
  storeId: string | null;
  occurredAt: string;
}

export interface HighVolatilityDetectedEvent {
  type: "high_volatility_detected";
  productId: string;
  score: number;
  occurredAt: string;
}

export interface LowVolatilityDetectedEvent {
  type: "low_volatility_detected";
  productId: string;
  score: number;
  occurredAt: string;
}

export interface StoreHighlyResponsiveEvent {
  type: "store_highly_responsive";
  storeId: string;
  updateScore: number;
  occurredAt: string;
}

export type RealtimeCommerceDomainEvent =
  | MarketChangeDetectedEvent
  | HighVolatilityDetectedEvent
  | LowVolatilityDetectedEvent
  | StoreHighlyResponsiveEvent;
